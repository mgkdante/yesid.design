import { fireEvent, render } from '@testing-library/svelte';
import { afterEach, expect, it } from 'vitest';
import { themeBootScript } from '../head/boot.js';
import Fixture from './test-fixtures/RememberedSections.svelte';

const copy = { collapse: 'Collapse all', expand: 'Expand all', collapseTitle: 'Collapse sections', expandTitle: 'Expand sections' };
const key = 'sections-choice';
afterEach(() => {
	localStorage.clear();
	delete document.documentElement.dataset.sectionsChoice;
	delete document.documentElement.dataset.sectionsSaved;
	delete document.documentElement.dataset.sectionsAvailable;
});

it('remembers only a bulk choice, across complete page remounts', async () => {
	new Function(themeBootScript)();
	const first = render(Fixture);
	expect(first.getByRole('button', { name: 'First' }).getAttribute('aria-expanded')).toBe('true');
	expect(localStorage.getItem(key)).toBeNull();
	await fireEvent.click(first.getByRole('button', { name: copy.collapse }));
	expect(localStorage.getItem(key)).toBe('collapsed');
	await fireEvent.click(first.getByRole('button', { name: 'First' }));
	expect(localStorage.getItem(key)).toBe('collapsed');
	first.unmount();
	const next = render(Fixture);
	expect(next.getByRole('button', { name: 'First' }).getAttribute('aria-expanded')).toBe('false');
	await fireEvent.click(next.getByRole('button', { name: copy.expand }));
	expect(localStorage.getItem(key)).toBe('expanded');
	next.unmount();
	const last = render(Fixture);
	expect(last.getByRole('button', { name: 'First' }).getAttribute('aria-expanded')).toBe('true');
});

for (const choice of [null, 'collapsed', 'expanded'] as const) {
	it(`selective first-visit default respects ${choice ?? 'no saved choice'}`, async () => {
		if (choice) localStorage.setItem(key, choice);
		new Function(themeBootScript)();
		const view = render(Fixture, { firstVisitClosed: true });
		expect(view.getByRole('button', { name: 'First' }).getAttribute('aria-expanded')).toBe(choice === 'collapsed' ? 'false' : 'true');
		expect(view.getByRole('button', { name: 'Second' }).getAttribute('aria-expanded')).toBe(choice === 'expanded' ? 'true' : 'false');
		expect(localStorage.getItem(key)).toBe(choice);
		await fireEvent.click(view.getByRole('button', { name: 'Second' }));
		expect(localStorage.getItem(key)).toBe(choice);
	});
}

it('keeps the consumer bulkExpanded expression true on a first visit without opt-ins', () => {
	new Function(themeBootScript)();
	const view = render(Fixture);
	expect(document.documentElement.dataset.sectionsChoice).toBe('expanded');
	const bulkExpanded = document.documentElement.dataset.sectionsChoice === 'expanded';
	expect(bulkExpanded).toBe(true);
	expect(view.getByRole('button', { name: 'First' }).getAttribute('aria-expanded')).toBe('true');
	expect(view.getByRole('button', { name: 'Second' }).getAttribute('aria-expanded')).toBe('true');
});

it('keeps an explicit Expand all authoritative when an opted section mounts later', async () => {
	new Function(themeBootScript)();
	const first = render(Fixture, { firstVisitClosed: true });
	await fireEvent.click(first.getByRole('button', { name: copy.collapse }));
	await fireEvent.click(first.getByRole('button', { name: copy.expand }));
	first.unmount();
	const next = render(Fixture, { firstVisitClosed: true });
	expect(next.getByRole('button', { name: 'Second' }).getAttribute('aria-expanded')).toBe('true');
});
