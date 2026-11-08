import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SECTIONS_READY_EVENT } from '../brand/sections-preference.js';
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
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	document.body.innerHTML = '';
	document.dispatchEvent(new Event(SECTIONS_READY_EVENT));
	sessionStorage.clear();
	localStorage.clear();
	document.documentElement.dataset.theme = 'dark';
	delete document.documentElement.dataset.sectionsChoice;
	delete document.documentElement.dataset.sectionsRecovering;
});

describe('theme boot script', () => {
	it.each([null, 'collapsed', 'expanded', 'false', '{broken'])('reads only a valid bulk choice (%s), without writing a default', (stored) => {
		if (stored !== null) localStorage.setItem('sections-choice', stored);
		runBoot();
		expect(document.documentElement.dataset.sectionsChoice).toBe(stored === 'collapsed' ? 'collapsed' : 'expanded');
		expect(localStorage.getItem('sections-choice')).toBe(stored);
	});

	it('keeps declared geometry when storage access is blocked', () => {
		vi.stubGlobal('localStorage', { getItem() { throw new DOMException('Blocked', 'SecurityError'); } });
		expect(runBoot).not.toThrow();
		expect(document.documentElement.dataset.sectionsChoice).toBeUndefined();
	});

	it('exposes pending content even if observer setup and cleanup throw', () => {
		document.body.innerHTML = '<div class="section-card"></div>';
		vi.stubGlobal('MutationObserver', class {
			observe() { throw new Error('Observer setup failed'); }
			disconnect() { throw new Error('Observer cleanup failed'); }
		});
		expect(runBoot).not.toThrow();
		expect(document.querySelector('.section-card')?.hasAttribute('data-section-fallback')).toBe(true);
		expect(document.documentElement.hasAttribute('data-sections-parsing')).toBe(false);
	});

	it('releases startup error listeners when pending mounts finish hydration', () => {
		vi.spyOn(document, 'readyState', 'get').mockReturnValue('complete');
		document.body.innerHTML = '<div class="section-card"></div>';
		const add = vi.spyOn(globalThis, 'addEventListener');
		const remove = vi.spyOn(globalThis, 'removeEventListener');
		runBoot();
		const error = add.mock.calls.find(([type]) => type === 'error')?.[1];
		const rejection = add.mock.calls.find(([type]) => type === 'unhandledrejection')?.[1];
		expect(error).toBeDefined();
		expect(rejection).toBeDefined();
		document.querySelector('.section-card')!.setAttribute('data-section-ready', '');
		document.dispatchEvent(new Event(SECTIONS_READY_EVENT));
		expect(remove).toHaveBeenCalledWith('error', error, true);
		expect(remove).toHaveBeenCalledWith('unhandledrejection', rejection);
	});
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

	it('seeds complete server eligibility before the first section is parsed', () => {
		const html = '<head>%yesid.themeBoot%</head><div data-sections-control></div><div class="has-[>img]" data-section-bulk=""></div><div class="has-[>img]" data-section-bulk=""></div>';
		expect(injectThemeBoot(html)).toContain('<script data-sections-available>');
		expect(injectThemeBoot(html.replace('<div class="has-[>img]" data-section-bulk=""></div>', ''))).not.toContain('<script data-sections-available>');
	});

	it.each(['<!-->', '<!--->'])('recognizes sections following the immediately closed comment %s', (comment) => {
		const html = `<head>%yesid.themeBoot%</head><body>${comment}<div data-sections-control></div><div data-section-bulk></div><div data-section-bulk></div></body>`;
		expect(injectThemeBoot(html)).toContain('<script data-sections-available>');
	});

	it.each([
		['plain', '<a', '<a'],
		['double-quoted', '<a"', '"<a"'],
		['single-quoted', "<a'", "'<a'"],
	])('bounds the %s unterminated-tag input', (_name, prefix, repetition) => {
		const input = '<head>%yesid.themeBoot%</head>' + prefix + repetition.repeat(100_000);
		const started = performance.now();
		const result = injectThemeBoot(input);
		expect(performance.now() - started).toBeLessThan(500);
		expect(result).toContain(`<script>${themeBootScript}</script>`);
	});

	it.each(['script', 'style', 'textarea', 'title'])('ignores marker text inside %s', (tag) => {
		const html = `<head>%yesid.themeBoot%</head><div data-sections-control></div><div data-section-bulk></div><${tag}><div data-section-bulk></div></${tag}>`;
		expect(injectThemeBoot(html)).not.toContain('<script data-sections-available>');
	});

	it('ignores comments, quoted values and repeated attributes when counting sections', () => {
		const html = `<head>%yesid.themeBoot%</head><div data-sections-control></div><div data-section-bulk data-section-bulk></div><!-- <div data-section-bulk></div> --><div title='<div data-section-bulk>'></div>`;
		expect(injectThemeBoot(html)).not.toContain('<script data-sections-available>');
	});
});
