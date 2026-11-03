import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NavigationLifecycle, NavigationMenu } from './navigation-lifecycle.js';
import { fakeRouter, linkNavigation as link } from './test-fixtures/fake-router.js';
import { mountLifecycle } from './test-fixtures/mount-lifecycle.js';

const lenis = vi.hoisted(() => ({ current: null as null | {
	isScrolling: boolean | string; isStopped: boolean; scroll: number; stop: ReturnType<typeof vi.fn>; start: ReturnType<typeof vi.fn>;
} }));
vi.mock('@yesid/motion/utils/lenis', () => ({ getLenis: () => lenis.current }));

function momentum(scroll: number) {
	return { isScrolling: 'smooth', isStopped: false, scroll, stop: vi.fn(), start: vi.fn() };
}

function setup() {
	const hooks = fakeRouter();
	const { lifecycle, unmount } = mountLifecycle(hooks.router);
	return { hooks, lifecycle, unmount };
}

function attach(lifecycle: NavigationLifecycle) {
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
	it('uses an ordinary superseding click when its redirect omits the native event', async () => {
		const { hooks, lifecycle } = setup();
		const { state, language } = attach(lifecycle);
		hooks.before(await hooks.click(language));
		const ordinary = document.createElement('a');
		ordinary.href = '/ordinary-redirect';
		document.body.append(ordinary);
		await hooks.click(ordinary);
		const focusLanguage = vi.spyOn(language, 'focus');
		const redirected = link('/ordinary-destination');
		const held = hooks.on(redirected);
		expect(state.open).toBe(false);
		expect(lifecycle.pending).toBe(true);
		expect(hooks.before).toHaveBeenCalledOnce();
		state.active = false;
		lifecycle.menuClosed();
		expect(await held).toBeUndefined();
		await hooks.after(redirected);
		expect(focusLanguage).not.toHaveBeenCalled();
	});

	it('uses a superseding locale click for focus reset when its redirect omits the native event', async () => {
		const { hooks, lifecycle } = setup();
		const { state, language } = attach(lifecycle);
		const ordinary = document.createElement('a');
		ordinary.href = '/slow-ordinary';
		document.body.append(ordinary);
		hooks.before(await hooks.click(ordinary));
		state.active = false;
		lifecycle.menuClosed();
		await hooks.click(language);
		const reset = await hooks.on(link('/fr/redirected?q=1#section'));
		expect(hooks.before).toHaveBeenCalledOnce();
		expect(reset).toBeTypeOf('function');
		reset?.();
		expect(document.activeElement).toBe(document.body);
	});

	it('does not infer continuity from an unobserved native event that disappears', async () => {
		const { hooks, lifecycle } = setup();
		const { state } = attach(lifecycle);
		hooks.before({ ...link('/fr?q=1#section'), event: new MouseEvent('click') });
		const held = hooks.on(link('/unknown-redirect'));
		expect(state.open).toBe(false);
		state.active = false;
		lifecycle.menuClosed();
		expect(await held).toBeUndefined();
	});

	it('removes the click observer when its layout unmounts', async () => {
		const { hooks, lifecycle, unmount } = setup();
		const { language } = attach(lifecycle);
		const version = lifecycle.version;
		unmount();
		await hooks.click(language);
		expect(lifecycle.version).toBe(version);
	});

	it('discards an observed click superseded by a programmatic navigation', async () => {
		const { hooks, lifecycle } = setup();
		const { state, language } = attach(lifecycle);
		state.open = state.active = false;
		hooks.before(await hooks.click(language));
		const programmatic = { ...link('/programmatic'), type: 'goto' };
		hooks.on(programmatic);
		await hooks.after(programmatic);
		expect(hooks.on(link('/unknown-redirect'))).toBeUndefined();
	});

	it.each([
		{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 },
	])('ignores modified or non-primary clicks: %j', async (init) => {
		const { hooks, lifecycle } = setup();
		const { language } = attach(lifecycle);
		await hooks.click(language, init);
		expect(lifecycle.version).toBe(0);
	});

	it('ignores same-document fragments and links opened outside the current page', async () => {
		const { hooks, lifecycle } = setup();
		for (const [href, attribute] of [
			['#section', null], ['/download', 'download'], ['/elsewhere', 'target'], ['https://example.com', null],
		] as const) {
			const anchor = document.createElement('a');
			anchor.href = href;
			if (attribute) anchor.setAttribute(attribute, attribute === 'target' ? '_blank' : '');
			document.body.append(anchor);
			await hooks.click(anchor);
		}
		expect(lifecycle.version).toBe(0);
	});

	it('closes a menu reopened during a slow load before waiting for its second close', async () => {
		const { hooks, lifecycle } = setup();
		const { state } = attach(lifecycle);
		const event = link('/slow');
		hooks.before(event);
		// The first close completes while the route loader is still pending.
		state.active = false;
		lifecycle.menuClosed();
		state.open = state.active = true;
		const held = hooks.on(event);
		expect(state.open).toBe(false);
		expect(lifecycle.pending).toBe(true);
		state.active = false;
		lifecycle.menuClosed();
		await held;
		expect(lifecycle.pending).toBe(false);
	});

	it('holds a redirected menu navigation without a second beforeNavigate', async () => {
		const { hooks, lifecycle } = setup();
		const { state } = attach(lifecycle);
		hooks.before(link('/redirect'));
		const held = hooks.on(link('/redirected'));
		expect(lifecycle.pending).toBe(true);
		const completed = vi.fn();
		void Promise.resolve(held).then(completed);
		await Promise.resolve();
		expect(completed).not.toHaveBeenCalled();
		state.active = false;
		lifecycle.menuClosed();
		await held;
		expect(completed).toHaveBeenCalledOnce();
	});

	it('resets focus for a superseding locale click with no beforeNavigate', async () => {
		const { hooks, lifecycle } = setup();
		const { state, language } = attach(lifecycle);
		hooks.before({ ...link('/slow'), event: new MouseEvent('click') });
		state.active = false;
		lifecycle.menuClosed();
		language.focus();
		const previousVersion = lifecycle.version;
		const reset = await hooks.on({ ...link('/fr?q=1#section'), event: new MouseEvent('click') });
		expect(reset).toBeTypeOf('function');
		expect(lifecycle.version).toBeGreaterThan(previousVersion);
		reset?.();
		expect(document.activeElement).toBe(document.body);
	});

	it('invalidates an earlier focus callback when onNavigate supersedes it without beforeNavigate', async () => {
		const { hooks, lifecycle } = setup();
		const { state, language } = attach(lifecycle);
		state.open = state.active = false;
		language.focus();
		const event = link('/fr?q=1#section');
		hooks.before(event);
		const reset = await hooks.on(event);
		expect(reset).toBeTypeOf('function');
		hooks.on(link('/superseding'));
		reset?.();
		expect(document.activeElement).toBe(language);
	});

	it('interrupts header-less momentum in onNavigate when beforeNavigate was skipped', () => {
		const { hooks } = setup();
		lenis.current = momentum(1200);
		hooks.on(link('/superseding'));
		expect(lenis.current.stop).toHaveBeenCalledOnce();
		expect(lenis.current.start).toHaveBeenCalledOnce();
	});

	it('retains locale intent and focuses its updated link after a redirect with no native event', async () => {
		const { hooks, lifecycle } = setup();
		const { state, language } = attach(lifecycle);
		hooks.before(await hooks.click(language));
		const redirected = link('/fr/canonical?q=1#section');
		expect(hooks.on(redirected)).toBeUndefined();
		expect(state.open).toBe(true);
		language.href = '/en/canonical?q=1#section';
		await hooks.after(redirected);
		expect(document.activeElement).toBe(language);
	});

	it('does not turn an ordinary redirect to the locale URL into a locale click', async () => {
		const { hooks, lifecycle } = setup();
		const { state } = attach(lifecycle);
		const ordinary = document.createElement('a');
		ordinary.href = '/redirect';
		document.body.append(ordinary);
		hooks.before(await hooks.click(ordinary));
		state.open = true;
		const held = hooks.on(link('/fr?q=1#section'));
		expect(state.open).toBe(false);
		expect(lifecycle.pending).toBe(true);
		state.active = false;
		lifecycle.menuClosed();
		await held;
	});

	it('treats a new ordinary native click as superseding a locale switch', async () => {
		const { hooks, lifecycle } = setup();
		const { state } = attach(lifecycle);
		hooks.before({ ...link('/fr?q=1#section'), event: new MouseEvent('click') });
		const held = hooks.on({ ...link('/ordinary'), event: new MouseEvent('click') });
		expect(state.open).toBe(false);
		expect(lifecycle.pending).toBe(true);
		state.active = false;
		lifecycle.menuClosed();
		expect(await held).toBeUndefined();
	});

	it('interrupts momentum started during the loader before committing without a header', () => {
		const { hooks } = setup();
		const event = link('/slow');
		hooks.before(event);
		lenis.current = momentum(2600);
		hooks.on(event);
		expect(lenis.current.stop).toHaveBeenCalledOnce();
		expect(lenis.current.start).toHaveBeenCalledOnce();
	});

	it('registers each hook once, independently of header mounting', () => {
		const { hooks, lifecycle } = setup();
		attach(lifecycle).detach();
		attach(lifecycle).detach();
		for (const register of Object.values(hooks.router)) expect(register).toHaveBeenCalledOnce();
	});

	it('interrupts window or element-scroller momentum with no header', () => {
		const { hooks } = setup();
		lenis.current = momentum(4200);
		hooks.before(link('/next'));
		expect(lenis.current.stop).toHaveBeenCalledOnce();
		expect(lenis.current.start).toHaveBeenCalledOnce();
		lenis.current.isScrolling = false;
		lenis.current.stop.mockClear();
		lenis.current.start.mockClear();
		hooks.before(link('/other'));
		expect(lenis.current.stop).not.toHaveBeenCalled();
		expect(lenis.current.start).not.toHaveBeenCalled();
	});

	it('ignores shallow goto without closing, stopping scroll or advancing the focus guard', () => {
		const { hooks, lifecycle } = setup();
		const { menu } = attach(lifecycle);
		lenis.current = momentum(20);
		const event = { ...link('/next'), type: 'goto', shallow: true };
		hooks.before(event);
		expect(hooks.on(event)).toBeUndefined();
		hooks.after(event);
		expect(menu.close).not.toHaveBeenCalled();
		expect(lenis.current.stop).not.toHaveBeenCalled();
		expect(lenis.current.start).not.toHaveBeenCalled();
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
		mountLifecycle(hooks.router, { languageLink: () => language });
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
