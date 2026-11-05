import { fireEvent, render, within } from '@testing-library/svelte';
import { createRawSnippet, tick } from 'svelte';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { sections } from '../state/sections.svelte.js';
import CollapsibleSection from './CollapsibleSection.svelte';
import SectionsToggle from './SectionsToggle.svelte';
import { createSectionJump } from './section-jump.js';
import IndependentPanel from './test-fixtures/IndependentPanel.svelte';

const copy = { collapse: 'Collapse all', expand: 'Expand all', collapseTitle: 'Collapse content', expandTitle: 'Expand content' };
const contentSection = (title: string, open: boolean) => render(CollapsibleSection, { props: { title, open } });
const expanded = (view: { container: HTMLElement }) => view.container.querySelector('[data-section-trigger]')?.getAttribute('aria-expanded');
afterEach(() => vi.restoreAllMocks());
beforeEach(() => {
	localStorage.clear();
	delete document.documentElement.dataset.sectionsChoice;
});

it.each([true, false])('bulk actions leave the caller-owned panel state alone (open=%s)', async (open) => {
	const first = contentSection('First', true);
	const second = contentSection('Second', false);
	const panel = render(IndependentPanel, { props: { open } });
	const control = render(SectionsToggle, { props: { copy } });
	const controls = within(control.container);
	const panelQueries = within(panel.container);
	await fireEvent.click(controls.getByRole('button', { name: copy.collapse }));
	expect([expanded(first), expanded(second), expanded(panel)]).toEqual(['false', 'false', String(open)]);
	expect(panelQueries.getByTestId('panel-open').textContent).toBe(String(open));
	expect(sections.allCollapsed).toBe(true);
	await fireEvent.click(controls.getByRole('button', { name: copy.expand }));
	expect([expanded(first), expanded(second), expanded(panel)]).toEqual(['true', 'true', String(open)]);
	expect(sections.count).toBe(2);
	await fireEvent.click(panelQueries.getByRole('button', { name: 'Caller toggle' }));
	expect(expanded(panel)).toBe(String(!open));
	await fireEvent.click(panelQueries.getByRole('button', { name: 'Filters' }));
	expect(panelQueries.getByTestId('panel-open').textContent).toBe(String(open));
});

it('does not count an independent panel toward the threshold or all-closed calculation', async () => {
	const panel = render(IndependentPanel);
	const control = render(SectionsToggle, { props: { copy } });
	expect(sections.count).toBe(0);
	expect(sections.allCollapsed).toBe(false);
	contentSection('First', false);
	await tick();
	expect(sections.count).toBe(1);
	expect(sections.allCollapsed).toBe(true);
	expect(control.container.querySelector('[data-sections-control]')?.hasAttribute('data-sections-hidden')).toBe(true);
	const second = contentSection('Second', false);
	await tick();
	expect(within(control.container).getByRole('button', { name: copy.expand })).toBeTruthy();
	await fireEvent.click(within(panel.container).getByRole('button', { name: 'Filters' }));
	expect(sections.allCollapsed).toBe(true);
	await fireEvent.click(within(second.container).getByRole('button'));
	expect(within(control.container).getByRole('button', { name: copy.collapse })).toBeTruthy();
	second.unmount();
	await tick();
	expect(control.container.querySelector('[data-sections-control]')?.hasAttribute('data-sections-hidden')).toBe(true);
});

it('updates bulk membership when independence changes and removes it on unmount', async () => {
	const view = render(CollapsibleSection, { props: { title: 'Panel', independent: true } });
	expect(sections.count).toBe(0);
	await view.rerender({ independent: false });
	expect(sections.count).toBe(1);
	await view.rerender({ independent: true });
	sections.collapseAll();
	await tick();
	expect(expanded(view)).toBe('true');
	view.unmount();
	expect(sections.count).toBe(0);
});

it.each(['default', 'article-summary'] as const)('keeps equivalent DOM and classes for the %s header', async (headerVariant) => {
	const children = createRawSnippet(() => ({ render: () => '<p>Panel content</p>' }));
	const props = { title: 'Panel', subtitle: 'Description', anchor: 'panel', index: 1, headerVariant, children };
	const normal = render(CollapsibleSection, { props });
	const independent = render(CollapsibleSection, { props: { ...props, independent: true } });
	const markup = (container: HTMLElement) => container.innerHTML.replace(/ data-section-bulk=""/g, '').replace(/id="[^"]*"|aria-controls="[^"]*"|aria-describedby="[^"]*"/g, (attribute) => attribute.split('=')[0] + '="generated"');
	expect(markup(independent.container)).toBe(markup(normal.container));
	await fireEvent.click(within(normal.container).getByRole('button'));
	await fireEvent.click(within(independent.container).getByRole('button'));
	expect(markup(independent.container)).toBe(markup(normal.container));
});

it.each(['filters', 'filter-help'])('explicit jumps reveal the independent panel for %s without opening content siblings', async (id) => {
	const sibling = contentSection('Content', false);
	const panel = render(IndependentPanel, { props: { open: false } });
	const target = panel.container.querySelector<HTMLElement>(id === 'filters' ? '[data-toc="filters"]' : '#filter-help')!;
	target.scrollIntoView = vi.fn();
	const jump = createSectionJump();
	const stop = jump.register([], { root: panel.container });
	try {
		expect(await jump.jump(id)).toBe(true);
		expect(expanded(panel)).toBe('true');
		expect(target.closest('[inert]')).toBeNull();
		expect(target.scrollIntoView).toHaveBeenCalledOnce();
		expect(expanded(sibling)).toBe('false');
		expect(sections.count).toBe(1);
		expect(sections.allCollapsed).toBe(true);
	} finally {
		stop();
	}
});

it('starts from the caller default on remount without storing disclosure state', async () => {
	const local = vi.spyOn(localStorage, 'setItem');
	const session = vi.spyOn(sessionStorage, 'setItem');
	const first = render(IndependentPanel);
	await fireEvent.click(within(first.container).getByRole('button', { name: 'Filters' }));
	expect(expanded(first)).toBe('false');
	first.unmount();
	expect(expanded(render(IndependentPanel))).toBe('true');
	expect(local).not.toHaveBeenCalled();
	expect(session).not.toHaveBeenCalled();
});
