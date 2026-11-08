# @yesid/analytics

Cookieless Plausible measurement and web-vitals collection. `createAnalytics` wraps the official
[`@plausible-analytics/tracker`](https://www.npmjs.com/package/@plausible-analytics/tracker):
it captures pageviews, including client-side navigation, and returns a `trackEvent` typed to the
product's events. The product supplies the domain, event names and privacy policy. `./relay`
forwards those events from a same-origin route so content blockers that stop `plausible.io` don't
drop them.

## Interface

The root export and the `./config`, `./client`, `./relay` and `./vitals` subpaths are public. The exact
interface is in
[`api-reports/analytics.api.md`](https://github.com/mgkdante/yesid.design/blob/v0.37.0/api-reports/analytics.api.md).

## Measurement

In the root layout:

```ts
import { createAnalytics, defineAnalyticsPreset } from '@yesid/analytics';
const preset = defineAnalyticsPreset({ events: ['signup_click'] });
onMount(() => {
	const analytics = createAnalytics(preset, { domain: PUBLIC_PLAUSIBLE_DOMAIN });
	analytics.trackEvent('signup_click');
});
```

### Custom properties

Declare each property and its exact allowed values; lists may be built at runtime.

```ts
const preset = defineAnalyticsPreset({
	events: ['signup_click'],
	props: { placement: ['hero', 'footer'], locale: ['en', 'fr'] },
});
const analytics = createAnalytics(preset, {
	domain: PUBLIC_PLAUSIBLE_DOMAIN,
	context: () => ({ locale: currentLocale() }),
});
analytics.trackEvent('signup_click', { placement: 'hero' });
```

`context` is read on every pageview and event. Keys or values outside the preset are dropped
before anything is sent. Referrer reduction and property filtering are private implementation
helpers behind `createAnalytics`; they are not standalone exports. Register the keys under Custom properties in Plausible to see them.

It sends nothing unless `domain` is set and the page is served from that host or a subdomain,
so local, preview and fork deployments stay silent. Call it once per page load in the browser,
from the root layout only: a second start throws rather than counting each visit twice. Pass the
product's own host as `domain`; a comma-separated list of sites throws, because Plausible would
count the visit under each. Each request carries only the page path, bounded campaign tags
(`utm_*`, `ref`, `source`) and the referrer's origin. Nothing is written to cookies or browser
storage.

### First-party endpoint

Content blockers often stop requests to `plausible.io`. Pass `endpoint`, a same-origin path, and
serve it with [`relayAnalyticsEvent`](#relay):

```ts
createAnalytics(preset, { domain: PUBLIC_PLAUSIBLE_DOMAIN, endpoint: '/relay/e' });
```

`/relay/e` is the suggested path. As of 2026-11-08, EasyList, EasyPrivacy and uBlock Origin's
privacy list had no generic rule for it, while they do target `plausible.*`, `/stats/api/event`
and `/api/events`. Avoid paths containing `plausible`, `analytics`, `event`, `stats`, `collect`,
`track`, `beacon`, `pixel` or `ping`. With an endpoint the product's CSP needs only
`connect-src 'self'` for analytics; remove `https://plausible.io` so a stray direct send fails
instead of being counted. Without one, events go to `https://plausible.io/api/event` and the CSP
needs `connect-src https://plausible.io`.

### Path reduction

`reducePath` maps each page path to the one Plausible records, before campaign tags and the
referrer are reduced. It receives `URL.pathname`, percent-encoded. Use it when a path can carry a
name or an address the visitor typed:

```ts
createAnalytics(preset, {
	domain: PUBLIC_PLAUSIBLE_DOMAIN,
	reducePath: (path) => (/^\/[^/]+\/people$/.test(path) ? '/site/people' : KNOWN.has(path) ? path : '/404'),
});
```

An event is dropped if `reducePath` throws or returns anything but a root-relative path. Engagement
events reuse their pageview's reduced URL. Without `reducePath`, the path is kept as it is.

## Relay

`relayAnalyticsEvent(request, { domain, clientAddress })` takes a Web `Request` and returns a
`Response`, so it runs in a SvelteKit endpoint, a Cloudflare Worker or any Fetch-API server:

```ts
// src/routes/relay/e/+server.ts (SvelteKit)
import { relayAnalyticsEvent } from '@yesid/analytics/relay';
import { PUBLIC_PLAUSIBLE_DOMAIN } from '$env/static/public';
export const POST = ({ request, getClientAddress }) =>
	relayAnalyticsEvent(request, { domain: PUBLIC_PLAUSIBLE_DOMAIN, clientAddress: getClientAddress() });
```

```ts
// Cloudflare Worker
if (url.pathname === '/relay/e') {
	return relayAnalyticsEvent(request, {
		domain: env.PLAUSIBLE_DOMAIN,
		clientAddress: request.headers.get('CF-Connecting-IP') ?? '',
	});
}
```

The forwarding contract, for products that write their own route:

| Step | Rule |
| --- | --- |
| Accept | `POST` only (otherwise 405). Body at most 4 KiB (`RELAY_MAX_BODY_BYTES`, otherwise 413). |
| Check | JSON whose `d` equals the relay's `domain` exactly and whose `u` is a page on the host that received the request (otherwise 400). |
| Forward | One `POST` to `https://plausible.io/api/event` with the body unchanged, `Content-Type: application/json`, the visitor's `User-Agent` and `X-Forwarded-For: <visitor IP>`. No cookies or other headers. Without the IP and user agent every visitor looks like the server. |
| Answer | 202 when Plausible accepts, 502 when it fails or can't be reached within 5 seconds. Never retry, and never fall back to a direct send: either would count a visit twice. |

The visitor's address goes to Plausible to tell visitors apart and is not stored by the relay.
A misconfigured route, with no `domain` or no client address, throws.

## Web vitals

`./vitals` holds the beacon schema (`parseVitalsBeacon`, `parseVitalsSample` and their limits) for
the receiving endpoint, and `startVitals({ endpoint, load })` for the page. `load` returns the
`web-vitals` module (`() => import('web-vitals')`), so the package adds no dependency. The
collector starts once per page, keeps up to 12 samples, and sends one beacon when the page is
hidden, through `sendBeacon` or a keepalive `fetch`. It never throws. Products own whether it
runs and where the samples go.

## Rules

- No domain, a foreign host or no browser location sends nothing and never starts the tracker.
- One tracker per page load, for one site. A second start, a multi-site `domain` or an `endpoint`
  that isn't a same-origin path throws.
- URLs and referrers are reduced before they leave the browser. A URL that can't be reduced drops
  the event instead of throwing into navigation.
- No cookies or storage writes; the tracker only reads its own `plausible_ignore` opt-out.
- Only pageviews, engagement and the preset's custom events are sent, never revenue. Custom
  properties are limited to the preset's allowlisted keys and values.
- Delivery is fire-and-forget, and the relay sends each event upstream at most once. Products own
  any monitoring of it.

## Develop

```sh
bun run --cwd packages/analytics test
bun run --cwd packages/analytics check
```
