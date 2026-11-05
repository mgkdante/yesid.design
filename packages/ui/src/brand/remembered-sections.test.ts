import { fireEvent, render } from '@testing-library/svelte';
import { afterEach, expect, it } from 'vitest';
import { themeBootScript } from '../head/boot.js';
import Fixture from './test-fixtures/RememberedSections.svelte';

const copy = { collapse: 'Collapse all', expand: 'Expand all', collapseTitle: 'Collapse sections', expandTitle: 'Expand sections' };
const key = 'sections-choice';
afterEach(() => {
	localStorage.clear();
	delete document.documentElement.dataset.sectionsChoice;
	delete document.documentElement.dataset.sectionsAvailable;
});

it('remembers only a bulk choice, across complete page remounts', async () => {
	new Function(themeBootScript)();
	const first = render(Fixture);
	await fireEvent.click(first.getByRole('button', { name: copy.expand }));
	expect(localStorage.getItem(key)).toBe('expanded');
	await fireEvent.click(first.getByRole('button', { name: 'First' }));
	expect(localStorage.getItem(key)).toBe('expanded');
	first.unmount();
	const next = render(Fixture);
	expect(next.getByRole('button', { name: 'First' }).getAttribute('aria-expanded')).toBe('true');
	await fireEvent.click(next.getByRole('button', { name: copy.collapse }));
	expect(localStorage.getItem(key)).toBe('collapsed');
	next.unmount();
	const last = render(Fixture);
	expect(last.getByRole('button', { name: 'First' }).getAttribute('aria-expanded')).toBe('false');
});
