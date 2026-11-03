import { vi } from 'vitest';
import type { NavigationEvent, OnNavigate, SiteNavigation } from '../navigation.js';

/** One adapter for lifecycle and rendered-header tests. Duplicate registrations fail loudly. */
export function fakeRouter() {
	let before: Parameters<SiteNavigation['beforeNavigate']>[0] | undefined;
	let on: Parameters<OnNavigate>[0] | undefined;
	let after: Parameters<SiteNavigation['afterNavigate']>[0] | undefined;
	let subscriber: ((event: NavigationEvent | null) => void) | undefined;
	const unsubscribe = vi.fn(() => { subscriber = undefined; });
	const router: SiteNavigation = {
		subscribeNavigation: vi.fn((callback) => {
			if (subscriber) throw new Error('navigation start subscribed twice');
			subscriber = callback;
			callback(null);
			return unsubscribe;
		}),
		beforeNavigate: vi.fn((callback) => {
			if (before) throw new Error('beforeNavigate registered twice');
			before = callback;
		}),
		onNavigate: vi.fn((callback) => {
			if (on) throw new Error('onNavigate registered twice');
			on = callback;
		}),
		afterNavigate: vi.fn((callback) => {
			if (after) throw new Error('afterNavigate registered twice');
			after = callback;
		}),
	};
	return {
		router,
		unsubscribe,
		start: (event: NavigationEvent | null) => subscriber?.(event),
		before: vi.fn((event: NavigationEvent) => before!(event)),
		on: (event: NavigationEvent) => on!(event),
		after: (event: NavigationEvent) => after!(event),
		/** Dispatch a link and publish only a router-accepted start, before a redirect drops its event. */
		async click(element: HTMLElement, { handled = true, onIntercept, ...init }: MouseEventInit & {
			handled?: boolean;
			onIntercept?: (navigation: NavigationEvent) => void;
		} = {}): Promise<NavigationEvent> {
			if (!(element instanceof HTMLAnchorElement)) throw new Error('The fake router requires a link');
			const anchor = element;
			const href = anchor.href;
			const event = new MouseEvent('click', { bubbles: true, cancelable: true, ...init });
			const intercept = (click: MouseEvent) => {
				if (click.defaultPrevented || click.button !== 0 || click.ctrlKey || click.metaKey || click.shiftKey || click.altKey ||
					anchor.hasAttribute('download') || anchor.hasAttribute('data-sveltekit-reload') ||
					(anchor.target && anchor.target !== '_self') || anchor.origin !== location.origin ||
					(anchor.hash && anchor.pathname === location.pathname && anchor.search === location.search)) return;
				click.preventDefault();
				subscriber?.({ type: 'link', to: { url: new URL(href) }, event: click });
				onIntercept?.({ type: 'link', to: { url: new URL(href) }, event: click });
			};
			if (handled) document.addEventListener('click', intercept, { once: true });
			anchor.focus();
			try { anchor.dispatchEvent(event); }
			finally { document.removeEventListener('click', intercept); }
			await Promise.resolve();
			return { type: 'link', to: { url: new URL(href) }, event };
		},
	};
}

export const linkNavigation = (path: string): NavigationEvent => ({
	type: 'link', to: { url: new URL(path, location.href) },
});
