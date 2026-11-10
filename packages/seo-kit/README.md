# @yesid/seo-kit

Framework-neutral SEO construction mechanics. The package builds JSON-LD nodes and their script
body, alternate-locale sitemap entries, robots.txt, the yesid share card, the favicon mark and the
standard security headers, and it highlights code on the server. Products own content, canonical
routes, indexing policy, their CSP, filesystem writes, rasterization and HTTP responses. The
Svelte head component lives in `@yesid/ui/head`.

## Interface

Consumers can use the root export (JSON-LD, sitemap and robots, Satori) or the subpaths. See
[`api-reports/seo-kit.api.md`](https://github.com/mgkdante/yesid.design/blob/v0.39.1/api-reports/seo-kit.api.md) for exact types and exports.

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

`resolveShareCopy` tries each candidate in the requested locale before trying the same candidates
in `defaultLocale` (`en` by default). Text is trimmed, never truncated or split into sentences.
Bounds are inclusive Unicode code-point counts, defaulting to `minLength: 50, maxLength: 200`.
Supply positive integers with `maxLength >= minLength`; invalid bounds throw `RangeError`.

For each candidate, a nonempty CTA is appended with a space only when the combined text fits the
maximum. Otherwise the original candidate can still qualify. The final text must meet the minimum.
An existing CTA suffix is preserved, treating straight and curly apostrophes as equivalent.
Missing CTA translations use the default locale's label; fallback content uses that locale's CTA,
so a fallback description is not mixed with the requested locale's label. Omit `cta` for no CTA.

Each locale returns `status: 'selected'`, identical `description` and `ogLine` strings,
`candidateId`, zero-based `candidateIndex`, requested `locale`, `sourceLocale` and `ctaAppended`.
If no content qualifies in either locale, it returns `{ status: 'missing', locale }`. Handle that
explicitly in the product, for example by rejecting incomplete content during the build. The helper
does not invent generic copy. The original content and apostrophe style are preserved.

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

For a generic page, use the fields it owns. Plain-text summaries belong in content; do not pass
HTML, Markdown or a full article body expecting this helper to extract or shorten it:

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
});
```

Each `text` is a locale-keyed record; missing, null or undefined translations are allowed.
Products with locale-keyed content objects can map their fields into these records at the boundary.
`SeoHead.description` and the OG renderer's `title` still accept strings, so adoption is additive.
Selected-content cards use a smaller wordmark and start descriptions at 32px, stepping down
against Satori's measured layout to keep the full text and footer inside the padded image at
the default 200-code-point limit with the bundled fonts. Prose wraps at word boundaries;
tokens wider than a line can break within the word. Larger custom bounds and custom fonts
need product-specific image verification.
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
