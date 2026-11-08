const PLAUSIBLE_EVENT_API = 'https://plausible.io/api/event';
const RELAY_TIMEOUT_MS = 5_000;

/** Largest event body the relay forwards. Tracker events are well under 1 KiB. */
export const RELAY_MAX_BODY_BYTES = 4_096;

export interface AnalyticsRelayOptions {
	/** The one Plausible site this relay forwards: the `domain` the page passes to `createAnalytics`. */
	domain: string;
	/**
	 * The visitor's IP address, such as SvelteKit's `getClientAddress()` or a Worker's
	 * `CF-Connecting-IP` header. Plausible needs it to tell visitors apart; it is never stored.
	 */
	clientAddress: string;
	/** Fetch implementation. Defaults to the global `fetch`. */
	fetch?: typeof fetch;
}

function reply(status: number, headers: Record<string, string> = {}): Response {
	return new Response(null, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}

/** Reads at most `limit` bytes; returns undefined when the body is larger. */
async function readBoundedText(request: Request, limit: number): Promise<string | undefined> {
	const declared = Number(request.headers.get('content-length') ?? '0');
	if (declared > limit || !request.body) return declared > limit ? undefined : '';
	const reader = request.body.getReader();
	const chunks: Uint8Array[] = [];
	let size = 0;
	for (let next = await reader.read(); !next.done; next = await reader.read()) {
		size += next.value.byteLength;
		if (size > limit) {
			await reader.cancel();
			return undefined;
		}
		chunks.push(next.value);
	}
	const bytes = new Uint8Array(size);
	chunks.reduce((offset, chunk) => (bytes.set(chunk, offset), offset + chunk.byteLength), 0);
	return new TextDecoder().decode(bytes);
}

/** Accepts only an event for this relay's site, about a page on the host that received it. */
function isOwnEvent(body: string, domain: string, requestUrl: string): boolean {
	try {
		const event: unknown = JSON.parse(body);
		if (typeof event !== 'object' || event === null) return false;
		const { n, d, u } = event as Record<string, unknown>;
		if (typeof n !== 'string' || d !== domain || typeof u !== 'string') return false;
		return new URL(u).hostname === new URL(requestUrl).hostname;
	} catch {
		return false;
	}
}

/**
 * Forwards one tracker event from a same-origin route to Plausible, with the visitor's IP address
 * and user agent so visitors stay distinct. Each request goes upstream at most once: no retry and
 * no fallback. It answers 202 when Plausible accepts the event, 405 for a method other than POST,
 * 413 for an oversized body, 400 for an event about another site or host, and 502 when Plausible
 * fails or can't be reached. Cookies and other request headers are not forwarded.
 */
export async function relayAnalyticsEvent(
	request: Request,
	{ domain, clientAddress, fetch: send = globalThis.fetch }: AnalyticsRelayOptions,
): Promise<Response> {
	if (!domain || !clientAddress) {
		throw new TypeError('relayAnalyticsEvent needs a domain and the client address');
	}
	if (request.method !== 'POST') return reply(405, { Allow: 'POST' });
	const body = await readBoundedText(request, RELAY_MAX_BODY_BYTES);
	if (body === undefined) return reply(413);
	if (!isOwnEvent(body, domain, request.url)) return reply(400);
	try {
		const upstream = await send(PLAUSIBLE_EVENT_API, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'User-Agent': request.headers.get('user-agent') ?? '',
				'X-Forwarded-For': clientAddress,
			},
			body,
			redirect: 'manual',
			signal: AbortSignal.timeout(RELAY_TIMEOUT_MS),
		});
		return reply(upstream.ok ? 202 : 502);
	} catch {
		return reply(502);
	}
}
