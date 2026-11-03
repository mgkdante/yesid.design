import { fireEvent, render, within } from '@testing-library/svelte';
import { tick } from 'svelte';
import Map from '@lucide/svelte/icons/map';
import { afterEach, describe, expect, it, vi } from 'vitest';

const motion = vi.hoisted(() => ({ reduced: true }));
vi.mock('@yesid/motion/stores/reducedMotion', async (original) => ({
	...(await original<object>()),
	isPrefersReducedMotion: () => motion.reduced,
}));

const lenis = vi.hoisted(() => ({ current: null as null | { isScrolling: false | 'smooth'; isStopped: boolean; stop: ReturnType<typeof vi.fn>; start: ReturnType<typeof vi.fn>; scroll: number; scrollTo: ReturnType<typeof vi.fn> } }));
vi.mock('@yesid/motion/utils/lenis', () => ({ getLenis: () => lenis.current }));

import SiteHeader, { type SiteHeaderProps } from './SiteHeader.svelte';
import { mountLifecycle } from '../brand/test-fixtures/mount-lifecycle.js';
import { fakeRouter, linkNavigation as link } from '../brand/test-fixtures/fake-router.js';

const LABELS = { openMenu: 'Open menu', closeMenu: 'Close menu', menu: 'Site menu', theme: 'Dark theme', menuFooter: 'All destinations', skipToContent: 'Jump to the page' };
const NAMES = { en: 'English', fr: 'Français' };

function setup(overrides: Partial<SiteHeaderProps> = {}) {
	const hooks = fakeRouter();
	const navigation = mountLifecycle(hooks.router).lifecycle;
	const view = render(SiteHeader, {
		props: {
			navigation,
			home: '/',
			links: [{ href: '/a', label: 'A', current: true }],
			menuItems: [
				{ href: '/a', label: 'A', subtitle: 'First', current: true },
				{ href: 'https://example.com', label: 'Out', external: true },
			],
			labels: LABELS,
			language: { locale: 'en', locales: ['en', 'fr'], href: (next: string) => `/${next}`, label: 'Language', names: NAMES },
			...overrides,
		},
	});
	const toggle = view.getByRole('button', { name: 'Open menu' });
	const menu = () => view.queryByRole('navigation', { name: 'Site menu' });
	return { ...view, hooks, navigation, toggle, menu, open: () => fireEvent.click(toggle) };
}

afterEach(() => {
	motion.reduced = true;
	lenis.current = null;
	vi.useRealTimers();
});

describe('SiteHeader', () => {
	it('stops a smooth scroll still in flight when a navigation starts', () => {
		const { hooks } = setup();
		lenis.current = { isScrolling: 'smooth', isStopped: false, scroll: 4200, scrollTo: vi.fn(), stop: vi.fn(), start: vi.fn() };
		hooks.before!(link('/b'));
		expect(lenis.current.stop).toHaveBeenCalledOnce();
		expect(lenis.current.start).toHaveBeenCalledOnce();

		lenis.current = { isScrolling: false, isStopped: false, scroll: 4200, scrollTo: vi.fn(), stop: vi.fn(), start: vi.fn() };
		hooks.before!(link('/c'));
		expect(lenis.current.stop).not.toHaveBeenCalled();
		expect(lenis.current.start).not.toHaveBeenCalled();
	});

	it('menu items show their icon, and items without one keep the stop', async () => {
		const { menu, open } = setup({ menuItems: [
			{ href: '/a', label: 'A', icon: Map },
			{ href: 'https://example.com', label: 'Out', external: true },
		] });
		await open();
		expect(within(menu()!).getByRole('link', { name: 'A' }).querySelector('svg')).not.toBeNull();
		expect(within(menu()!).getByRole('link', { name: 'Out' }).querySelector('svg')).toBeNull();
	});

	it('renders consumer footer copy and hides it when explicitly empty', async () => {
		const view = setup();
		await view.open();
		expect(view.getByText(LABELS.menuFooter)).toBeTruthy();
		await view.rerender({ labels: { ...LABELS, menuFooter: '' } });
		expect(view.queryByText(LABELS.menuFooter)).toBeNull();
	});

	it('starts with the consumer-named skip link before the banner', () => {
		const view = setup();
		const skip = view.getAllByRole('link')[0]!;
		const banner = view.getByRole('banner');
		expect(skip.getAttribute('href')).toBe('#main');
		expect(skip.textContent!.trim()).toBe(LABELS.skipToContent);
		expect(skip.compareDocumentPosition(banner) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		expect(banner.contains(view.toggle)).toBe(true);
	});

	it('opens the menu from the toggle and closes it from a menu link', async () => {
		const { toggle, menu, open } = setup();
		expect(menu()).toBeNull();
		await open();
		expect(toggle.getAttribute('aria-expanded')).toBe('true');
		expect(toggle.getAttribute('aria-label')).toBe('Close menu');
		const items = within(menu()!).getAllByRole('link');
		expect(items[0]!.getAttribute('aria-current')).toBe('page');
		expect(items[1]!.getAttribute('target')).toBe('_blank');

		await fireEvent.click(items[0]!);
		await tick();
		expect(menu()).toBeNull();
		expect(toggle.getAttribute('aria-expanded')).toBe('false');
	});

	it('closes for a navigation but stays open for its own language switch', async () => {
		const { hooks, menu, open, getByRole } = setup();
		await open();
		hooks.before(await hooks.click(getByRole('link', { name: 'Language: English (EN FR)' })));
		await tick();
		expect(menu()).not.toBeNull();

		hooks.before!(link('/elsewhere'));
		await tick();
		expect(menu()).toBeNull();
	});

	it('holds a navigation until the menu has finished closing', async () => {
		motion.reduced = false;
		vi.useFakeTimers();
		const { hooks, open } = setup();
		await open();

		let landed = false;
		hooks.before(link('/elsewhere'));
		const held = hooks.on(link('/elsewhere'));
		void Promise.resolve(held).then(() => (landed = true));
		// No transitionend in the test DOM, so the 500ms fallback finishes the close.
		await vi.advanceTimersByTimeAsync(400);
		expect(landed).toBe(false);
		await vi.advanceTimersByTimeAsync(200);
		expect(landed).toBe(true);
	});

	it('re-closes a menu reopened after the first close completes during a slow loader', async () => {
		motion.reduced = false;
		vi.useFakeTimers();
		const view = setup();
		await view.open();
		const event = link('/slow');
		view.hooks.before(event);
		await tick();
		await vi.advanceTimersByTimeAsync(600);
		expect(view.menu()).toBeNull();
		await view.open();
		expect(view.menu()).not.toBeNull();
		const held = view.hooks.on(event);
		await tick();
		expect(view.toggle.getAttribute('aria-expanded')).toBe('false');
		expect(view.navigation.pending).toBe(true);
		await vi.advanceTimersByTimeAsync(600);
		await held;
		expect(view.navigation.pending).toBe(false);
		expect(view.menu()).toBeNull();
	});

	it.each(['Escape', 'toggle'])('uses the bound language link without test IDs and restores %s focus after a preserved switch', async (dismiss) => {
		const view = setup({ language: {
			locale: 'en', locales: ['en', 'fr'], href: (next) => `/${next}`,
			label: 'Language', names: NAMES, preserveState: true,
		} });
		const language = view.getByRole('link', { name: 'Language: English (EN FR)' });
		language.removeAttribute('data-testid');
		await view.open();
		const event = await view.hooks.click(language);
		view.hooks.before(event);
		expect(view.hooks.on(event)).toBeUndefined();
		await view.rerender({ language: {
			locale: 'fr', locales: ['en', 'fr'], href: (next) => `/${next}`,
			label: 'Langue', names: NAMES, preserveState: true,
		} });
		await view.hooks.after(event);
		expect(document.activeElement).toBe(language);
		expect(language.getAttribute('href')).toBe('/en');
		if (dismiss === 'Escape') await fireEvent.keyDown(language, { key: 'Escape' });
		else await fireEvent.click(view.toggle);
		await tick();
		expect(view.menu()).toBeNull();
		expect(document.activeElement).toBe(view.toggle);
	});

	it('does not restore menu-trigger focus over an ordinary navigation', async () => {
		const view = setup();
		await view.open();
		const focus = vi.spyOn(view.toggle, 'focus');
		const event = link('/elsewhere');
		view.hooks.before(event);
		await view.hooks.on(event);
		await tick();
		expect(view.menu()).toBeNull();
		expect(focus).not.toHaveBeenCalled();
	});
});
