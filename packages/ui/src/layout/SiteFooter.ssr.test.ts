// @vitest-environment node
import { render } from 'svelte/server';
import { expect, it, vi } from 'vitest';
// The testing plugin resolves the client entry; server onMount is a no-op.
vi.mock('svelte', async (original) => ({ ...await original<object>(), onMount: () => {} }));
import SiteFooter from './test-fixtures/SiteFooterSsr.svelte';
const props = {};
it('omits empty status markup in server output', () => {
	const { body } = render(SiteFooter, { props });
	expect(body).not.toContain('status-dot');
	expect(body).not.toContain('footer-status-border');
	expect(body).not.toMatch(/\d{4}\.\d{2}\.\d{2}/);
});
it('preserves the supplied status on the server', () => {
	vi.useFakeTimers();
	try {
		vi.setSystemTime(new Date(2026, 6, 30, 12));
		const { body } = render(SiteFooter, { props: { ...props, statusPrefix: 'SYSTEM', liveLabel: 'Live' } });
		expect(body).toContain('status-dot');
		expect(body).toContain('Live');
		expect(body).toContain('SYSTEM');
		expect(body).toContain('2026.07.30');
	} finally { vi.useRealTimers(); }
});
