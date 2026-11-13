import { render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi, afterEach } from 'vitest';
import TerminalPanel from './TerminalPanel.svelte';

const children = createRawSnippet(() => ({ render: () => '<p>Result set</p>' }));
afterEach(() => vi.restoreAllMocks());

describe('TerminalPanel', () => {
	it('makes no status claim by default', () => {
		const { container } = render(TerminalPanel, { props: { title: 'Archive', children } });
		expect(container.querySelector('[data-slot="status-dot"], .terminal-signal, .led-pulse')).toBeNull();
	});

	it.each(['orange', 'green', 'caution', 'stop', 'lunar', 'early', 'on_time', 'late', 'severe', 'unknown'] as const)(
		'names an explicitly supplied %s signal without pulsing', (color) => {
			const { container } = render(TerminalPanel, { props: {
				title: 'Archive', children, signal: { color, label: 'Measured state' },
			} });
			const token = { orange: 'primary', green: 'signal-proceed', caution: 'signal-caution', stop: 'signal-stop', lunar: 'signal-lunar', early: 'dataviz-status-early', on_time: 'dataviz-status-on-time', late: 'dataviz-status-late', severe: 'dataviz-status-severe', unknown: 'dataviz-status-unknown' }[color];
			expect(container.querySelector('[data-slot="status-dot"]')?.className).toContain(token);
			expect(screen.getByText('Measured state')).toBeInTheDocument();
			expect(container.querySelector('[data-slot="status-dot"]')?.getAttribute('aria-hidden')).toBeNull();
			expect(container.querySelector('.led-pulse')).toBeNull();
		},
	);

	it.each([false, true])('gates a live pulse when reduced motion is %s', (reduced) => {
		vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
			matches: reduced && query === '(prefers-reduced-motion: reduce)',
			media: query, onchange: null, addListener() {}, removeListener() {},
			addEventListener() {}, removeEventListener() {}, dispatchEvent: () => true,
		}));
		const { container } = render(TerminalPanel, { props: {
			title: 'Stream', children, signal: { color: 'green', label: 'Live feed', live: true },
		} });
		expect(Boolean(container.querySelector('.led-pulse'))).toBe(!reduced);
	});

	it('shows its readouts, children and actions and forwards root attributes', () => {
		const footer = [{ label: 'Rows', value: '42' }, { label: 'Time', value: '8 ms' }];
		render(TerminalPanel, { props: {
			title: 'Query console', tag: 'SQL', status: 'Ready', footer,
			children: createRawSnippet(() => ({ render: () => '<p>Result set</p>' })),
			actions: createRawSnippet(() => ({ render: () => '<button type="button">Copy</button>' })),
			'data-testid': 'panel',
		} });
		for (const text of ['Query console', 'SQL', 'Ready', 'Result set', ...footer.flatMap(({ label, value }) => [label, value])]) {
			expect(screen.getByText(text)).toBeInTheDocument();
		}
		expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
		expect(screen.getByTestId('panel').contains(screen.getByText('Query console'))).toBe(true);
	});

	it('needs only a title and children', () => {
		render(TerminalPanel, { props: {
			title: 'Query console',
			children: createRawSnippet(() => ({ render: () => '<p>Result set</p>' })),
		} });
		expect(screen.getByText('Query console')).toBeInTheDocument();
		expect(screen.getByText('Result set')).toBeInTheDocument();
		for (const text of ['SQL', 'Ready', 'Rows', '42', 'Time', '8 ms']) expect(screen.queryByText(text)).toBeNull();
		expect(screen.queryByRole('button')).toBeNull();
	});
});
