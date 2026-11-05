import { fireEvent, render, within } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, expect, it, vi } from 'vitest';
import SectionsToggle from './SectionsToggle.svelte';
import CollapsibleSection from './CollapsibleSection.svelte';
import FilterGroup from './FilterGroup.svelte';
import TocNav from './TocNav.svelte';
import ListingFrame from '../layout/test-fixtures/ListingFrameSsr.svelte';
import { sections } from '../state/sections.svelte.js';

const copy = { collapse: 'Collapse all', expand: 'Expand all', collapseTitle: 'Collapse every section', expandTitle: 'Expand every section' };
afterEach(() => sections.expandAll());

it('renders one control and delegates a controlled action', async () => {
	render(CollapsibleSection, { props: { title: 'First' } });
	render(CollapsibleSection, { props: { title: 'Second' } });
	const onToggle = vi.fn();
	const view = render(SectionsToggle, { props: { copy, collapsed: false, onToggle, activeEffect: 'glow', class: 'consumer' } });
	expect(within(view.container).getAllByRole('button')).toHaveLength(1);
	const button = view.getByRole('button', { name: copy.collapse });
	expect(button.getAttribute('title')).toBe(copy.collapseTitle);
	await fireEvent.click(button);
	expect(onToggle).toHaveBeenCalledOnce();
	await view.rerender({ collapsed: true });
	expect(view.getByRole('button', { name: copy.expand }).getAttribute('title')).toBe(copy.expandTitle);
	expect(view.container.firstElementChild?.classList.contains('consumer')).toBe(true);
	expect(view.container.firstElementChild?.classList.contains('sections-controls--glow')).toBe(true);
});

it('collapses and expands every mounted section, and reflects individual section changes', async () => {
	localStorage.setItem('quiet-mode', 'true');
	const toc = render(TocNav, { props: { entries: [], activeId: '', heading: 'Contents', onNavigate: () => {} } });
	const tocToggle = within(toc.container).getByRole('button', { name: 'Contents' });
	const filters = render(FilterGroup, { props: { label: 'Kinds', items: [], allLabel: 'All', collapsible: true, onSelect: () => {} } });
	const listing = render(ListingFrame);
	const filterToggle = within(filters.container).getByRole('button', { name: 'Kinds' });
	const listingToggle = within(listing.container).getByRole('button', { name: 'Filters' });
	const first = render(CollapsibleSection, { props: { title: 'First' } });
	const second = render(CollapsibleSection, { props: { title: 'Second', open: false } });
	const view = render(SectionsToggle, { props: { copy } });
	const firstToggle = within(first.container).getByRole('button');
	const secondToggle = within(second.container).getByRole('button');
	await fireEvent.click(view.getByRole('button', { name: copy.collapse }));
	expect(firstToggle.getAttribute('aria-expanded')).toBe('false');
	expect(secondToggle.getAttribute('aria-expanded')).toBe('false');
	expect(tocToggle.getAttribute('aria-expanded')).toBe('true');
	expect(view.getByRole('button', { name: copy.expand })).toBeTruthy();
	await fireEvent.click(view.getByRole('button', { name: copy.expand }));
	expect(firstToggle.getAttribute('aria-expanded')).toBe('true');
	expect(secondToggle.getAttribute('aria-expanded')).toBe('true');
	await fireEvent.click(firstToggle);
	await fireEvent.click(secondToggle);
	await tick();
	expect(view.getByRole('button', { name: copy.expand })).toBeTruthy();
	expect(filterToggle.getAttribute('aria-expanded')).toBe('true');
	expect(listingToggle.getAttribute('aria-expanded')).toBe('false');
	expect(localStorage.getItem('quiet-mode')).toBe('true');
	localStorage.clear();
});

it('hides with zero or one section and reacts to mounts and unmounts', async () => {
 render(TocNav, { props: { entries: [], activeId: '', heading: 'Contents', onNavigate: () => {} } });
 const view = render(SectionsToggle, { props: { copy } });
 expect(view.container.querySelector('[data-sections-control]')?.hasAttribute('data-sections-hidden')).toBe(true);
 const first = render(CollapsibleSection, { props: { title: 'First' } });
 render(CollapsibleSection, { props: { title: 'Static', collapsible: false } });
 await tick();
 expect(view.container.querySelector('[data-sections-control]')?.hasAttribute('data-sections-hidden')).toBe(true);
 const second = render(CollapsibleSection, { props: { title: 'Second' } });
 await tick();
 expect(within(view.container).getByRole('button', { name: copy.collapse })).toBeTruthy();
 second.unmount();
 await tick();
 expect(view.container.querySelector('[data-sections-control]')?.hasAttribute('data-sections-hidden')).toBe(true);
 first.unmount();
});
