import { tick } from 'svelte';
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
	let transition: {
		version: number;
		href: string | undefined;
		menu: NavigationMenu | undefined;
		keepMenu: boolean;
		resetFocus: boolean;
	} | undefined;
	const waiting = new Set<() => void>();
	const shallow = (event: NavigationEvent) => event.shallow && event.type === 'goto';
	function menuClosed() {
		for (const resolve of waiting) resolve();
		waiting.clear();
	}

	router.beforeNavigate((event) => {
		if (shallow(event)) return;
		const lenis = getLenis();
		if (lenis?.isScrolling) lenis.scrollTo(lenis.scroll, { immediate: true });
		const language = menu?.languageLink() ?? options.languageLink?.();
		const localeSwitch = event.type === 'link' && !!language && event.to?.url.href === language.href;
		transition = {
			version: ++version,
			href: event.to?.url.href,
			menu,
			keepMenu: localeSwitch && !!menu?.open,
			resetFocus: localeSwitch && language?.getAttribute('data-sveltekit-reset') === 'false',
		};
		if (!transition.keepMenu) menu?.close();
	});

	router.onNavigate((event) => {
		if (shallow(event)) return;
		const current = transition;
		if (!current || current.href !== event.to?.url.href) return;
		// Decide menu continuity before creating any reset callback. No component hook-order rule.
		if (current.keepMenu) return;
		const reset = current.resetFocus ? resetFocusAfterNavigation() : undefined;
		const after = reset ? () => { if (version === current.version) reset(); } : undefined;
		if (menu?.active) return new Promise<void>((resolve) => waiting.add(resolve)).then(() => after);
		return after;
	});

	router.afterNavigate(async (event) => {
		if (shallow(event)) return;
		const current = transition;
		if (!current?.keepMenu || current.href !== event.to?.url.href) return;
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
