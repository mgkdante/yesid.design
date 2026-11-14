import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import { buttonVariants } from './button/button.svelte';
import { badgeVariants } from './badge/badge.svelte';
import { tabsListVariants } from './tabs/tabs-list.svelte';
import { sheetVariants } from './sheet/sheet-content.svelte';
import TabsClassFixture from './tabs/test-fixtures/TabsClassFixture.svelte';

const families = { button: buttonVariants, badge: badgeVariants, tabs: tabsListVariants, sheet: sheetVariants };
const evidenceUrl = resolve('../../docs/evidence/deepen-primitive-classes.json');
type Row = { family: keyof typeof families; props: Record<string, string>; before: string; after: string; removed: string[] };

function combinations(variants: Record<string, Record<string, unknown>>): Record<string, string>[] {
	return Object.entries(variants).reduce<Record<string, string>[]>((rows, [key, values]) =>
		rows.flatMap((row) => Object.keys(values).map((value) => ({ ...row, [key]: value }))), [{}]);
}

it('preserves every retained computed class string except the enumerated unused selectors', () => {
	const baseline = JSON.parse(readFileSync(evidenceUrl, 'utf8')) as Row[];
	for (const [family, variants] of Object.entries(families)) {
		for (const props of [{}, ...combinations(variants.variants)]) {
			const row = baseline.find((row) => row.family === family && JSON.stringify(row.props) === JSON.stringify(props));
			expect(row, `${family} ${JSON.stringify(props)} has a baseline`).toBeDefined();
			const expected = row!.before.split(' ').filter((token) => !/^(?:has-data-\[icon=inline-|in-data-\[slot=button-group\]|(?:dark:)?aria-invalid:)/.test(token)).join(' ');
			expect(row!.after).toBe(expected);
			// Keep the historical cleanup evidence; Button now inherits the base focus outline and names its transitions explicitly.
			const retiredButtonFocus = ['outline-none', 'focus-visible:border-ring', 'focus-visible:ring-ring/50', 'focus-visible:ring-3'];
			const current = family === 'button'
				? row!.after.split(' ').filter((token) => !retiredButtonFocus.includes(token)).map(token => token === 'transition-all' ? 'transition-[color,background-color,border-color,box-shadow,translate]' : token).join(' ')
				: row!.after;
			expect(variants(props), `${family} ${JSON.stringify(props)}`).toBe(current);
		}
	}
});

it('preserves the computed Tabs trigger classes except inactive inline-icon padding', () => {
	const baseline = JSON.parse(readFileSync(resolve('../../docs/evidence/deepen-tabs-trigger-classes.json'), 'utf8')) as { before: string; after: string; removed: string[] };
	expect(baseline.after).toBe(baseline.before.split(' ').filter((token) => !baseline.removed.includes(token)).join(' '));
	const view = render(TabsClassFixture);
	expect(view.getByRole('tab').className).toBe(baseline.after);
});
