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
 * Pass router hooks and an accepted-start subscription; their lifetime follows that layout, not the header.
 */
export function createNavigationLifecycle(
	router: SiteNavigation,
	options: NavigationLifecycleOptions = {},
): NavigationLifecycle {
	let menu: NavigationMenu | undefined;
	let version = 0;
	type LinkIntent = {
		event: Event;
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
	function claim(event: NavigationEvent) {
		if (event.type !== 'link') {
			observedLink = undefined;
			return;
		}
		// Only a router-supplied native trigger claims intent. An eventless redirect
		// retains the last accepted start; DOM cancellation is never router evidence.
		if (!event.event || observedLink?.event === event.event) return;
		const language = menu?.languageLink() ?? options.languageLink?.();
		const target = event.event.target;
		const localeSwitch = !!language && (target instanceof Node
			? language.contains(target) : event.to?.url.href === language.href);
		observedLink = {
			event: event.event,
			localeSwitch,
			resetFocus: localeSwitch && language?.getAttribute('data-sveltekit-reset') === 'false',
		};
	}
	onMount(() => {
		const unsubscribe = router.subscribeNavigation((event) => {
			if (!event || event.type === 'enter' || shallow(event)) return;
			const previous = observedLink?.event;
			claim(event);
			// Superseding starts invalidate focus work even when beforeNavigate is skipped.
			if (event.type !== 'link' || observedLink?.event !== previous) version++;
			interruptScroll();
		});
		return () => { unsubscribe(); observedLink = undefined; };
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
		if (stage === 'loading' && !event.event) observedLink = undefined;
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
		const reset = current.resetFocus ? resetFocusAfterNavigation() : undefined;
		const after = reset ? () => { if (version === current.version) reset(); } : undefined;
		if (menu?.active) return new Promise<void>((resolve) => waiting.add(resolve)).then(() => after);
		return after;
	});

	router.afterNavigate(async (event) => {
		if (shallow(event)) return;
		const current = transition;
		if (!current || current.version !== version || current.stage !== 'committing' || current.href !== event.to?.url.href) return;
		transition = undefined;
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
