/** Custom property keys and the exact values each may carry. */
export type AnalyticsProps = Readonly<Record<string, readonly string[]>>;

export interface AnalyticsPreset<
	EventName extends string = string,
	Props extends AnalyticsProps = AnalyticsProps,
> {
	readonly events: readonly EventName[];
	/** Allowed custom properties. Any other key or value is dropped before sending. */
	readonly props?: Props;
}

export type AnalyticsEventName<Preset extends AnalyticsPreset> = Preset['events'][number];

/** A subset of a preset's properties, each set to one of its allowed values. */
export type AnalyticsPropValues<Props extends AnalyticsProps> = {
	readonly [Key in keyof Props]?: Props[Key][number];
};

export function defineAnalyticsPreset<
	const EventName extends string,
	const Props extends AnalyticsProps = Record<never, never>,
>(preset: AnalyticsPreset<EventName, Props>): AnalyticsPreset<EventName, Props> {
	return preset;
}
