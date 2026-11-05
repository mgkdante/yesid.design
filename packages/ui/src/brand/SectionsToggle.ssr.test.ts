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

it('reserves an inert, hidden server control for the pre-paint threshold check', () => {
 for (const props of [{ copy, collapsed: true }, { copy }]) {
  const body = render(SectionsToggle, { props }).body;
  expect(body).toContain('data-sections-control');
  expect(body).toContain('data-sections-hidden');
  expect(body).not.toContain('data-sections-ready');
 }
});
