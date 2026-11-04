import { init, track, type PlausibleRequestPayload } from '@plausible-analytics/tracker';
import type { AnalyticsPreset, AnalyticsPropValues, AnalyticsProps } from './config';

const ACQUISITION_KEYS = [
	'utm_source',
	'utm_medium',
	'utm_campaign',
	'utm_content',
	'utm_term',
	'ref',
	'source',
] as const;

const SAFE_ACQUISITION_VALUE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

function isSafeAcquisitionValue(value: string): boolean {
	return SAFE_ACQUISITION_VALUE.test(value) && value.replace(/\D/g, '').length < 7;
}

export function sanitizeAnalyticsUrl(url: URL): string {
	const sanitized = new URL(url.pathname, url.origin);

	for (const key of ACQUISITION_KEYS) {
		for (const value of url.searchParams.getAll(key)) {
			if (isSafeAcquisitionValue(value)) sanitized.searchParams.append(key, value);
		}
	}

	return sanitized.toString();
}

function sanitizeAnalyticsReferrer(value: string): string | undefined {
	if (value === '') return undefined;
	try {
		const referrer = new URL(value);
		if (referrer.protocol !== 'http:' && referrer.protocol !== 'https:') {
			return undefined;
		}
		return `${referrer.origin}/`;
	} catch {
		return undefined;
	}
}

/** Keeps only allowed keys whose value is one of that key's allowed values. */
function allowAnalyticsProps(
	allowed: AnalyticsProps,
	props: Readonly<Record<string, unknown>> | undefined,
): Record<string, string> | undefined {
	const kept = Object.entries(props ?? {}).filter(
		([key, value]) =>
			typeof value === 'string' &&
			Object.hasOwn(allowed, key) &&
			allowed[key]?.includes(value) === true,
	);
	return kept.length > 0 ? (Object.fromEntries(kept) as Record<string, string>) : undefined;
}

export interface AnalyticsOptions<Props extends AnalyticsProps = AnalyticsProps> {
	/** The Plausible site domain. Unset or empty turns measurement off. */
	domain: string | undefined;
	/** Properties added to every pageview and event, read each time one is sent. */
	context?: () => AnalyticsPropValues<Props>;
}

export interface Analytics<EventName extends string, Props extends AnalyticsProps = AnalyticsProps> {
	trackEvent(name: EventName, props?: AnalyticsPropValues<Props>): void;
}

/**
 * Starts cookieless Plausible measurement: pageviews, including client-side navigation, and
 * `trackEvent` for the preset's events. Nothing is sent unless `domain` is set and the page is
 * served from it or one of its subdomains, so local, preview and fork hosts stay silent; without
 * a browser location it returns a no-op. Call it once per page load.
 */
export function createAnalytics<
	const EventName extends string,
	const Props extends AnalyticsProps = Record<never, never>,
>(
	preset: AnalyticsPreset<EventName, Props>,
	{ domain, context }: AnalyticsOptions<Props>,
): Analytics<EventName, Props> {
	const hostname = globalThis.location?.hostname;
	if (!domain || !hostname || (hostname !== domain && !hostname.endsWith(`.${domain}`))) {
		return { trackEvent() {} };
	}
	const sendable = new Set<string>(['pageview', ...preset.events]);
	const allowed: AnalyticsProps = preset.props ?? {};
	init({
		domain,
		// The tracker calls this inside history.pushState, so a failing context must not throw.
		customProperties: () => {
			try {
				return allowAnalyticsProps(allowed, context?.()) ?? {};
			} catch {
				return {};
			}
		},
		// The tracker also sends class-tagged clicks and window.plausible calls, so filter here.
		transformRequest({ p, $: _revenue, ...payload }): PlausibleRequestPayload | null {
			if (!sendable.has(payload.n)) return null;
			try {
				const props = allowAnalyticsProps(allowed, p);
				return {
					...payload,
					u: sanitizeAnalyticsUrl(new URL(payload.u)),
					r: sanitizeAnalyticsReferrer(payload.r ?? '') ?? null,
					...(props && { p: props }),
				};
			} catch {
				return null;
			}
		},
	});
	return {
		trackEvent(name, props) {
			const kept = allowAnalyticsProps(allowed, props);
			track(name, kept ? { props: kept } : {});
		},
	};
}
