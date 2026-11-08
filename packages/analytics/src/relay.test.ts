import { describe, expect, it, vi } from 'vitest';
import { RELAY_MAX_BODY_BYTES, relayAnalyticsEvent } from './relay';

const event = { n: 'pageview', d: 'example.test', u: 'https://example.test/a', r: null };

function eventRequest(body: unknown = event, init: RequestInit = {}, url = 'https://example.test/relay/e') {
	return new Request(url, {
		method: 'POST',
		headers: { 'Content-Type': 'text/plain', 'User-Agent': 'Agent/1.0', Cookie: 'session=secret' },
		body: typeof body === 'string' ? body : JSON.stringify(body),
		...init,
	});
}

function upstream(status = 202) {
	return vi.fn<typeof fetch>(async () => new Response('ok', { status }));
}

const options = { domain: 'example.test', clientAddress: '203.0.113.7' };

describe('relayAnalyticsEvent', () => {
	it('forwards the event once to Plausible with the visitor address and user agent only', async () => {
		const send = upstream();
		const response = await relayAnalyticsEvent(eventRequest(), { ...options, fetch: send });

		expect(response.status).toBe(202);
		expect(response.headers.get('cache-control')).toBe('no-store');
		expect(send).toHaveBeenCalledOnce();
		const [url, init] = send.mock.calls[0] ?? [];
		expect(url).toBe('https://plausible.io/api/event');
		expect(init?.method).toBe('POST');
		expect(init?.headers).toEqual({
			'Content-Type': 'application/json',
			'User-Agent': 'Agent/1.0',
			'X-Forwarded-For': '203.0.113.7',
		});
		expect(JSON.parse(String(init?.body))).toEqual(event);
	});

	it.each([
		['an upstream error', () => upstream(500)],
		['a network failure', () => vi.fn<typeof fetch>(async () => Promise.reject(new TypeError('offline')))],
	])('answers 502 after one attempt on %s, with no retry or fallback', async (_case, makeSend) => {
		const send = makeSend();
		const response = await relayAnalyticsEvent(eventRequest(), { ...options, fetch: send });

		expect(response.status).toBe(502);
		expect(send).toHaveBeenCalledOnce();
	});

	it.each([
		['another site', { ...event, d: 'other.test' }],
		['a site rollup', { ...event, d: 'example.test,other.test' }],
		['a page on another host', { ...event, u: 'https://other.test/a' }],
		['a page on a sibling subdomain', { ...event, u: 'https://app.example.test/a' }],
		['a page on a preview host that also received it', { ...event, u: 'https://preview.vercel.test/a' }, 'https://preview.vercel.test/relay/e'],
		['a missing name', { d: event.d, u: event.u }],
		['malformed JSON', '{"n":'],
		['a non-object', '"pageview"'],
	] as [string, unknown, string?][])('refuses %s without contacting Plausible', async (_case, body, url) => {
		const send = upstream();
		const response = await relayAnalyticsEvent(eventRequest(body, {}, url), { ...options, fetch: send });

		expect(response.status).toBe(400);
		expect(send).not.toHaveBeenCalled();
	});

	it('forwards a page on a subdomain of the site when that subdomain received it', async () => {
		const send = upstream();
		const sub = { ...event, u: 'https://www.example.test/a' };
		const response = await relayAnalyticsEvent(eventRequest(sub, {}, 'https://www.example.test/relay/e'), {
			...options,
			fetch: send,
		});

		expect(response.status).toBe(202);
		expect(send).toHaveBeenCalledOnce();
	});

	it('refuses methods other than POST', async () => {
		const send = upstream();
		const request = new Request('https://example.test/relay/e', { method: 'GET' });
		const response = await relayAnalyticsEvent(request, { ...options, fetch: send });

		expect(response.status).toBe(405);
		expect(response.headers.get('allow')).toBe('POST');
		expect(send).not.toHaveBeenCalled();
	});

	it('refuses a body over the limit, declared or streamed', async () => {
		const send = upstream();
		const large = JSON.stringify({ ...event, p: { x: 'a'.repeat(RELAY_MAX_BODY_BYTES) } });
		const streamed = new Request('https://example.test/relay/e', {
			method: 'POST',
			body: new ReadableStream({
				start(controller) {
					controller.enqueue(new TextEncoder().encode(large));
					controller.close();
				},
			}),
			duplex: 'half',
		} as RequestInit);

		expect((await relayAnalyticsEvent(eventRequest(large), { ...options, fetch: send })).status).toBe(413);
		expect((await relayAnalyticsEvent(streamed, { ...options, fetch: send })).status).toBe(413);
		expect(send).not.toHaveBeenCalled();
	});

	it.each([
		{ domain: '', clientAddress: '203.0.113.7' },
		{ domain: 'example.test', clientAddress: '' },
		{ domain: 'example.test,other.test', clientAddress: '203.0.113.7' },
	])('throws when the route is misconfigured: %o', async (config) => {
		await expect(relayAnalyticsEvent(eventRequest(), { ...config, fetch: upstream() })).rejects.toThrow(
			TypeError,
		);
	});
});
