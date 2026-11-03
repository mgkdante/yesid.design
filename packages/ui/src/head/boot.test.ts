import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { theme } from '../state/theme.svelte.js';
import boot from './boot.json';
import { injectThemeBoot, themeBootScript } from './boot.js';

const runBoot = () => new Function(themeBootScript)();
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
// What a reader or assistive technology sees on each element.
const STATE = ['data-state', 'aria-expanded', 'inert', 'aria-hidden'];
const stateOf = (root: Element) =>
	[...root.querySelectorAll(STATE.map((name) => `[${name}]`).join(', '))].map((element) =>
		STATE.map((name) => element.getAttribute(name)),
	);

// Runs the boot script, then parses `server` markup as a page load would, and returns what it shows.
async function booted(server: string) {
	runBoot();
	const host = document.createElement('div');
	document.body.append(host);
	host.innerHTML = server;
	await flush();
	return stateOf(host);
}

afterEach(() => {
	document.body.innerHTML = '';
	sessionStorage.clear();
	localStorage.clear();
	document.documentElement.dataset.theme = 'dark';
});

describe('theme boot script', () => {
	it('paints the stored theme over the markup default', () => {
		theme.set('light');
		document.documentElement.dataset.theme = 'dark';
		runBoot();
		expect(document.documentElement.dataset.theme).toBe('light');
	});

	it('paints dark when nothing is stored', () => {
		document.documentElement.dataset.theme = 'light';
		runBoot();
		expect(document.documentElement.dataset.theme).toBe('dark');
	});

	it('swallows the rejection of a view transition a reload cuts short', async () => {
		runBoot();
		const ready = Promise.reject(new DOMException('Transition was skipped', 'AbortError'));
		dispatchEvent(Object.assign(new Event('pagereveal'), { viewTransition: { ready } }));
		await flush();
	});

	it('ignores historical disclosure and quiet-mode storage before first paint', async () => {
		localStorage.setItem('quiet-mode', 'true');
		sessionStorage.setItem('persisted:notes', 'false');
		const server = '<button data-persisted-key="notes" aria-expanded="true"></button><div data-persisted-body="notes" data-quiet data-state="open">Body</div>';
		const host = Object.assign(document.createElement('div'), { innerHTML: server });
		expect(await booted(server)).toEqual(stateOf(host));
		expect(document.documentElement.dataset.quietMode).toBeUndefined();
	});

	it('ships its CSP hash in boot.json and replaces the app.html placeholder', () => {
		expect(boot.hash).toBe(`sha256-${createHash('sha256').update(themeBootScript).digest('base64')}`);
		expect(injectThemeBoot('<head>%yesid.themeBoot%</head>')).toBe(`<head><script>${themeBootScript}</script></head>`);
	});
});
