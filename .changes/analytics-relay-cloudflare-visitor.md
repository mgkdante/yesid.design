---
"@yesid/analytics": patch
---

`relayAnalyticsEvent` now counts visitors on sites that Cloudflare proxies to another host, such as
yesid.dev on Vercel. There, the connecting address is a Cloudflare server, which Plausible accepts
with 202 and then drops. When `clientAddress` is in Cloudflare's published ranges, the relay forwards
the request's `CF-Connecting-IP` instead. A request from outside those ranges cannot choose its
address with that header. No call changes are needed; a route that already reads `CF-Connecting-IP`
itself keeps working and can drop that code.
