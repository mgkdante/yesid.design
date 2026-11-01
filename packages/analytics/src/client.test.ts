vi.mock('@plausible-analytics/tracker', () => ({ init: vi.fn(), track: vi.fn() }));

import { init, track } from '@plausible-analytics/tracker';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	allowAnalyticsProps,
	createAnalytics,
	sanitizeAnalyticsReferrer,
	sanitizeAnalyticsUrl,
} from './client';
import { defineAnalyticsPreset } from './config';

afterEach(() => {
	vi.unstubAllGlobals();
	vi.clearAllMocks();
});

const preset = defineAnalyticsPreset({ events: ['event_alpha', 'event_beta'] });

describe('sanitizeAnalyticsUrl', () => {
	it('preserves localized paths and removes the hash', () => {
		const url = new URL('https://metrics.example/fr/services/data-engineering#contact');

		expect(sanitizeAnalyticsUrl(url)).toBe(
			'https://metrics.example/fr/services/data-engineering',
		);
	});

	it('keeps only non-empty acquisition values in canonical key order', () => {
		const url = new URL(
			'https://metrics.example/es/work/example' +
				'?session_id=secret' +
				'&utm_term=rail' +
				'&utm_source=google' +
				'&utm_source=' +
				'&ref=partner' +
				'&source=newsletter' +
				'&utm_medium=cpc' +
				'&utm_campaign=summer' +
				'&utm_content=hero' +
				'&utm_term=montreal' +
				'&project=private' +
				'#internal-state',
		);

		expect(sanitizeAnalyticsUrl(url)).toBe(
			'https://metrics.example/es/work/example' +
				'?utm_source=google' +
				'&utm_medium=cpc' +
				'&utm_campaign=summer' +
				'&utm_content=hero' +
				'&utm_term=rail' +
				'&utm_term=montreal' +
				'&ref=partner' +
				'&source=newsletter',
		);
	});

	it('drops PII-shaped and unbounded acquisition values', () => {
		const url = new URL(
			'https://metrics.example/contact' +
				'?utm_source=linkedin' +
				'&utm_content=user@example.com' +
				'&utm_term=5145551234' +
				'&utm_campaign=514-555-1234' +
				'&ref=https%3A%2F%2Fexample.com%2Fprivate' +
				'&source=' + 'a'.repeat(65),
		);

		expect(sanitizeAnalyticsUrl(url)).toBe(
			'https://metrics.example/contact?utm_source=linkedin',
		);
	});
});

describe('sanitizeAnalyticsReferrer', () => {
	it('keeps only the HTTP origin and drops path, query, credentials, and invalid schemes', () => {
		expect(
			sanitizeAnalyticsReferrer(
				'https://user:secret@www.google.com/search?q=user@example.com#private',
			),
		).toBe('https://www.google.com/');
		expect(sanitizeAnalyticsReferrer('mailto:user@example.com')).toBeUndefined();
		expect(sanitizeAnalyticsReferrer('not a URL')).toBeUndefined();
		expect(sanitizeAnalyticsReferrer('')).toBeUndefined();
	});
});

describe('allowAnalyticsProps', () => {
	const allowed = { link: ['live', 'repo'], project: ['alpha-project'] };

	it('keeps only allowed keys carrying one of their allowed values', () => {
		expect(
			allowAnalyticsProps(allowed, {
				link: 'repo',
				project: 'beta-project',
				email: 'user@example.com',
				count: 3,
				toString: 'live',
			}),
		).toEqual({ link: 'repo' });
	});

	it('returns undefined when nothing survives', () => {
		expect(allowAnalyticsProps(allowed, { link: 'docs' })).toBeUndefined();
		expect(allowAnalyticsProps(allowed, undefined)).toBeUndefined();
		expect(allowAnalyticsProps({}, { link: 'live' })).toBeUndefined();
	});
});

describe('createAnalytics', () => {
	it.each([undefined, ''])('stays silent with domain %s', (domain) => {
		vi.stubGlobal('location', { hostname: 'example.test' });
		const analytics = createAnalytics(preset, { domain });

		expect(init).not.toHaveBeenCalled();
		expect(() => analytics.trackEvent('event_alpha')).not.toThrow();
		expect(track).not.toHaveBeenCalled();
	});

	it.each(['other.test', 'evil-example.test', 'example.test.other'])(
		'stays silent on foreign hostname %s',
		(hostname) => {
			vi.stubGlobal('location', { hostname });
			const analytics = createAnalytics(preset, { domain: 'example.test' });
			analytics.trackEvent('event_alpha');

			expect(init).not.toHaveBeenCalled();
			expect(track).not.toHaveBeenCalled();
		},
	);

	it('does not start without a browser location', () => {
		createAnalytics(preset, { domain: 'example.test' });

		expect(init).not.toHaveBeenCalled();
	});

	it.each(['example.test', 'www.example.test'])('starts on matching hostname %s', (hostname) => {
		vi.stubGlobal('location', { hostname });
		const analytics = createAnalytics(preset, { domain: 'example.test' });

		expect(init).toHaveBeenCalledOnce();
		expect(init).toHaveBeenCalledWith(expect.objectContaining({ domain: 'example.test' }));
		analytics.trackEvent('event_alpha');
		expect(track).toHaveBeenCalledWith('event_alpha', {});
	});

	it('reduces requests, strips properties and revenue, and drops unknown or unreducible events', () => {
		vi.stubGlobal('location', { hostname: 'example.test' });
		createAnalytics(preset, { domain: 'example.test' });
		const transformRequest = vi.mocked(init).mock.calls[0]?.[0].transformRequest;
		if (!transformRequest) throw new Error('Expected a request transform');
		const payload = {
			n: 'pageview',
			d: 'example.test',
			u: 'https://www.example.test/a/b?utm_source=news&q=12+Main+St#top',
			r: 'https://ref.test/path?x=1',
		};

		expect(transformRequest(payload)).toEqual({
			...payload,
			u: 'https://www.example.test/a/b?utm_source=news',
			r: 'https://ref.test/',
		});
		expect(transformRequest({ ...payload, r: null })).toEqual({
			...payload,
			u: 'https://www.example.test/a/b?utm_source=news',
			r: null,
		});
		expect(transformRequest({
			...payload,
			n: 'event_alpha',
			p: { private: 'value' },
			$: { currency: 'USD', amount: 10 },
		})).toEqual({
			n: 'event_alpha',
			d: 'example.test',
			u: 'https://www.example.test/a/b?utm_source=news',
			r: 'https://ref.test/',
		});
		expect(transformRequest({ ...payload, n: 'event_gamma' })).toBeNull();
		expect(() => transformRequest({ ...payload, u: 'https://example.test//' })).not.toThrow();
		expect(transformRequest({ ...payload, u: 'https://example.test//' })).toBeNull();
	});

	it('sends allowed properties on events and context properties on every request', () => {
		vi.stubGlobal('location', { hostname: 'example.test' });
		let locale = 'en';
		const analytics = createAnalytics(
			defineAnalyticsPreset({
				events: ['event_alpha'],
				props: { locale: ['en', 'fr'], link: ['live', 'repo'] },
			}),
			// A stale or mistyped context value is dropped at runtime too.
			{ domain: 'example.test', context: () => ({ locale }) as { locale: 'en' } },
		);
		const config = vi.mocked(init).mock.calls[0]?.[0];
		const customProperties = config?.customProperties;
		const transformRequest = config?.transformRequest;
		if (typeof customProperties !== 'function' || !transformRequest) {
			throw new Error('Expected custom properties and a request transform');
		}

		expect(customProperties('pageview')).toEqual({ locale: 'en' });
		locale = 'de';
		expect(customProperties('pageview')).toEqual({});

		analytics.trackEvent('event_alpha', { link: 'repo' });
		expect(track).toHaveBeenLastCalledWith('event_alpha', { props: { link: 'repo' } });

		const payload = { n: 'event_alpha', d: 'example.test', u: 'https://example.test/a', r: null };
		expect(
			transformRequest({ ...payload, p: { locale: 'fr', link: 'docs', secret: 'x' } }),
		).toEqual({ ...payload, p: { locale: 'fr' } });
	});
});
