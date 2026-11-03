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
		before: (event: NavigationEvent) => before!(event),
		on: (event: NavigationEvent) => on!(event),
		after: (event: NavigationEvent) => after!(event),
	};
}

export const linkNavigation = (path: string): NavigationEvent => ({
	type: 'link', to: { url: new URL(path, location.href) },
});
