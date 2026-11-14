import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Masthead, { type MastheadProps } from './Masthead.svelte';

const props: MastheadProps = {
	kicker: 'Line 24',
	heading: 'Waits along line 24',
	lede: 'Every stop on the line.',
};

const masthead = (overrides: Partial<MastheadProps> = {}) =>
	render(Masthead, { props: { ...props, ...overrides } });

const dot = (view: ReturnType<typeof masthead>) => view.container.querySelector('[data-slot="section-heading-dot"]');

describe('Masthead', () => {
	it("keeps today's kicker, dotted heading and tape by default", () => {
		const view = masthead();
		const head = view.container.querySelector('.masthead-head')!;
		expect(head.firstElementChild?.textContent).toContain('Line 24');
		expect(view.getByRole('heading', { level: 1 }).textContent).toContain('Waits along line 24');
		expect(dot(view)).not.toBeNull();
		expect(view.container.querySelector('[data-slot="masthead"]')!.lastElementChild?.getAttribute('data-slot')).toBe(
			'separator',
		);
	});

	it('starts with the heading when kicker is omitted', () => {
		const view = masthead({ kicker: undefined, tape: false });
		const head = view.container.querySelector('.masthead-head')!;
		expect(head.firstElementChild?.querySelector('h1')).not.toBeNull();
		expect(view.queryByText('Line 24')).toBeNull();
		expect(view.container.querySelector('[data-slot="separator"]')).toBeNull();
	});

	it('drops the brand dot with dot={false}', () => {
		const view = masthead({ kicker: undefined, dot: false });
		expect(dot(view)).toBeNull();
		expect(view.getByRole('heading', { level: 1 }).textContent?.trim()).toBe('Waits along line 24');
	});
});
