// @vitest-environment node
import { render } from 'svelte/server';
import { expect, it } from 'vitest';
import Fixture from './test-fixtures/CollapsibleSectionSsr.svelte';
import CollapsibleSection from './CollapsibleSection.svelte';

it('keeps a static card open in the boot geometry even if its bound open value is false', () => {
	const { body } = render(CollapsibleSection, { props: { title: 'Static', collapsible: false, open: false } });
	expect(body).toContain('data-section-default="open"');
	expect(body).not.toContain('data-section-bulk');
});

it.each([
	[undefined, true],
	[true, true],
	[false, true],
])('CollapsibleSection server markup includes the complete body when open=%s', (open, expanded) => {
	const { body } = render(Fixture, { props: { open } });
	const content = body.match(/<div[^>]*data-slot="collapsible-content"[^>]*>/)?.[0] ?? '';

	expect(body).toContain('Complete methodology source');
	expect(body).toContain(`aria-expanded="${expanded}"`);
	expect(content).toContain(`data-state="${expanded ? 'open' : 'closed'}"`);
	expect([content.includes('inert'), content.includes('aria-hidden="true"')]).toEqual([!expanded, !expanded]);
});
