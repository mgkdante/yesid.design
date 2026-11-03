import { onMount, tick } from 'svelte';
import { getLenis } from '@yesid/motion/utils/lenis';
import { resetFocusAfterNavigation, type NavigationEvent, type SiteNavigation } from './navigation.js';

/** The rendered menu's mechanics. Locale values, URLs and copy stay in the app. */
export interface NavigationMenu {
	readonly open: boolean;
	/** Includes the closing animation and its focus trap. */
	readonly active: boolean;
	close(): void;
	languageLink(): HTMLAnchorElement | null | undefined;
}

export interface NavigationLifecycleOptions {
	/** A standalone LanguageToggle's bound ref, when there is no header. Read live on navigation. */
	languageLink?: () => HTMLAnchorElement | null | undefined;
}

/** One app-layout instance, shared with its SiteHeader. Does not own scroll restoration. */
export interface NavigationLifecycle {
	/** Advances on real navigation; guards asynchronous trigger-focus restoration. */
	readonly version: number;
	/** A navigation is waiting for the menu to finish closing. */
	readonly pending: boolean;
	/** Attaches one rendered header and returns its unmount cleanup. Registers no router hooks. */
	attachMenu(menu: NavigationMenu): () => void;
	/** The header has released its focus trap after its close animation. */
	menuClosed(): void;
}

/**
 * Call once during the persistent app layout's initialization, even on routes without a header.
 * Pass router hooks and an optional accepted-start subscription; their lifetime follows that layout, not the header.
 */
export function createNavigationLifecycle(
	router: SiteNavigation,
	options: NavigationLifecycleOptions = {},
): NavigationLifecycle {
	let menu: NavigationMenu | undefined;
	let version = 0;
	const hasSubscription = !!router.subscribeNavigation;
	const completedEvents = new WeakSet<Event>();
	type LinkIntent = {
		event: Event;
		accepted: boolean;
		localeSwitch: boolean;
		resetFocus: boolean;
	};
	let observedLink: LinkIntent | undefined;
	let transition: {
		version: number;
		href: string | undefined;
		type: string;
		event: Event | undefined;
		stage: 'loading' | 'committing';
		menu: NavigationMenu | undefined;
		localeSwitch: boolean;
		keepMenu: boolean;
		resetFocus: boolean;
	} | undefined;
	const waiting = new Set<() => void>();
	const shallow = (event: NavigationEvent) => event.shallow && event.type === 'goto';
	function claim(event: NavigationEvent, accepted = false) {
		if (event.type !== 'link') {
			observedLink = undefined;
			return;
		}
		// Only a router-supplied native trigger claims intent. An eventless redirect
		// retains the last accepted start; DOM cancellation is never router evidence.
		if (!event.event || completedEvents.has(event.event)) return;
		if (observedLink?.event === event.event) {
			observedLink.accepted ||= accepted;
			return;
		}
		const language = menu?.languageLink() ?? options.languageLink?.();
		const target = event.event.target;
		const localeSwitch = !!language && (target instanceof Node
			? language.contains(target) : event.to?.url.href === language.href);
		observedLink = {
			event: event.event,
			accepted,
			localeSwitch,
			resetFocus: localeSwitch && language?.getAttribute('data-sveltekit-reset') === 'false',
		};
	}
	onMount(() => {
		const unsubscribe = router.subscribeNavigation?.((event) => {
			if (!event) {
				if (observedLink) {
					completedEvents.add(observedLink.event);
					observedLink = undefined;
					version++;
				}
				return;
			}
			if (event.type === 'enter' || shallow(event)) return;
			if (event.event && completedEvents.has(event.event)) return;
			const previous = observedLink?.event;
			// An eventless hop can continue only an accepted load. Hook-only claims,
			// or starts after the commit boundary, cannot establish a redirect chain.
			if (!event.event && (!observedLink?.accepted || transition?.stage === 'committing')) observedLink = undefined;
			claim(event, true);
			// Superseding starts invalidate focus work even when beforeNavigate is skipped.
			if (event.type !== 'link' || observedLink?.event !== previous) version++;
			interruptScroll();
		});
		return () => { unsubscribe?.(); observedLink = undefined; };
	});
	function interruptScroll() {
		const lenis = getLenis();
		if (!lenis?.isScrolling || lenis.isStopped) return;
		// Cancel the animation through Lenis's public API, then immediately restore input.
		// No afterNavigate is needed for cancellation/unload; an existing stop stays owned by its caller.
		lenis.stop();
		lenis.start();
	}
	function reconcile(event: NavigationEvent, stage: 'loading' | 'committing') {
		if (!event.event && (stage === 'loading' || !hasSubscription || !observedLink?.accepted)) {
			if (stage === 'committing' && observedLink) completedEvents.add(observedLink.event);
			observedLink = undefined;
		}
		claim(event);
		const observed = event.type === 'link' ? observedLink : undefined;
		const localeSwitch = observed?.localeSwitch ?? false;
		return transition = {
			version: ++version,
			href: event.to?.url.href,
			type: event.type,
			event: observed?.event ?? event.event,
			stage,
			menu,
			localeSwitch,
			keepMenu: localeSwitch && !!menu?.open,
			resetFocus: observed?.resetFocus ?? false,
		};
	}
	function menuClosed() {
		for (const resolve of waiting) resolve();
		waiting.clear();
	}

	router.beforeNavigate((event) => {
		if (shallow(event)) return;
		interruptScroll();
		if (!reconcile(event, 'loading').keepMenu) menu?.close();
	});

	router.onNavigate((event) => {
		if (shallow(event)) return;
		interruptScroll();
		const current = reconcile(event, 'committing');
		// Decide menu continuity before creating any reset callback. No component hook-order rule.
		if (current.keepMenu) return;
		// Loading can outlast the first close, allowing the reader to reopen the menu.
		// Re-close it before waiting, or the focus trap can block this navigation forever.
		menu?.close();
		// Unknown fallback commits use ordinary page focus even if the triggering link disabled Kit's reset.
		const reset = current.resetFocus || (!hasSubscription && !event.event) ? resetFocusAfterNavigation() : undefined;
		const after = reset ? () => { if (version === current.version) reset(); } : undefined;
		if (menu?.active) return new Promise<void>((resolve) => waiting.add(resolve)).then(() => after);
		return after;
	});

	router.afterNavigate(async (event) => {
		if (shallow(event)) return;
		const current = transition;
		if (!current || current.version !== version || current.stage !== 'committing' || current.href !== event.to?.url.href) return;
		transition = undefined;
		if (current.event) completedEvents.add(current.event);
		if (!hasSubscription && (!event.event || event.event !== current.event)) {
			observedLink = undefined;
			menu?.close();
			return;
		}
		if (observedLink?.event === current.event) observedLink = undefined;
		if (!current.keepMenu) return;
		await tick();
		if (version !== current.version || menu !== current.menu || !menu?.open) return;
		menu.languageLink()?.focus({ preventScroll: true });
	});

	return {
		get version() { return version; },
		get pending() { return waiting.size > 0; },
		attachMenu(next) {
			if (menu) throw new Error('A navigation lifecycle can attach only one SiteHeader at a time');
			menu = next;
			return () => {
				if (menu !== next) return;
				menu = undefined;
				menuClosed();
			};
		},
		menuClosed,
	};
}
