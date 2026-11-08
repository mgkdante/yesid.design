---
"@yesid/analytics": minor
---

Analytics can now reach visitors whose browsers block `plausible.io`. Additions only; existing
calls behave as before, apart from the new domain check below.

- `createAnalytics` takes `endpoint`, a same-origin path such as `/relay/e`, and sends events there
  instead of `https://plausible.io/api/event`.
- New `@yesid/analytics/relay` subpath: `relayAnalyticsEvent(request, { domain, clientAddress })`
  serves that path from any Fetch-API runtime (SvelteKit endpoint, Cloudflare Worker). It forwards
  each event to Plausible exactly once with the visitor's IP and user agent, with no retry and no
  fallback, and refuses events for another site or host. `RELAY_MAX_BODY_BYTES` is its 4 KiB body
  limit.
- `createAnalytics` takes `reducePath(pathname)`, which maps each page path to the one Plausible
  records before campaign tags are reduced. An event is dropped if it throws or returns anything
  but a root-relative path.
- `createAnalytics` now throws for a `domain` that is not one plain host, such as a
  comma-separated rollup that would count each visit under several sites, and for an `endpoint`
  that isn't a same-origin path.

To migrate to the first-party endpoint: add the route (see the package README's Relay section),
pass `endpoint: '/relay/e'`, and remove `https://plausible.io` from the CSP's `connect-src`.
Products that let visitors opt out by blocking `plausible.io` must update that privacy text.
