import { describe, expect, expectTypeOf, it } from 'vitest';
import {
	defineAnalyticsPreset,
	type AnalyticsEventName,
	type AnalyticsPropValues,
} from './config';

describe('analytics preset', () => {
	it('preserves typed consumer events', () => {
		const preset = defineAnalyticsPreset({
			events: ['event_alpha', 'event_beta'] as const,
		});

		expect(preset).toEqual({
			events: ['event_alpha', 'event_beta'],
		});
		expectTypeOf<AnalyticsEventName<typeof preset>>().toEqualTypeOf<
			'event_alpha' | 'event_beta'
		>();
	});

	it('types properties from literal and runtime value lists', () => {
		const slugs: string[] = ['alpha-project'];
		const preset = defineAnalyticsPreset({
			events: ['event_alpha'],
			props: { link: ['live', 'repo'], project: slugs },
		});
		type Props = NonNullable<(typeof preset)['props']>;

		expectTypeOf<AnalyticsPropValues<Props>>().toEqualTypeOf<{
			readonly link?: 'live' | 'repo';
			readonly project?: string;
		}>();
	});
});
