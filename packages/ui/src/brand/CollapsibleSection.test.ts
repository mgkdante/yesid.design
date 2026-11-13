import { fireEvent, render } from '@testing-library/svelte';
import { createRawSnippet, tick } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { sections } from '../state/sections.svelte.js';
import CollapsibleSection, { type CollapsibleSectionProps } from './CollapsibleSection.svelte';
import { openSection } from './sections-registry.js';
import Bound from './test-fixtures/CollapsibleSectionBound.svelte';

type View = { container: HTMLElement };
type Props = Partial<CollapsibleSectionProps>;

const children = createRawSnippet(() => ({
	render: () => `<div>
		<p data-testid="prose">Plain prose</p>
		<button type="button" data-testid="button">Action</button>
		<span role="button" tabindex="0" data-testid="role-button">Faux button</span>
		<a href="/lines" data-testid="link">Link</a>
		<div data-card-interactive><span data-testid="boundary">Chart mark</span></div>
		<div data-slot="card"><p data-testid="nested-card">Nested</p></div>
	</div>`,
}));

const section = (props: Props = {}) => render(CollapsibleSection, { props: { title: 'Section', children, ...props } });
const query = <T extends Element>({ container }: View, selector: string) => container.querySelector<T>(selector)!;
const trigger = (view: View) => query<HTMLButtonElement>(view, '[data-section-trigger]');
const content = (view: View) => query(view, '.section-body');
const isOpen = (view: View) => trigger(view).getAttribute('aria-expanded') === 'true';
const boundText = (view: View) => query(view, '[data-testid="bound"]').textContent;
const click = fireEvent.click;
const setCollapsed = async (collapsed: boolean) => {
	collapsed ? sections.collapseAll() : sections.expandAll();
	await tick();
};

afterEach(() => {
	sections.expandAll();
	sessionStorage.clear();
	window.getSelection()?.removeAllRanges();
});

describe('disclosure', () => {
	it('keeps the closed body mounted, inert and hidden, with its control target', async () => {
		const view = section();
		const prose = view.getByTestId('prose');
		expect(trigger(view).getAttribute('aria-controls')).toBe(content(view).id);

		await click(trigger(view));
		expect(content(view).hasAttribute('inert')).toBe(true);
		expect(content(view).getAttribute('aria-hidden')).toBe('true');
		expect(view.container.contains(prose)).toBe(true);

		await click(trigger(view));
		expect(content(view).hasAttribute('inert') || content(view).hasAttribute('aria-hidden')).toBe(false);
		expect(view.getByTestId('prose')).toBe(prose);
	});

	it('follows the open prop and gives simultaneous sections distinct control targets', async () => {
		const [first, second] = [section({ open: false }), section()];
		expect(isOpen(first)).toBe(false);
		await first.rerender({ open: true });
		expect(isOpen(first)).toBe(true);
		expect(content(first).id).not.toBe(content(second).id);
	});

	it('shows a zero-padded index or an icon, the toc anchor and the accent', () => {
		const icon = createRawSnippet(() => ({ render: () => '<svg data-testid="icon"></svg>' }));
		const indexed = section({ index: 0, anchor: 'overview', accentColor: 'var(--accent-text)' });
		const card = query<HTMLElement>(indexed, '[data-slot="card"]');
		expect(query(indexed, '[data-slot="badge"]').textContent?.trim()).toBe('01');
		expect(card.getAttribute('data-toc')).toBe('overview');
		expect(card.style.getPropertyValue('--accent')).toBe('var(--accent-text)');
		expect(section({ icon }).getByTestId('icon')).toBeInTheDocument();
	});

	it('is a static, always-open card with collapsible={false}', async () => {
		sections.collapseAll();
		const view = section({ collapsible: false });
		expect(view.container.querySelector('[data-section-trigger]')).toBeNull();
		await click(view.getByTestId('prose'));
		expect(content(view).getAttribute('data-state')).toBe('open');
	});


});

describe('heading-only toggling', () => {
	it('leaves prose and the bare card open, and toggles exactly once from the heading', async () => {
		const view = section();
		await click(view.getByTestId('prose'));
		expect(isOpen(view)).toBe(true);
		await click(query(view, '[data-slot="card"]'));
		expect(isOpen(view)).toBe(true);
		await click(trigger(view));
		expect(isOpen(view)).toBe(false);
	});

	it('leaves the body open after a touch and its synthesized click', async () => {
		const view = section();
		await fireEvent.touchStart(view.getByTestId('prose'));
		await fireEvent.touchEnd(view.getByTestId('prose'));
		await click(view.getByTestId('prose'));
		expect(isOpen(view)).toBe(true);
	});

	it.each(['button', 'role-button', 'link', 'boundary', 'nested-card'])(
		'leaves the section alone when %s owns the click',
		async (testId) => {
			const view = section();
			await click(view.getByTestId(testId));
			expect(isOpen(view)).toBe(true);
		},
	);

	it('does not toggle when a click finishes selecting text', async () => {
		const view = section();
		const range = document.createRange();
		range.selectNodeContents(view.getByTestId('prose'));
		window.getSelection()!.addRange(range);
		await click(view.getByTestId('prose'));
		expect(isOpen(view)).toBe(true);
	});
});

describe('article-summary header', () => {
	const props: Props = { headerVariant: 'article-summary', subtitle: 'What riders saw.' };

	it('puts the trigger alone in the h2, described by its own subtitle', async () => {
		const [view, other] = [section(props), section(props)];
		const subtitle = query(view, '.section-subtitle--article-summary');
		const heading = query(view, 'h2.section-heading');
		expect([heading.childElementCount, heading.firstElementChild]).toEqual([1, trigger(view)]);
		expect(trigger(view).getAttribute('aria-describedby')).toBe(subtitle.id);
		expect(subtitle.id).not.toBe(query(other, '.section-subtitle--article-summary').id);

		await click(trigger(view));
		expect(subtitle.textContent?.trim()).toBe('What riders saw.');
		expect(subtitle.getAttribute('data-state')).toBe('closed');
		await click(trigger(view));
		expect(subtitle.getAttribute('data-state')).toBe('open');
	});

	it('leaves a title-only summary undescribed', () => {
		const view = section({ headerVariant: 'article-summary' });
		expect(trigger(view).hasAttribute('aria-describedby')).toBe(false);
	});

	it('keeps header actions outside the trigger and lets the far chevron toggle', async () => {
		const headerActions = createRawSnippet(() => ({
			render: () => '<button type="button" data-testid="action">Inspect</button>',
		}));
		const view = section({ ...props, headerActions });
		expect(trigger(view).contains(view.getByTestId('action'))).toBe(false);
		await click(view.getByTestId('action'));
		expect(isOpen(view)).toBe(true);
		await click(query(view, '.section-header__chevron'));
		expect(isOpen(view)).toBe(false);
	});
});

describe('focus', () => {
	it('returns to the trigger when a collapse hides the focused child, and not from outside', async () => {
		const view = section();
		view.getByTestId('link').focus();
		await view.rerender({ open: false });
		expect(document.activeElement).toBe(trigger(view));

		await view.rerender({ open: true });
		const outside = document.body.appendChild(document.createElement('button'));
		outside.focus();
		await view.rerender({ open: false });
		expect(document.activeElement).toBe(outside);
	});
});

describe('page disclosure controls', () => {
	it('ignores old stored state and starts at the declared default on every mount', async () => {
		sessionStorage.setItem('persisted:reader', 'false');
		const first = section();
		await click(trigger(first));
		first.unmount();
		expect(isOpen(section())).toBe(true);
		expect(isOpen(section({ open: false }))).toBe(false);
		expect(sessionStorage.getItem('persisted:reader')).toBe('false');
	});
	it('bulk actions reach bound sections and new sections keep their defaults', async () => {
		const view = render(Bound);
		await setCollapsed(true);
		expect(boundText(view)).toBe('false');
		expect(isOpen(section())).toBe(true);
		await setCollapsed(false);
		expect(boundText(view)).toBe('true');
	});
	it('opens by anchor, unregisters on unmount and follows anchor changes', async () => {
		const view = section({ anchor: 'intro', open: false });
		expect(openSection('missing')).toBe(false);
		expect(openSection('intro')).toBe(true);
		await tick();
		expect(isOpen(view)).toBe(true);
		await view.rerender({ anchor: 'other', open: false });
		expect(openSection('intro')).toBe(false);
		expect(openSection('other')).toBe(true);
		await tick();
		expect(isOpen(view)).toBe(true);
		view.unmount();
		expect(openSection('other')).toBe(false);
	});
	it('opens every copy of an anchor and safely unregisters one copy', async () => {
		const first = section({ anchor: 'same', open: false });
		const second = section({ anchor: 'same', open: false });
		first.unmount();
		expect(openSection('same')).toBe(true);
		await tick();
		expect(isOpen(second)).toBe(true);
	});
	it('opens only when openSignal changes', async () => {
		const view = section({ open: false });
		await view.rerender({ openSignal: 1 });
		expect(isOpen(view)).toBe(true);
		await click(trigger(view));
		await view.rerender({ openSignal: 1 });
		expect(isOpen(view)).toBe(false);
	});
});

describe('persistent summary', () => {
	it.each(['default', 'article-summary'] as const)('keeps the %s summary outside the body and button in both states', async (headerVariant) => {
		const summary = createRawSnippet(() => ({ render: () => '<p>Finding, period and material caveat.</p>' }));
		const view = section({ headerVariant, subtitle: 'Short label', summary });
		const finding = view.getByText('Finding, period and material caveat.');
		const described = trigger(view).getAttribute('aria-describedby')!.split(' ');
		expect(described.some(id => document.getElementById(id)?.contains(finding))).toBe(true);
		for (const open of [true, false, true]) {
			if (isOpen(view) !== open) await click(trigger(view));
			expect(content(view).contains(finding)).toBe(false);
			expect(trigger(view).contains(finding)).toBe(false);
			expect(finding.closest('[inert], [aria-hidden="true"]')).toBeNull();
		}
	});
});
