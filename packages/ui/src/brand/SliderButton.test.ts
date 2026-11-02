import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import SliderButton from './SliderButton.svelte';

describe('SliderButton', () => {
	it.each(['previous', 'next'] as const)('renders a labelled %s button with a decorative chevron', (direction) => {
		const { getByRole } = render(SliderButton, { props: { direction, 'aria-label': `Go ${direction}` } });
		const button = getByRole('button', { name: `Go ${direction}` });
		expect(button.getAttribute('type')).toBe('button');
		expect(button.dataset.direction).toBe(direction);
		expect(button.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
	});

	it('forwards clicks and the disabled state', async () => {
		const onclick = vi.fn();
		const { getByRole, rerender } = render(SliderButton, { props: { direction: 'next', 'aria-label': 'Next', onclick } });
		await fireEvent.click(getByRole('button'));
		expect(onclick).toHaveBeenCalledOnce();
		await rerender({ direction: 'next', 'aria-label': 'Next', onclick, disabled: true });
		expect(getByRole('button').hasAttribute('disabled')).toBe(true);
	});
});
