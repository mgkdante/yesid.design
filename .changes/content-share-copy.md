---
"@yesid/seo-kit": minor
"@yesid/ui": minor
---

Resolve per-locale share copy from ordered content fields with `resolveShareCopy`
(root or `@yesid/seo-kit/share-copy`). It preserves complete candidates, applies
inclusive configurable bounds (50 to 200 Unicode code points by default), appends
optional localized CTA labels only when they fit, avoids duplicate CTAs across
straight and curly apostrophes, and falls back to a configured default locale
(`en` by default). Results identify the chosen field and source locale, or report
missing content explicitly.

Pass a selected result to `SeoHead.description` and `renderOgPng`'s `title` to use
the same text in meta/OG/Twitter descriptions and on the generated share image.
Selected-content cards use smaller type and wrap long words to accommodate the
default 200-character bound. Existing string inputs work unchanged. No per-page hard-coded share copy; write
it in the content fields. Consumers adopt this API in their own release upgrade
and verify their real content, head tags and generated images.
