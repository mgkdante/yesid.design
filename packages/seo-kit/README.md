# @yesid/seo-kit

Framework-neutral SEO construction mechanics. The package builds JSON-LD nodes and their script
body, alternate-locale sitemap entries, robots.txt, the yesid share card, the favicon mark and the
standard security headers, and it highlights code on the server. Products own content, canonical
routes, indexing policy, their CSP, filesystem writes, rasterization and HTTP responses. The
Svelte head component lives in `@yesid/ui/head`.

## Interface

Consumers can use the root export (JSON-LD, sitemap and robots, Satori) or the subpaths. See
[`api-reports/seo-kit.api.md`](https://github.com/yesid-dev/yesid.design/blob/v0.40.0/api-reports/seo-kit.api.md) for exact types and exports.

- `./jsonld`: node builders and `serializeJsonLd(nodes)`, one `@graph` body with `<` escaped.
- `./share-copy`: `resolveShareCopy(input)`, content-derived descriptions and OG card text with
  ordered candidates, optional CTA and locale fallback. Also exported from the root.
- `./sitemap`: alternate-locale entries, the sitemap document and `robotsTxt`.
- `./og`: `renderOgPng(card, fonts, rasterize)` draws the share card (eyebrow, wordmark with the
  accent dot, title, handle and location) at `OG_WIDTH` × `OG_HEIGHT` in `OG_PALETTE`, the dark
  token colors.
- `./og/fonts`: `ogFonts`, inlined by Vite, for request-time rendering.
- `./og/files`: `ogFontFiles` and `readOgFonts()` for Bun build scripts. Native Node can't load
  this package's TypeScript from `node_modules`.
- `./icons`: `brandMarkSvg(color)`, the tab-cut ring and dot, and `touchIconSvg(ground, color)`.
- `./headers`: `SECURITY_HEADERS`. Products serialize their own CSP directives. The Permissions-Policy
  denies every listed feature; a product that uses one overrides that header (Transit allows
  `geolocation=(self)` for its locate-me control).
- `./highlight`: `highlight(code, lang)` resolves to token markup for a `<code>` element in `syn-*`
  classes (bash, css, html, javascript, json, liquid, markdown, python, sql, svelte, typescript;
  js, ts, sh, shell and md aliases). Shiki runs with the JavaScript regex engine (no WASM, so it
  runs on Workers), loads each grammar on first use and caches one highlighter per process.
  Unknown languages come back escaped. Server-only, and not in the root export.

## Invariants

- Builders return data or strings and do not read product state.
- JSON-LD context inclusion is explicit; callers own identifiers and schema composition.
- Sitemap output escapes XML, normalizes valid dates, and preserves caller-selected empty-element
  style and locale ordering. `robotsTxt` without indexing disallows everything.
- Card colors come from `tokens.json`, never literals. `fonts/` holds the card's Inter and
  JetBrains Mono TTFs; Satori can't read WOFF2.
- PNG conversion stays behind the injected rasterizer because native and file ownership varies by
  consumer.
- The package owns no routes, locale registry, response cache, CSP or deployment adapter.

## Content-derived descriptions and share cards

**No per-page hard-coded share copy; write it in the content fields.** Apply this to every
project/case study, blog article and generic page. Products choose candidate order from their
content model, and supply locale keys and CTA labels. The helper knows no slugs or page types.

`resolveShareCopy` resolves **two independent outputs**. The first candidate is the page's
primary short text; later candidates are longer plain-text summaries, in product-selected order.
All selected text collapses whitespace and newlines to single spaces. The helper knows no slugs,
site names, page types or built-in copy.

**A. OG card line (`ogLine`).** Always use the nonempty primary in the requested locale,
regardless of length. If it is missing or empty, use the primary in `defaultLocale` (`en` by
default), even when a longer local summary exists. Only when neither locale has primary text,
try the leading complete sentences of each longer candidate, in order, first in the requested
locale, then the default locale. Accumulate sentences up to `OG_LINE_MAX_LENGTH` (200 Unicode
code points), with no minimum and no CTA. Finally try `defaults.ogLine` in those same locales.

`OG_LINE_MAX_LENGTH` is exported from the root and `./share-copy` so products can validate CMS
primary text after whitespace collapse with `Array.from(text).length`. The resolver preserves
primary text beyond this limit too; it never replaces or clips a nonempty primary. The renderer's
fit guarantee covers up to **200 code points**, with the bundled fonts and card identity fields
that fit their own rows. Selected cards start at 32px and step down using Satori's measured
layout, stopping at `OG_LINE_MIN_FONT_SIZE` (24px, exported from `./og`). The complete line and
footer stay within the 80px padding (footer bottom at or above y = 550). Prose wraps at word
boundaries; oversized tokens can break within the word. Input that cannot fit at 24px rejects
with `RangeError` instead of clipping or shrinking further. Longer input and custom fonts need
product-specific image verification.

**B. Meta, `og:description` and Twitter description (`description`).** In the requested locale:

1. Use the complete primary plus the localized CTA if the result meets the bounds.
2. Otherwise use the complete primary alone if it meets the bounds.
3. Otherwise try longer candidates in order. Accumulate their leading complete sentences while
   within the maximum, then append the CTA if it still fits. The result must meet the minimum.
   Each candidate is independent; sentences from different fields are never stitched together.
4. If local content fails, repeat these content rules in `defaultLocale`, then try the configured
   `defaults.description` in the requested and default locales. There is no built-in site default.

Description bounds are inclusive Unicode code-point counts, defaulting to `minLength: 50` and
`maxLength: 200`. Supply positive integers with `maxLength >= minLength`; invalid bounds throw
`RangeError`. No output cuts a sentence to reach a bound. For a longer candidate, an oversized
first sentence disqualifies that candidate; an unfinished trailing sentence is excluded. Full
primary text and configured defaults need not end in punctuation and are never sliced.

Sentence boundaries recognize `.`, `!`, `?`, `…`, repeated terminal punctuation, French guillemets
(including the space before `»`), Spanish `¿`/`¡` and closing straight/curly quotes or brackets.
Splitting is intentionally conservative and simple, not linguistic analysis: decimal points,
initials/acronyms (such as `U.S.`) and a small fixed set of abbreviations stay together, including
`etc.`, `e.g.`, `i.e.`, `Dr.`, `M.`, `Mme.`, `Sr.`, `Sra.`, `p. ex.`, `p. ej.` and `núm.`.
The localized `p. ex.` / `p. ej.` forms also work without internal spaces. A boundary requires
whitespace or the end after terminal punctuation and any closing quotes. A final abbreviation
at the end of the text counts as a complete sentence, including closing quotes or brackets.
Unknown abbreviations may be treated as sentence ends; an abbreviation at a sentence end with
more text after it can conservatively keep that sentence joined to the next. Author plain-text
summaries accordingly; no HTML/Markdown extraction or language-specific grammar inference occurs.

CTA composition is idempotent and treats straight and curly apostrophes as equivalent while
preserving the original apostrophe style. A matching suffix must start at the beginning of the
text or after Unicode whitespace or punctuation, including dashes, quotes and parentheses.
Embedded matches within words do not suppress the CTA.
The CTA follows the locale of the **description content actually used**, independent of the OG
line's locale. An empty or missing CTA translation uses the default locale's label. Omit `cta`
for no CTA. Defaults are used unchanged after whitespace collapse, without adding a CTA, and
must meet their output's bounds.

A `status: 'selected'` result carries `description`, `ogLine`, requested `locale` and separate
`descriptionSource` / `ogLineSource` records. Each source names its `rule` (`primary-cta`,
`primary`, `sentences` or `default`), `sourceLocale`, `candidateId` and zero-based `candidateIndex`.
Defaults use null candidate IDs/indices. The existing top-level `sourceLocale`, `candidateId` and
`candidateIndex` alias the description source; `ctaAppended` refers only to this resolution's
description CTA. If either output cannot be resolved, `status: 'missing'` retains any independently
resolved output and its source. Handle missing results explicitly before passing a selection to
the head or card, for example by rejecting incomplete content during a build or adding configured
defaults. A short primary is never discarded just because the description is missing.

For a project or case study, use the content's one-liner before longer descriptions:

```ts
import { resolveShareCopy } from '@yesid/seo-kit/share-copy';
import { renderOgPng } from '@yesid/seo-kit/og';

const copies = resolveShareCopy({
  locales: ['en', 'fr', 'es'],
  candidates: [
    { id: 'oneLiner', text: project.oneLiner },
    { id: 'excerpt', text: project.excerpt },
    { id: 'seoDescription', text: project.seoDescription },
    { id: 'description', text: project.description },
  ],
  cta: labels.seeCaseStudy, // { en: 'See the case study.', fr: ..., es: ... }
});
const copy = copies[locale];
if (!copy || copy.status === 'missing') throw new Error('Add usable share copy to the content');

// Reuse this selected object in the head and in the image endpoint/build script.
const png = await renderOgPng({ ...cardIdentity, title: copy }, fonts, rasterize);
```

The Svelte head is in `@yesid/ui/head`. Keep the page title; pass the same selection as its
description. It writes `description`, `og:description` and `twitter:description` from that text:

```svelte
<SeoHead {...headIdentity} title={project.title[locale]} description={copy} />
```

For a blog article, prioritize its excerpt and SEO description, then its body summary:

```ts
const copies = resolveShareCopy({
  locales,
  candidates: [
    { id: 'excerpt', text: article.excerpt },
    { id: 'seoDescription', text: article.seoDescription },
    { id: 'bodyDescription', text: article.bodyDescription },
  ],
  cta: labels.readArticle,
});
```

For a generic page, use the fields it owns. Supply plain-text summaries from content; this helper
does not extract prose from HTML or Markdown:

```ts
const copies = resolveShareCopy({
  locales,
  defaultLocale: 'en',
  candidates: [
    { id: 'seoDescription', text: page.seoDescription },
    { id: 'description', text: page.description },
  ],
  minLength: 50,
  maxLength: 200,
  defaults: { description: labels.defaultDescription, ogLine: labels.defaultCardLine },
});
```

Each `text` is a locale-keyed record; missing, null or undefined translations are allowed.
Products with locale-keyed content objects can map their fields into these records at the boundary.
`SeoHead.description` and the OG renderer's `title` still accept strings, so adoption is additive.
Selected-content cards use a smaller wordmark and the measured fit described above. The head
uses `description` for all three description tags; the image draws only `ogLine`.
Replace local tagline maps and CTA composition with content fields and this helper when upgrading.
Consumers must run their own checks and inspect real head tags and generated images for their
locales, including long text and missing translations; repository tests do not establish adoption.

## Develop

```sh
bun run --cwd packages/seo-kit test
bun run --cwd packages/seo-kit check
```

`satori` is a required peer at `>=0.33.5 <1`, excluding versions affected by SVG serialization
injection ([GHSA-wx4j-mvgx-mqwp](https://github.com/advisories/GHSA-wx4j-mvgx-mqwp)). `shiki` 4.x is
an optional peer, needed only for `./highlight`.
Invalid dates are left out of the sitemap. Satori and rasterizer errors reject to the caller,
which decides whether to fail the build or retry.
