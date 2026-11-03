import { afterEach, describe, expect, it, vi } from 'vitest';
import { createNavigationLifecycle, type NavigationMenu } from './navigation-lifecycle.js';
import { fakeRouter, linkNavigation as link } from './test-fixtures/fake-router.js';

const lenis = vi.hoisted(() => ({ current: null as null | {
	isScrolling: boolean | string; scroll: number; scrollTo: ReturnType<typeof vi.fn>;
} }));
vi.mock('@yesid/motion/utils/lenis', () => ({ getLenis: () => lenis.current }));

function setup() {
	const hooks = fakeRouter();
	const lifecycle = createNavigationLifecycle(hooks.router);
	return { hooks, lifecycle };
}

function attach(lifecycle: ReturnType<typeof createNavigationLifecycle>) {
	const language = document.createElement('a');
	language.href = '/fr?q=1#section';
	language.setAttribute('data-sveltekit-reset', 'false');
	document.body.append(language);
	const state = { open: true, active: true };
	const menu: NavigationMenu = {
		get open() { return state.open; },
		get active() { return state.active; },
		close: vi.fn(() => { state.open = false; }),
		languageLink: () => language,
	};
	const detach = lifecycle.attachMenu(menu);
	return { language, state, menu, detach };
}

afterEach(() => {
	lenis.current = null;
	document.body.replaceChildren();
});

describe('navigation lifecycle', () => {
	it('registers each hook once, independently of header mounting', () => {
		const { hooks, lifecycle } = setup();
		attach(lifecycle).detach();
		attach(lifecycle).detach();
		for (const register of Object.values(hooks.router)) expect(register).toHaveBeenCalledOnce();
	});

	it('interrupts window or element-scroller momentum with no header', () => {
		const { hooks } = setup();
		lenis.current = { isScrolling: 'smooth', scroll: 4200, scrollTo: vi.fn() };
		hooks.before(link('/next'));
		expect(lenis.current.scrollTo).toHaveBeenCalledWith(4200, { immediate: true });
		lenis.current.isScrolling = false;
		lenis.current.scrollTo.mockClear();
		hooks.before(link('/other'));
		expect(lenis.current.scrollTo).not.toHaveBeenCalled();
	});

	it('ignores shallow goto without closing, stopping scroll or advancing the focus guard', () => {
		const { hooks, lifecycle } = setup();
		const { menu } = attach(lifecycle);
		lenis.current = { isScrolling: 'smooth', scroll: 20, scrollTo: vi.fn() };
		const event = { ...link('/next'), type: 'goto', shallow: true };
		hooks.before(event);
		expect(hooks.on(event)).toBeUndefined();
		hooks.after(event);
		expect(menu.close).not.toHaveBeenCalled();
		expect(lenis.current.scrollTo).not.toHaveBeenCalled();
		expect(lifecycle.version).toBe(0);
	});

	it.each(['link', 'goto', 'popstate'])('closes for ordinary %s navigation and holds until closed', async (type) => {
		const { hooks, lifecycle } = setup();
		const { state, menu } = attach(lifecycle);
		const event = { ...link('/next'), type };
		hooks.before(event);
		expect(menu.close).toHaveBeenCalledOnce();
		const completed = vi.fn();
		const held = hooks.on(event);
		void Promise.resolve(held).then(completed);
		await Promise.resolve();
		expect(completed).not.toHaveBeenCalled();
		expect(lifecycle.pending).toBe(true);
		state.active = false;
		lifecycle.menuClosed();
		await held;
		expect(completed).toHaveBeenCalledOnce();
		expect(lifecycle.pending).toBe(false);
	});

	it('closes on full-document departure without depending on onNavigate', () => {
		const { hooks, lifecycle } = setup();
		const { state } = attach(lifecycle);
		hooks.before({ type: 'leave', to: null });
		expect(state.open).toBe(false);
		expect(lifecycle.pending).toBe(false);
	});

	it('keeps an open menu on its exact locale link and focuses the updated link after landing', async () => {
		const { hooks, lifecycle } = setup();
		const { state, language, menu } = attach(lifecycle);
		const event = link('/fr?q=1#section');
		hooks.before(event);
		expect(hooks.on(event)).toBeUndefined();
		expect(menu.close).not.toHaveBeenCalled();
		language.href = '/en?q=1#section';
		await hooks.after(event);
		expect(state.open).toBe(true);
		expect(document.activeElement).toBe(language);
	});

	it.each(['/fr?q=2#section', '/fr?q=1#other'])('does not mistake %s for the language link', (path) => {
		const { hooks, lifecycle } = setup();
		const { state } = attach(lifecycle);
		hooks.before(link(path));
		expect(state.open).toBe(false);
	});

	it('does not preserve the menu for history traversal to the locale link', () => {
		const { hooks, lifecycle } = setup();
		const { state } = attach(lifecycle);
		hooks.before({ ...link('/fr?q=1#section'), type: 'popstate' });
		expect(state.open).toBe(false);
	});

	it('resets focus after a closed-menu state-preserving switch', async () => {
		const { hooks, lifecycle } = setup();
		const { state, language } = attach(lifecycle);
		state.open = state.active = false;
		language.focus();
		const event = link('/fr?q=1#section');
		hooks.before(event);
		const reset = await hooks.on(event);
		expect(reset).toBeTypeOf('function');
		reset?.();
		expect(document.activeElement).toBe(document.body);
	});

	it('supports focus reset for a standalone plain link without a header', async () => {
		const hooks = fakeRouter();
		const language = document.createElement('a');
		language.href = '/fr';
		language.setAttribute('data-sveltekit-reset', 'false');
		document.body.append(language);
		createNavigationLifecycle(hooks.router, { languageLink: () => language });
		language.focus();
		const event = link('/fr');
		hooks.before(event);
		const reset = await hooks.on(event);
		reset?.();
		expect(document.activeElement).toBe(document.body);
	});

	it('resets focus after a state-preserving locale switch during the close animation', async () => {
		const { hooks, lifecycle } = setup();
		const { state, language } = attach(lifecycle);
		state.open = false;
		language.focus();
		const event = link('/fr?q=1#section');
		hooks.before(event);
		const held = hooks.on(event);
		state.active = false;
		lifecycle.menuClosed();
		const reset = await held;
		expect(reset).toBeTypeOf('function');
		reset?.();
		expect(document.activeElement).toBe(document.body);
	});

	it('leaves focus reset to the router for a language link without preserveState', () => {
		const { hooks, lifecycle } = setup();
		const { state, language } = attach(lifecycle);
		state.open = state.active = false;
		language.removeAttribute('data-sveltekit-reset');
		const event = link('/fr?q=1#section');
		hooks.before(event);
		expect(hooks.on(event)).toBeUndefined();
	});

	it('does not apply an old focus reset after a new navigation starts', async () => {
		const { hooks, lifecycle } = setup();
		const { state, language } = attach(lifecycle);
		state.open = state.active = false;
		language.focus();
		const event = link('/fr?q=1#section');
		hooks.before(event);
		const reset = await hooks.on(event);
		hooks.before(link('/next'));
		reset?.();
		expect(document.activeElement).toBe(language);
	});

	it('releases outstanding holds when the header unmounts', async () => {
		const { hooks, lifecycle } = setup();
		const { detach } = attach(lifecycle);
		hooks.before(link('/next'));
		const held = hooks.on(link('/next'));
		detach();
		await held;
		expect(lifecycle.pending).toBe(false);
	});

	it('does not refocus a locale link after another navigation starts', async () => {
		const { hooks, lifecycle } = setup();
		const { language } = attach(lifecycle);
		const event = link('/fr?q=1#section');
		hooks.before(event);
		hooks.on(event);
		const landed = hooks.after(event);
		hooks.before(link('/next'));
		await landed;
		expect(document.activeElement).not.toBe(language);
	});
});
