import { fireEvent, render, within } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import FilterGroup, { type FilterGroupProps } from './FilterGroup.svelte';
import FilterSection from './FilterSection.svelte';
import domBaseline from './test-fixtures/FilterGroup.dom.json';

const items = [
	{ key: 'lines', label: 'Lines' },
	{ key: 'stops', label: 'Stops' },
];

const group = (props: Partial<FilterGroupProps> = {}) =>
	render(FilterGroup, { props: { label: 'Affects', items, allLabel: 'All', onSelect: vi.fn(), ...props } });
type View = ReturnType<typeof group>;

const radio = (view: View, name: string) => within(view.container).getByRole('radio', { name });
const checked = (view: View, name: string) => radio(view, name).getAttribute('aria-checked');
const header = (view: View) => within(view.container).getByRole('button', { name: /Affects/ });
const body = (view: View) => view.container.querySelector<HTMLElement>(`#${CSS.escape(header(view).getAttribute('aria-controls')!)}`)!;
const click = fireEvent.click;

afterEach(() => sessionStorage.clear());

describe('FilterGroup', () => {
	it.each(['compact', 'spacious'] as const)('preserves the rendered DOM contract at %s density', (density) => {
		const view = group({ density, activeKey: 'stops', testIdPrefix: 'affects', collapsible: true });
		const copy = view.container.cloneNode(true) as HTMLElement;
		const ids = new Map(Array.from(copy.querySelectorAll('[id]'), (element, index) => [element.id, `stable-${index}`]));
		for (const element of copy.querySelectorAll('*')) {
			for (const attribute of ['id', 'aria-labelledby', 'aria-controls']) {
				const value = element.getAttribute(attribute);
				if (value && ids.has(value)) element.setAttribute(attribute, ids.get(value)!);
			}
			if (element.hasAttribute('class')) element.setAttribute('class', element.className.split(' ').filter((token) => !token.startsWith('svelte-')).join(' '));
			const attributes = Array.from(element.attributes, ({ name, value }) => [name, value] as const).sort(([a], [b]) => a.localeCompare(b));
			for (const attribute of Array.from(element.attributes)) element.removeAttribute(attribute.name);
			for (const [name, value] of attributes) element.setAttribute(name, value);
		}
		const walker = document.createTreeWalker(copy, NodeFilter.SHOW_COMMENT);
		const comments: Node[] = [];
		while (walker.nextNode()) comments.push(walker.currentNode);
		for (const comment of comments) comment.parentNode?.removeChild(comment);
		expect(copy.innerHTML.replace(/>\s+</g, '><')).toBe(domBaseline[density]);
	});

	it('keeps vertical roving focus, keyboard selection and external selection updates', async () => {
		const onSelect = vi.fn();
		const view = group({ activeKey: 'lines', onSelect });
		const lines = radio(view, 'Lines');
		const stops = radio(view, 'Stops');
		lines.focus();
		await fireEvent.keyDown(lines, { key: 'ArrowDown' });
		expect(document.activeElement).toBe(stops);
		expect(onSelect).not.toHaveBeenCalled();
		await fireEvent.keyDown(stops, { key: ' ' });
		expect(onSelect).toHaveBeenLastCalledWith('stops');
		await view.rerender({ activeKey: 'stops' });
		expect(checked(view, 'Stops')).toBe('true');
		await fireEvent.keyDown(stops, { key: 'Home' });
		expect(document.activeElement).toBe(radio(view, 'All'));
		await fireEvent.keyDown(radio(view, 'All'), { key: 'Enter' });
		expect(onSelect).toHaveBeenLastCalledWith(null);
	});
	it('renders the label, the supplied allLabel and one radio per item', () => {
		const view = group({ allLabel: 'Any' });
		const radios = within(view.getByRole('group', { name: 'Affects' })).getAllByRole('radio');
		expect(radios.map((r) => r.textContent?.trim())).toEqual(['Any', 'Lines', 'Stops']);
		expect(view.getByText('Affects')).toBeInTheDocument();
	});

	it('reads the selection from activeKey, with null meaning the reset', () => {
		const view = group({ activeKey: 'stops' });
		expect(['All', 'Lines', 'Stops'].map((name) => checked(view, name))).toEqual(['false', 'false', 'true']);
		expect(radio(view, 'Stops').classList).toContain('tag-active');
		expect(radio(view, 'Lines').classList).not.toContain('tag-active');

		view.unmount();
		const reset = group();
		expect(['All', 'Lines', 'Stops'].map((name) => checked(reset, name))).toEqual(['true', 'false', 'false']);
		expect(radio(reset, 'All').classList).toContain('active');
	});

	it('calls onSelect with the item key, or null for the reset', async () => {
		const onSelect = vi.fn();
		const view = group({ activeKey: 'lines', onSelect });
		await click(radio(view, 'Stops'));
		expect(onSelect).toHaveBeenLastCalledWith('stops');
		await click(radio(view, 'All'));
		expect(onSelect).toHaveBeenLastCalledWith(null);
	});

	it('clears the selection on a repeat click unless allowDeselect is false', async () => {
		const [cleared, kept] = [vi.fn(), vi.fn()];
		await click(radio(group({ activeKey: 'stops', onSelect: cleared }), 'Stops'));
		expect(cleared).toHaveBeenCalledExactlyOnceWith(null);

		await click(radio(group({ activeKey: 'stops', allowDeselect: false, onSelect: kept }), 'Stops'));
		expect(kept).not.toHaveBeenCalled();
	});

	it('puts a test id on each item button when given a prefix', () => {
		const view = group({ testIdPrefix: 'affects' });
		expect(view.getByTestId('affects-lines').textContent?.trim()).toBe('Lines');
		expect(view.getByTestId('affects-stops').textContent?.trim()).toBe('Stops');
	});

	it('has a compact density by default and a spacious one on request', () => {
		const [compact, spacious] = [group(), group({ density: 'spacious' })];
		expect(compact.container.firstElementChild?.getAttribute('data-density')).toBe('compact');
		expect(radio(compact, 'Lines').classList).toContain('text-sm');
		expect(spacious.container.firstElementChild?.getAttribute('data-density')).toBe('spacious');
		expect(radio(spacious, 'Lines').classList).toContain('text-base');
	});
});

describe('FilterGroup collapsible', () => {
	it('shows no toggle unless collapsible', () => {
		expect(group().queryByRole('button', { name: /Affects/ })).toBeNull();
	});

	it('hides a closed body from assistive technology and opens it from the header', async () => {
		const view = group({ collapsible: true, startOpen: false });
		expect(header(view).getAttribute('aria-expanded')).toBe('false');
		expect(body(view).hasAttribute('inert')).toBe(true);
		expect(body(view).getAttribute('aria-hidden')).toBe('true');
		expect(within(body(view)).getAllByRole('radio', { hidden: true })).toHaveLength(3);

		await click(header(view));
		expect(header(view).getAttribute('aria-expanded')).toBe('true');
		expect(body(view).hasAttribute('inert')).toBe(false);
		expect(body(view).hasAttribute('aria-hidden')).toBe(false);
		expect(within(body(view)).getAllByRole('radio')).toHaveLength(3);
	});

	it('starts at its declared default on every mount', async () => {
		const first = group({ collapsible: true });
		expect(header(first).getAttribute('aria-expanded')).toBe('true');
		await click(header(first));
		first.unmount();
		expect(header(group({ collapsible: true })).getAttribute('aria-expanded')).toBe('true');
	});
});

describe('FilterSection', () => {
	it('renders its children inside the listing filter section', () => {
		const children = createRawSnippet(() => ({ render: () => '<div data-testid="filter-groups">Filter groups</div>' }));
		const view = render(FilterSection, { props: { children } });
		const section = view.container.querySelector('[data-slot="listing-filter-section"]')!;
		expect(section.contains(view.getByTestId('filter-groups'))).toBe(true);
	});
});
