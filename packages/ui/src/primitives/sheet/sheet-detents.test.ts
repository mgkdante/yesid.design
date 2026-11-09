import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, expect, it, vi } from 'vitest';
import Fixture from './test-fixtures/SheetDetentsFixture.svelte';
import Legacy from './test-fixtures/SheetContractFixture.svelte';
afterEach(cleanup);
it('keeps the default overlay and omits the handle', () => {
	render(Legacy, { closeLabel: 'Close' });
	expect(screen.queryByRole('slider')).toBeNull();
	expect(document.querySelector('[data-slot=sheet-overlay]')).not.toBeNull();
	expect(screen.getByRole('dialog').getAttribute('aria-modal')).toBe('true');
	expect(screen.getByRole('dialog').className).not.toMatch(/svelte-/);
});
it('resolves unknown ids silently and exposes caller copy and non-modal semantics', () => {
	const changed = vi.fn();
	render(Fixture, { detent: 'missing', ondetentchange: changed });
	expect(screen.getByRole('slider', { name: 'Hauteur' }).getAttribute('aria-valuetext')).toBe('Aperçu');
	expect(screen.getByRole('slider').getAttribute('aria-valuemax')).toBe('1');
	expect(screen.getByRole('dialog').getAttribute('data-detent')).toBe('peek');
	expect(screen.getByRole('dialog').getAttribute('aria-modal')).toBe('false');
	expect(document.querySelector('[data-slot=sheet-overlay]')).toBeNull();
	expect(changed).not.toHaveBeenCalled();
});
it('handles keyboard bounds and tap cycles with user-only callbacks', async () => {
	const changed = vi.fn();
	render(Fixture, { ondetentchange: changed });
	const slider = screen.getByRole('slider');
	await fireEvent.keyDown(slider, { key: 'ArrowUp' });
	expect(slider.getAttribute('aria-valuetext')).toBe('Complet');
	await fireEvent.keyDown(slider, { key: 'End' });
	expect(changed).toHaveBeenCalledTimes(1);
	await fireEvent.click(slider);
	expect(slider.getAttribute('aria-valuenow')).toBe('0');
	expect(changed.mock.calls).toEqual([['full'], ['peek']]);
});

it('supports non-modal sheets without draggable heights', () => {
	render(Legacy, { closeLabel: 'Close', modal: false });
	expect(screen.queryByRole('slider')).toBeNull();
	expect(screen.getByRole('dialog').getAttribute('aria-modal')).toBe('false');
	expect(document.querySelector('[data-slot=sheet-overlay]')).toBeNull();
});
it('does not announce controlled prop changes as user changes', async () => {
	const changed = vi.fn();
	const view = render(Fixture, { ondetentchange: changed });
	await view.rerender({ detent: 'full' });
	expect(screen.getByRole('slider').getAttribute('aria-valuetext')).toBe('Complet');
	expect(changed).not.toHaveBeenCalled();
});
