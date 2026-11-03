import { vi } from 'vitest';
import type { NavigationEvent, OnNavigate, SiteNavigation } from '../navigation.js';

/** One adapter for lifecycle and rendered-header tests. Duplicate registrations fail loudly. */
export function fakeRouter() {
	let before: Parameters<SiteNavigation['beforeNavigate']>[0] | undefined;
	let on: Parameters<OnNavigate>[0] | undefined;
	let after: Parameters<SiteNavigation['afterNavigate']>[0] | undefined;
	const router: SiteNavigation = {
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
		before: vi.fn((event: NavigationEvent) => before!(event)),
		on: (event: NavigationEvent) => on!(event),
		after: (event: NavigationEvent) => after!(event),
		/** Dispatch the native link trigger, allowing the lifecycle to observe it before a redirect drops it. */
		async click(anchor: HTMLAnchorElement, { handled = true, ...init }: MouseEventInit & { handled?: boolean } = {}): Promise<NavigationEvent> {
			const href = anchor.href;
			const event = new MouseEvent('click', { bubbles: true, cancelable: true, ...init });
			if (handled) anchor.addEventListener('click', (click) => click.preventDefault(), { once: true });
			anchor.focus();
			anchor.dispatchEvent(event);
			await Promise.resolve();
			return { type: 'link', to: { url: new URL(href) }, event };
		},
	};
}

export const linkNavigation = (path: string): NavigationEvent => ({
	type: 'link', to: { url: new URL(path, location.href) },
});
