// @vitest-environment node
import { render } from 'svelte/server';
import { expect, it } from 'vitest';
import SectionsToggle, { type SectionsToggleCopy } from './SectionsToggle.svelte';

const copy: SectionsToggleCopy = {
	collapse: 'Collapse all',
	expand: 'Expand all',
	collapseTitle: 'Collapse every section',
	expandTitle: 'Expand every section',
};

it('omits an inactive server control until at least two sections register on mount', () => {
 const controlled = render(SectionsToggle, { props: { copy, collapsed: true } }).body;
 const initial = render(SectionsToggle, { props: { copy } }).body;
 for (const body of [controlled, initial]) {
  expect(body).not.toContain('<button');
  expect(body).not.toContain(copy.collapse);
  expect(body).not.toContain(copy.expand);
 }
});
