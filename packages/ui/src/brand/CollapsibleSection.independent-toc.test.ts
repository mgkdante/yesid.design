import { render } from '@testing-library/svelte';
import { createRawSnippet, tick } from 'svelte';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import CollapsibleSection from './CollapsibleSection.svelte';
import TocNav from './TocNav.svelte';
import TocPill from './TocPill.svelte';
import { createSectionJump } from './section-jump.js';
import IndependentPanel from './test-fixtures/IndependentPanel.svelte';
import { sections } from '../state/sections.svelte.js';
import { openSection, openSectionContaining } from './sections-registry.js';

const entries = ['first', 'second'].map((id) => ({ id, title: id, level: 2, children: [] }));
const cleanups: (() => void)[] = [];
let observed: Element[];
let report: IntersectionObserverCallback;

beforeEach(() => {
	observed = [];
	vi.stubGlobal('IntersectionObserver', function (callback: IntersectionObserverCallback) {
		report = callback;
		return { observe: (target: Element) => observed.push(target), disconnect: vi.fn() };
	});
});
afterEach(() => {
	for (const stop of cleanups.splice(0)) stop();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

function intersect(target: Element) {
	expect(observed).toContain(target);
	const rect = target.getBoundingClientRect();
	report([{ target, isIntersecting: true, intersectionRatio: 1, boundingClientRect: rect, intersectionRect: rect, rootBounds: null, time: 0 }], {} as IntersectionObserver);
}

function page(contentEntries = entries, collapsible = true) {
	const children = createRawSnippet(() => ({ render: () => '<h3 id="nested-heading">Nested heading</h3>' }));
	render(CollapsibleSection, { props: { title: 'First', anchor: 'first', open: false, children } });
	render(CollapsibleSection, { props: { title: 'Second', anchor: 'second', open: false } });
	const panel = render(IndependentPanel, { props: { open: false, collapsible } });
	const jump = createSectionJump();
	const changed = vi.fn();
	cleanups.push(jump.register(contentEntries, { activeId: 'second', selector: 'h3, #filter-help', onActiveChange: changed }));
	return { jump, changed, panel };
}

it.each(['filters', 'filter-help'])('observing independent target %s preserves content activity and both TOC views', async (id) => {
	const { jump, changed, panel } = page();
	const nav = render(TocNav, { props: { entries, navigation: jump, heading: 'Contents' } });
	const pill = render(TocPill, { props: { entries, navigation: jump, openAria: 'Open contents', closeAria: 'Close contents' } });
	await tick();
	changed.mockClear();
	const target = panel.container.querySelector(id === 'filters' ? '[data-toc="filters"]' : '#filter-help')!;
	intersect(target);
	await tick();
	expect({ active: jump.activeId, counter: nav.container.querySelector('.toc-counter-text')?.textContent?.replace(/\s+/g, ' ').trim() }).toEqual({ active: 'second', counter: 'SEC 2 / 2' });
	expect(pill.container.querySelector('.toc-pill-name')?.textContent?.trim()).toBe('second');
	expect(pill.container.querySelector('.toc-pill-counter')?.textContent?.trim()).toBe('2/2');
	expect(changed).not.toHaveBeenCalled();
});

it.each(['filters', 'filter-help'])('jumping to independent target %s lands and reveals without replacing content activity', async (id) => {
	const { jump, changed, panel } = page();
	const nav = render(TocNav, { props: { entries, navigation: jump, heading: 'Contents' } });
	await tick();
	changed.mockClear();
	const target = panel.container.querySelector<HTMLElement>(id === 'filters' ? '[data-toc="filters"]' : '#filter-help')!;
	target.scrollIntoView = vi.fn();
	expect(await jump.jump(id)).toBe(true);
	expect(target.scrollIntoView).toHaveBeenCalledOnce();
	expect(panel.container.querySelector('[data-section-trigger]')?.getAttribute('aria-expanded')).toBe('true');
	expect(target.closest('[inert]')).toBeNull();
	expect({ active: jump.activeId, counter: nav.container.querySelector('.toc-counter-text')?.textContent?.replace(/\s+/g, ' ').trim() }).toEqual({ active: 'second', counter: 'SEC 2 / 2' });
	expect(changed).not.toHaveBeenCalled();
});

it.each(['filters', 'filter-help'])('keeps independent target %s activity available on pages with empty entries', async (id) => {
	const { jump, panel } = page([]);
	await tick();
	const target = panel.container.querySelector<HTMLElement>(id === 'filters' ? '[data-toc="filters"]' : '#filter-help')!;
	intersect(target);
	expect(jump.activeId).toBe(id);
	target.scrollIntoView = vi.fn();
	cleanups.push(jump.register([], { root: panel.container }));
	expect(jump.activeId).toBe('');
	expect(await jump.jump(id)).toBe(true);
	expect(jump.activeId).toBe(id);
});

it.each(['observation', 'jump'])('protects static independent panel activity and bound state through %s', async (action) => {
	const { jump, changed, panel } = page(entries, false);
	const nav = render(TocNav, { props: { entries, navigation: jump, heading: 'Contents' } });
	const pill = render(TocPill, { props: { entries, navigation: jump, openAria: 'Open contents', closeAria: 'Close contents' } });
	await tick();
	changed.mockClear();
	const target = panel.container.querySelector<HTMLElement>('[data-toc="filters"]')!;
	target.scrollIntoView = vi.fn();
	if (action === 'observation') intersect(target);
	else expect(await jump.jump('filters')).toBe(true);
	await tick();
	expect({ active: jump.activeId, counter: nav.container.querySelector('.toc-counter-text')?.textContent?.replace(/\s+/g, ' ').trim() }).toEqual({ active: 'second', counter: 'SEC 2 / 2' });
	expect(pill.container.querySelector('.toc-pill-name')?.textContent?.trim()).toBe('second');
	expect(pill.container.querySelector('.toc-pill-counter')?.textContent?.trim()).toBe('2/2');
	expect(changed).not.toHaveBeenCalled();
	if (action === 'jump') expect(target.scrollIntoView).toHaveBeenCalledOnce();
	expect(panel.getByTestId('panel-open').textContent).toBe('false');
	expect(sections.count).toBe(2);
	expect(sections.allCollapsed).toBe(true);
	expect(openSection('filters', panel.container)).toBe(true);
	expect(openSectionContaining(panel.container.querySelector('#filter-help')!)).toBe(true);
	sections.collapseAll();
	sections.expandAll();
	await tick();
	expect(panel.getByTestId('panel-open').textContent).toBe('false');
	expect(panel.container.querySelector('[data-section-trigger]')).toBeNull();
	expect(panel.container.querySelector('.section-body')?.getAttribute('data-state')).toBe('open');
	expect(target.closest('[inert]')).toBeNull();
});

it('keeps ordinary static cards unregistered and outside bulk actions', async () => {
	const panel = render(IndependentPanel, { props: { open: false, collapsible: false, independent: false } });
	await tick();
	expect(sections.count).toBe(0);
	expect(openSection('filters', panel.container)).toBe(false);
	expect(openSectionContaining(panel.container.querySelector('#filter-help')!)).toBe(false);
	sections.collapseAll();
	sections.expandAll();
	await tick();
	expect(panel.getByTestId('panel-open').textContent).toBe('false');
	expect(panel.container.querySelector('[data-section-trigger]')).toBeNull();
	expect(panel.container.querySelector('.section-body')?.getAttribute('data-state')).toBe('open');
});

it.each([true, false])('keeps unlisted ordinary nested headings and selector targets active (empty entries=%s)', async (empty) => {
	const extra = document.body.appendChild(document.createElement('h3'));
	extra.id = 'extra-heading';
	const { jump } = page(empty ? [] : entries);
	for (const id of ['nested-heading', 'extra-heading']) {
		const target = document.getElementById(id)!;
		await tick();
		intersect(target);
		expect(jump.activeId).toBe(id);
		cleanups.push(jump.register(empty ? [] : entries, { activeId: 'second', selector: 'h3' }));
		target.scrollIntoView = vi.fn();
		expect(await jump.jump(id)).toBe(true);
		expect(jump.activeId).toBe(id);
	}
	extra.remove();
});
