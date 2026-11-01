---
"@yesid/analytics": minor
---

Add allowlisted custom properties. A preset can declare `props: { key: [allowed values] }`; value lists may be runtime string arrays. `trackEvent(name, props)` sends a subset of them, and the new `context` option of `createAnalytics` adds properties to every pageview and event. Any key or value outside the allowlist is dropped in the browser, including properties from class-tagged clicks. `allowAnalyticsProps` exposes the filter. Presets without `props` behave as before and send no properties.
