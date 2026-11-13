// @vitest-environment node
import { render } from 'svelte/server';
import { expect, it, vi } from 'vitest';
// The testing plugin resolves the client entry; server onMount is a no-op.
vi.mock('svelte', async (original) => ({ ...await original<object>(), onMount: () => {} }));
import TerminalPanel from './test-fixtures/TerminalPanelSsr.svelte';

it('server output makes no status claim by default', () => {
	const { body } = render(TerminalPanel, { props: { title: 'Archive' } });
	expect(body).not.toMatch(/status-dot|terminal-signal|led-pulse/);
});
it.each(['orange', 'green', 'caution', 'stop', 'lunar', 'early', 'on_time', 'late', 'severe', 'unknown'] as const)(
	'server output names the supplied %s lamp without starting motion', (color) => {
		const { body } = render(TerminalPanel, { props: {
			title: 'Archive', signal: { color, label: 'Measured state', live: true },
		} });
		expect(body).toContain('data-slot="status-dot"');
		expect(body).toContain('Measured state');
		expect(body).not.toContain('led-pulse');
	},
);
