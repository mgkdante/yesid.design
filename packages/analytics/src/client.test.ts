vi.mock('@plausible-analytics/tracker', () => ({ init: vi.fn(), track: vi.fn() }));

import { init, track } from '@plausible-analytics/tracker';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	createAnalytics,
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

describe('createAnalytics', () => {
	it.each([
		['https://user:secret@www.google.com/search?q=user@example.com#private', 'https://www.google.com/'],
		['mailto:user@example.com', null],
		['not a URL', null],
		['', null],
	])('reduces the request referrer %s to its public origin', (referrer, expected) => {
		vi.stubGlobal('location', { hostname: 'example.test' });
		createAnalytics(preset, { domain: 'example.test' });
		const transform = vi.mocked(init).mock.calls[0]?.[0].transformRequest;
		if (!transform) throw new Error('Expected a request transform');
		expect(transform({ n: 'pageview', d: 'example.test', u: 'https://example.test/a', r: referrer })?.r)
			.toBe(expected);
	});

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
			transformRequest({ ...payload, p: { locale: 'fr', link: 'docs', secret: 'x', count: 3, toString: 'repo' } }),
		).toEqual({ ...payload, p: { locale: 'fr' } });
	});

	it('sends no context properties instead of throwing when context fails', () => {
		vi.stubGlobal('location', { hostname: 'example.test' });
		createAnalytics(defineAnalyticsPreset({ events: [], props: { locale: ['en'] } }), {
			domain: 'example.test',
			context: () => {
				throw new Error('router not ready');
			},
		});
		const customProperties = vi.mocked(init).mock.calls[0]?.[0].customProperties;
		if (typeof customProperties !== 'function') throw new Error('Expected custom properties');

		expect(customProperties('pageview')).toEqual({});
	});

	it('sends to a same-origin endpoint when one is given, and to the tracker default otherwise', () => {
		vi.stubGlobal('location', { hostname: 'example.test' });
		createAnalytics(preset, { domain: 'example.test', endpoint: '/relay/e' });
		expect(init).toHaveBeenLastCalledWith(expect.objectContaining({ endpoint: '/relay/e' }));

		vi.mocked(init).mockClear();
		createAnalytics(preset, { domain: 'example.test' });
		expect(vi.mocked(init).mock.calls[0]?.[0]).not.toHaveProperty('endpoint');
	});

	it.each(['https://plausible.io/api/event', '//relay.test/e', 'relay/e', '/relay/e?x=1', '/relay\\e'])(
		'refuses endpoint %s, which is not a same-origin path',
		(endpoint) => {
			vi.stubGlobal('location', { hostname: 'example.test' });
			expect(() =>
				createAnalytics(preset, { domain: 'example.test', endpoint: endpoint as `/${string}` }),
			).toThrow(TypeError);
			expect(init).not.toHaveBeenCalled();
		},
	);

	it.each(['example.test,other.test', 'example.test other.test', 'https://example.test'])(
		'refuses domain %s, so a visit is never counted under two sites',
		(domain) => {
			vi.stubGlobal('location', { hostname: 'example.test' });
			expect(() => createAnalytics(preset, { domain })).toThrow(TypeError);
			expect(init).not.toHaveBeenCalled();
		},
	);

	it('lets a second start fail instead of starting another tracker', () => {
		vi.stubGlobal('location', { hostname: 'example.test' });
		vi.mocked(init)
			.mockImplementationOnce(() => {})
			.mockImplementationOnce(() => {
				throw new Error('plausible.init() can only be called once');
			});
		createAnalytics(preset, { domain: 'example.test' });

		expect(() => createAnalytics(preset, { domain: 'example.test' })).toThrow();
	});

	it('records the reduced path, keeping bounded campaign tags, and drops events it cannot reduce', () => {
		vi.stubGlobal('location', { hostname: 'example.test' });
		const reducePath = vi.fn((pathname: string) =>
			pathname.startsWith('/client-name/') ? '/site/people' : pathname === '/bad' ? 'site' : '/404',
		);
		createAnalytics(preset, { domain: 'example.test', reducePath });
		const transform = vi.mocked(init).mock.calls[0]?.[0].transformRequest;
		if (!transform) throw new Error('Expected a request transform');
		const payload = { n: 'pageview', d: 'example.test', r: null };

		expect(transform({ ...payload, u: 'https://example.test/client-name/people?utm_source=news&email=a@b.c' })?.u)
			.toBe('https://example.test/site/people?utm_source=news');
		expect(reducePath).toHaveBeenLastCalledWith('/client-name/people');
		expect(transform({ ...payload, u: 'https://example.test/typed%20address' })?.u)
			.toBe('https://example.test/404');
		expect(transform({ ...payload, u: 'https://example.test/bad' })).toBeNull();
		reducePath.mockImplementationOnce(() => {
			throw new Error('unknown route');
		});
		expect(transform({ ...payload, u: 'https://example.test/x' })).toBeNull();
	});
});
