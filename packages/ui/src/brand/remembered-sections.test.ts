import { fireEvent, render, within } from '@testing-library/svelte';
import { afterEach, expect, it } from 'vitest';
import CollapsibleSection from './CollapsibleSection.svelte';
import SectionsToggle from './SectionsToggle.svelte';
import { themeBootScript } from '../head/boot.js';
import Fixture from './test-fixtures/RememberedSections.svelte';

const copy = { collapse: 'Collapse all', expand: 'Expand all', collapseTitle: 'Collapse sections', expandTitle: 'Expand sections' };
const key = 'sections-choice';
afterEach(() => {
	localStorage.clear();
	delete document.documentElement.dataset.sectionsChoice;
	delete document.documentElement.dataset.sectionsAvailable;
});

it('remembers only a bulk choice, across a complete page remount', async () => {
	new Function(themeBootScript)();
	const first = render(CollapsibleSection, { title: 'First' });
	const second = render(CollapsibleSection, { title: 'Second' });
	const control = render(SectionsToggle, { copy });
	await fireEvent.click(control.getByRole('button', { name: copy.collapse }));
	expect(localStorage.getItem(key)).toBe('collapsed');
	await fireEvent.click(within(first.container).getByRole('button'));
	expect(localStorage.getItem(key)).toBe('collapsed');
	first.unmount(); second.unmount(); control.unmount();
	const next = render(Fixture);
	expect(within(next.container).getByRole('button', { name: 'First' }).getAttribute('aria-expanded')).toBe('false');
});
