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
 * Pass the three hooks from `$app/navigation`; their lifetime follows that layout, not the header.
 */
export function createNavigationLifecycle(
	router: SiteNavigation,
	options: NavigationLifecycleOptions = {},
): NavigationLifecycle {
	let menu: NavigationMenu | undefined;
	let version = 0;
	type LinkIntent = {
		event: MouseEvent;
		href: string;
		localeSwitch: boolean;
		resetFocus: boolean;
	};
	let observedLink: LinkIntent | undefined;
	let candidateLink: LinkIntent | undefined;
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
	function confirmLink(event?: Event) {
		if (!candidateLink || (event && candidateLink.event !== event) || !candidateLink.event.defaultPrevented) return;
		observedLink = candidateLink;
		candidateLink = undefined;
		version++;
	}
	onMount(() => {
		function observeLink(event: MouseEvent) {
			if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
			const anchor = event.composedPath().find((node): node is HTMLAnchorElement => node instanceof HTMLAnchorElement);
			if (!anchor?.hasAttribute('href') || anchor.hasAttribute('download') ||
				(anchor.target && anchor.target.toLowerCase() !== '_self') || anchor.origin !== location.origin) return;
			if (anchor.href.includes('#') && anchor.pathname === location.pathname && anchor.search === location.search) return;
			const language = menu?.languageLink() ?? options.languageLink?.();
			candidateLink = {
				event,
				href: anchor.href,
				localeSwitch: anchor === language,
				resetFocus: anchor === language && language.getAttribute('data-sveltekit-reset') === 'false',
			};
		}
		function confirmAtWindow(event: MouseEvent) {
			// Window bubble follows the router's document bubble listener. A capture-time
			// microtask can run before that listener for a trusted native click.
			confirmLink(event);
			if (candidateLink?.event === event) candidateLink = undefined;
		}
		document.addEventListener('click', observeLink, true);
		window.addEventListener('click', confirmAtWindow);
		return () => {
			candidateLink = undefined;
			observedLink = undefined;
			document.removeEventListener('click', observeLink, true);
			window.removeEventListener('click', confirmAtWindow);
		};
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
		const previous = transition;
		// Cached routing can reach its hooks before window bubbling. The router has
		// already intercepted the click here, so it can confirm the captured candidate too.
		if (event.type === 'link') confirmLink(event.event);
		else candidateLink = undefined;
		if (event.type !== 'link' || (event.event && observedLink?.event !== event.event) ||
			(stage === 'loading' && (!event.event && (event.type !== 'link' || observedLink?.href !== event.to?.url.href)))) {
			observedLink = undefined;
		}
		const observed = event.type === 'link' && observedLink &&
			(!event.event || event.event === observedLink.event) ? observedLink : undefined;
		// A redirect may omit its event, but absence cannot prove continuity: a second
		// click may have superseded the loader without receiving beforeNavigate.
		const continuing = stage === 'committing' && previous?.stage === 'loading' &&
			previous.type === event.type && (event.event
				? previous.event === event.event
				: observed ? previous.event === observed.event
					: !previous.event && previous.href === event.to?.url.href);
		const language = menu?.languageLink() ?? options.languageLink?.();
		const localeSwitch = observed?.localeSwitch ?? (continuing ? previous.localeSwitch :
			event.type === 'link' && !!language && event.to?.url.href === language.href);
		return transition = {
			version: ++version,
			href: event.to?.url.href,
			type: event.type,
			event: observed?.event ?? (continuing ? previous.event : event.event),
			stage,
			menu,
			localeSwitch,
			keepMenu: localeSwitch && !!menu?.open,
			resetFocus: observed?.resetFocus ?? (continuing ? previous.resetFocus :
				localeSwitch && language?.getAttribute('data-sveltekit-reset') === 'false'),
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
