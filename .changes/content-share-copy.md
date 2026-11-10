---
"@yesid/seo-kit": minor
"@yesid/ui": minor
---

Resolve independent per-locale description and OG card text from ordered content
fields with `resolveShareCopy` (root or `@yesid/seo-kit/share-copy`). The first
candidate is primary short text. The card always preserves its full nonempty
primary after whitespace collapse, falling back to the default-locale primary
only when the requested primary is empty. With no primary in either locale, it
uses leading complete longer-summary sentences, then `defaults.ogLine`.

Descriptions try primary plus localized CTA, then primary alone, then leading
complete sentences from longer candidates in order. Bounds remain configurable,
inclusive Unicode code-point counts, defaulting to 50 to 200. Longer candidates
never contribute a partial sentence. Sentence splitting handles French/Spanish
punctuation and closing quotes, accepts abbreviations at the end of text and keeps
localized `p. ex.` / `p. ej.` continuations together instead of selecting fragments.
CTA composition recognizes existing suffixes after Unicode punctuation as well
as whitespace, stays idempotent across straight/curly apostrophes and follows
the description content's locale independently of the card's locale. After
requested/default-locale content fails, use `defaults.description`; no generic
copy is built in. Defaults do not receive a CTA.

Selections expose distinct `description` and `ogLine` plus per-output rule,
candidate and source-locale provenance. Top-level source/candidate fields alias
the description source (null candidate for defaults). Missing results retain any
independently resolved output, so a short primary is not lost when description
copy is missing. This reshapes the new, unreleased selection contract in this PR.

Pass a selected result to `SeoHead.description` and `renderOgPng`'s `title`.
Meta/OG/Twitter descriptions use `description`; the generated image uses `ogLine`.
`OG_LINE_MAX_LENGTH` (200 code points, root or `./share-copy`) is the CMS validation
limit guaranteed by measured card fitting with bundled fonts. Full text and the
footer remain within the padding, including multiline and wide/unbroken primary
text. Real-Satori regressions cover six individually fitting wide words at 197
and 200 code points, preserving every glyph and the footer within bounds.
Type starts at 32px and stops at `OG_LINE_MIN_FONT_SIZE` (24px, `./og`);
unfit input rejects instead of clipping or shrinking below legibility. Primary
text beyond the limit is still preserved by the resolver and needs consumer
verification. Existing string inputs work byte-identically.

No per-page hard-coded share copy; write it in content fields. Consumers adopt
this API in their own release upgrade and verify real content, head tags and
images in their locales. Package checks do not establish consumer adoption.
