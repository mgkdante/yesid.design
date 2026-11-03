// Adapted from Astra's supplied rereview-adapter-contract.test.ts characterizations.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup } from '@testing-library/svelte';
import { fakeRouter, linkNavigation as link } from './test-fixtures/fake-router.js';
import { mountLifecycle } from './test-fixtures/mount-lifecycle.js';

vi.mock('@yesid/motion/utils/lenis', () => ({ getLenis: () => null }));
afterEach(() => { cleanup(); document.body.replaceChildren(); });

function setup(subscribe = true) {
	const hooks = fakeRouter();
	const { subscribeNavigation, ...withoutSubscription } = hooks.router;
	const { lifecycle } = mountLifecycle(subscribe ? hooks.router : withoutSubscription);
	const language = document.createElement('a');
	language.href = '/fr';
	language.setAttribute('data-sveltekit-reset', 'false');
	document.body.append(language);
	const state = { open: true, active: false };
	lifecycle.attachMenu({
		get open() { return state.open; },
		get active() { return state.active; },
		close() { state.open = false; },
		languageLink: () => language,
	});
	return { hooks, lifecycle, language, state };
}

// Unsupported partial stream: this cannot be distinguished from a compliant redirect hop.
it('characterization: missing event on a superseding original start retains stale locale intent', async () => {
	const { hooks, language, state } = setup();
	hooks.before(await hooks.click(language));
	hooks.start(link('/ordinary'));
	expect(hooks.on(link('/ordinary-redirect'))).toBeUndefined();
	await hooks.after(link('/ordinary-redirect'));
	expect(state.open).toBe(true);
	expect(document.activeElement).toBe(language);
});

it('a silent subscription cannot carry a hook-only locale claim through an eventless commit', async () => {
	const { hooks, language, state } = setup();
	const event = await hooks.click(language, { handled: false });
	hooks.before(event);
	const focus = vi.spyOn(language, 'focus');
	hooks.on(link('/ordinary-redirect'));
	await hooks.after(link('/ordinary-redirect'));
	expect(state.open).toBe(false);
	expect(focus).not.toHaveBeenCalled();
});

it('characterization: beforeNavigate then accepted-start notification is supported', async () => {
	const { hooks, lifecycle, language, state } = setup();
	const event = await hooks.click(language, { handled: false });
	hooks.before(event);
	const version = lifecycle.version;
	hooks.start(event);
	expect(lifecycle.version).toBe(version);
	hooks.on(link('/locale-redirect'));
	await hooks.after(link('/locale-redirect'));
	expect(state.open).toBe(true);
	expect(document.activeElement).toBe(language);
});

it('characterization: duplicate native-event notifications before completion are idempotent', async () => {
	const { hooks, lifecycle, language } = setup();
	const event = await hooks.click(language);
	const version = lifecycle.version;
	hooks.start(event);
	hooks.start(event);
	expect(lifecycle.version).toBe(version);
});

it('characterization: late accepted start cannot recover an eventless locale redirect commit', async () => {
	const { hooks, language, state } = setup();
	const event = await hooks.click(language, { handled: false });
	hooks.on(link('/locale-redirect'));
	hooks.start(event);
	await hooks.after(link('/locale-redirect'));
	expect(state.open).toBe(false);
});

it('ignores a duplicate original-start notification received after completion', async () => {
	const { hooks, language, state } = setup();
	const event = await hooks.click(language);
	hooks.before(event);
	hooks.on(event);
	await hooks.after(event);
	hooks.start(null);
	hooks.start(event);
	hooks.on(link('/unrelated'));
	await hooks.after(link('/unrelated'));
	expect(state.open).toBe(false);
});

it('drops an accepted claim when the adapter reports idle before any commit', async () => {
	const { hooks, language, state } = setup();
	hooks.before(await hooks.click(language));
	hooks.start(null);
	hooks.on(link('/unrelated'));
	await hooks.after(link('/unrelated'));
	expect(state.open).toBe(false);
});

it('cannot preserve a claim through an eventless start after the commit boundary', async () => {
	const { hooks, language, state } = setup();
	const event = await hooks.click(language);
	hooks.before(event);
	hooks.on(event);
	hooks.start(link('/superseding'));
	hooks.on(link('/superseding-redirect'));
	await hooks.after(link('/superseding-redirect'));
	expect(state.open).toBe(false);
});

it('ignores a known original event delivered after its eventless commit', async () => {
	const { hooks, language, state } = setup();
	const event = await hooks.click(language, { handled: false });
	hooks.before(event);
	hooks.on(link('/eventless'));
	await hooks.after(link('/eventless'));
	hooks.start(event);
	state.open = true;
	hooks.on(link('/unrelated'));
	await hooks.after(link('/unrelated'));
	expect(state.open).toBe(false);
});

describe('without a subscription', () => {
	it('mounts with the three-hook adapter and keeps a direct language switch with matching event identity', async () => {
		const { hooks, language, state } = setup(false);
		const event = await hooks.click(language);
		hooks.before(event);
		expect(hooks.on(event)).toBeUndefined();
		const focus = vi.spyOn(language, 'focus');
		language.href = '/en';
		await hooks.after(event);
		expect(state.open).toBe(true);
		expect(focus).toHaveBeenCalledOnce();
	});

	it('closes on an eventless locale redirect and drops the claim before the next commit', async () => {
		const { hooks, language, state } = setup(false);
		const event = await hooks.click(language);
		hooks.before(event);
		const focus = vi.spyOn(language, 'focus');
		const redirected = link('/locale-redirect');
		const reset = await hooks.on(redirected);
		reset?.();
		await hooks.after(redirected);
		expect(state.open).toBe(false);
		expect(focus).not.toHaveBeenCalled();
		state.open = true;
		hooks.on(link('/unrelated'));
		await hooks.after(link('/unrelated'));
		expect(state.open).toBe(false);
		expect(focus).not.toHaveBeenCalled();
	});

	it('resets page focus after a direct state-preserving switch with a closed menu', async () => {
		const { hooks, language, state } = setup(false);
		state.open = false;
		const event = await hooks.click(language);
		hooks.before(event);
		const reset = await hooks.on(event);
		expect(reset).toBeTypeOf('function');
		reset?.();
		expect(document.activeElement).toBe(document.body);
	});

	it('resets page focus for an eventless redirect when preserveState skipped the router reset', async () => {
		const { hooks, language, state } = setup(false);
		state.open = false;
		hooks.before(await hooks.click(language));
		const reset = await hooks.on(link('/locale-redirect'));
		expect(reset).toBeTypeOf('function');
		reset?.();
		expect(document.activeElement).toBe(document.body);
	});

	it('does not refocus across an eventless after hook', async () => {
		const { hooks, language, state } = setup(false);
		const event = await hooks.click(language);
		hooks.before(event);
		hooks.on(event);
		const focus = vi.spyOn(language, 'focus');
		await hooks.after(link('/fr'));
		expect(state.open).toBe(false);
		expect(focus).not.toHaveBeenCalled();
	});

	it('closes an ordinary navigation and releases its animation hold', async () => {
		const { hooks, lifecycle, state } = setup(false);
		state.active = true;
		const event = link('/ordinary');
		hooks.before(event);
		const held = hooks.on(event);
		expect(state.open).toBe(false);
		expect(lifecycle.pending).toBe(true);
		state.active = false;
		lifecycle.menuClosed();
		await held;
		expect(lifecycle.pending).toBe(false);
	});

	it.each(['ordinary', 'locale'])('a superseding %s redirect cannot inherit the original locale claim', async (destination) => {
		const { hooks, language, state } = setup(false);
		hooks.before(await hooks.click(language));
		// Only the first navigation receives beforeNavigate. The redirect loses the second click event.
		const second = document.createElement('a');
		second.href = destination === 'locale' ? '/fr' : '/ordinary';
		document.body.append(second);
		await hooks.click(second);
		const focus = vi.spyOn(language, 'focus');
		const redirect = link('/redirected');
		hooks.on(redirect);
		await hooks.after(redirect);
		expect(state.open).toBe(false);
		expect(focus).not.toHaveBeenCalled();
	});
});
