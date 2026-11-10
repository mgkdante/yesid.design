# Changelog

## 0.41.0-rc.1

<!-- release-fragment: ripple-exempt-attribute -->
- `@yesid/motion` (minor): The global ripple now skips any click inside an element marked `data-ripple-exempt`, without needing an `exclude` option.
  Mark reading surfaces such as article bodies, editorial cards, charts and maps with the attribute so the ripple stays on
  navigation and controls. A consumer `exclude` selector still works and now adds to this rule instead of being the only
  one. Consumers that already pass `exclude: '[data-ripple-exempt]'` can drop it; leaving it in place is harmless. No other
  migration is required.

## 0.40.0

<!-- release-fragment: sheet-touch-drag -->
- `@yesid/ui` (patch): Bottom Sheet detents can now be dragged by touch. A touch drag on the handle used to stop after its first move, because the
  touched child's implicit pointer capture ended when the sheet took capture, and that event bubbled up as the end of the
  drag. Only the sheet's own lost capture ends a drag now. Mouse drags, taps and keyboard changes are unchanged. No migration is required.

## 0.40.0-rc.1

<!-- release-fragment: content-share-copy -->
- `@yesid/seo-kit` (minor), `@yesid/ui` (minor): Resolve independent per-locale description and OG card text from ordered content
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

<!-- release-fragment: packed-design-peer-owner -->
- `@yesid/tokens` (patch), `@yesid/motion` (patch), `@yesid/gates` (patch), `@yesid/seo-kit` (patch), `@yesid/ui` (patch), `@yesid/analytics` (patch), `@yesid/i18n-core` (patch), `@yesid/config` (patch): Pack sibling design dependencies at the release's own repository, tag and asset
  version, including previously pinned URLs from before the repository transfer to
  yesid-dev/yesid.design. New tarballs no longer retain old-owner sibling URLs that
  rely on GitHub redirects. All-eight-package packing regression checks every
  design dependency URL against the canonical repository. Public APIs are unchanged;
  consumers receive this correction through the next normal release upgrade.

## 0.39.1

<!-- release-fragment: boot-recovery-own-scripts -->
- `@yesid/ui` (patch): Keep the reader's collapsed section choice when an optional or third-party script fails to load. Startup resource recovery now responds only to same-origin `/_app/` module scripts and modulepreloads, preserving readable content when app assets fail. No migration is required.

## 0.39.0

<!-- release-fragment: section-cards-wider-on-phones -->
- `@yesid/ui` (patch): Section cards in `DetailFrame` are wider on phones. Below 768px, top-level section cards in the
  center column now sit 8px from the screen edges instead of the 24px page gutter, so their text gets
  about 32px more width. Nested cards, tablets and desktops are unchanged. Update product tests that
  expect section cards on phones to line up with the page gutter.

<!-- release-fragment: sheet-detents -->
- `@yesid/ui` (minor): Opt into draggable bottom Sheet heights with Content detents, caller-owned handle and stop labels,
  and bind:detent. User changes emit ondetentchange; callers own persistence. Content also accepts
  modal={false} for an interactive page behind the sheet. Existing Sheet defaults remain unchanged.

## 0.38.1

<!-- release-fragment: analytics-relay-cloudflare-visitor -->
- `@yesid/analytics` (patch): `relayAnalyticsEvent` now counts visitors on sites that Cloudflare proxies to another host, such as
  yesid.dev on Vercel. There, the connecting address is a Cloudflare server, which Plausible accepts
  with 202 and then drops. When `clientAddress` is in Cloudflare's published ranges, the relay forwards
  the request's `CF-Connecting-IP` instead. A request from outside those ranges cannot choose its
  address with that header. No call changes are needed; a route that already reads `CF-Connecting-IP`
  itself keeps working and can drop that code.

## 0.38.0

<!-- release-fragment: analytics-first-party-endpoint -->
- `@yesid/analytics` (minor): Analytics can now reach visitors whose browsers block `plausible.io`. Additions only; existing
  calls behave as before.

  - `createAnalytics` takes `endpoint`, a same-origin path such as `/relay/e`, and sends events there
    instead of `https://plausible.io/api/event`.
  - New `@yesid/analytics/relay` subpath: `relayAnalyticsEvent(request, { domain, clientAddress })`
    serves that path from any Fetch-API runtime (SvelteKit endpoint, Cloudflare Worker). It forwards
    each event to Plausible exactly once with the visitor's IP and user agent, with no retry and no
    fallback. It refuses events for another site, or from a host that isn't the site or one of its
    subdomains, such as a preview. `RELAY_MAX_BODY_BYTES` is its 4 KiB body limit.
  - `createAnalytics` takes `reducePath(pathname)`, which maps each page path to the one Plausible
    records before campaign tags are reduced. An event is dropped if it throws or returns anything
    but a root-relative path.
  - `createAnalytics` throws for an `endpoint` that isn't a same-origin path. A `domain` that isn't
    one plain host, such as a comma-separated rollup, sends nothing, as it did before.

  To migrate to the first-party endpoint: add the route (see the package README's Relay section),
  pass `endpoint: '/relay/e'`, and remove `https://plausible.io` from the CSP's `connect-src`.
  Products that let visitors opt out by blocking `plausible.io` must update that privacy text.

## 0.37.0

Promotes 0.37.0-rc.3, which also contains the 0.37.0-rc.2 and 0.37.0-rc.1 changes below:
content sections start expanded on a first visit, and the nav keeps 16px text at every width.

<!-- release-fragment: nav-links-fit -->
- `@yesid/ui` (patch): `SiteHeader` now moves its links to the menu whenever the pill would not fit its header with 4px
  to spare, measured from the real labels. The fixed 375px threshold alone let longer labels run off
  narrow phones: yesid.dev's Spanish header was 399px wide on a 390px phone. Width thresholds still
  apply before the app script runs. No API change.

## 0.37.0-rc.2

<!-- release-fragment: nav-text-one-size -->
- `@yesid/tokens` (minor), `@yesid/ui` (minor): The floating nav keeps one text size at every width: header links are 16px (was 15px on desktop,
  14px on tablets and 13px on small phones) and the wordmark is 18px (was 18, 17 and 16px). All
  `--text-nav-link-*` tokens are now `1rem` and all `--text-nav-brand-*` tokens `1.125rem`.

  Links that don't fit move to the menu instead of shrinking. `SiteHeader` now shows `priority: 1`
  links (the default) from a 375px-wide header; below that the header shows the wordmark and
  controls only. `priority: 2` still shows from 500px and `priority: 3` from 1024px. Keep every
  header link in `menuItems` so narrow phones can still reach it. Update product tests that expect
  header links on screens narrower than 375px or assert the old nav text sizes.

## 0.37.0-rc.1

<!-- release-fragment: sections-start-expanded -->
- `@yesid/ui` (minor): Content sections now start expanded on a first visit. With no `sections-choice` stored, or a
  malformed one, pages with a `SectionsToggle` and at least two content sections open every section,
  and the control shows Collapse all in its neutral state. A remembered Collapse all still collapses
  content across pages and visits, and the control is orange after it. Blocked storage still uses
  declared defaults.

  The boot script changed, so `@yesid/ui/boot.json` has a new CSP hash. Products that import it
  pick it up on rebuild; a manually copied hash must be updated. Update product tests that expect
  collapsed content on a fresh visit. See
  [Remembered sections](docs/migrations/remembered-sections.md#first-visit-opens-content).

## 0.36.1

<!-- release-fragment: rename-yesid-design -->
- `@yesid/tokens` (patch), `@yesid/motion` (patch), `@yesid/gates` (patch), `@yesid/seo-kit` (patch), `@yesid/ui` (patch), `@yesid/analytics` (patch), `@yesid/i18n-core` (patch), `@yesid/config` (patch): The repository is now `mgkdante/yesid.design`. Package names and APIs are unchanged. To migrate, replace `mgkdante/yesid.dev-design` with `mgkdante/yesid.design` in every tarball URL when you bump to this release. Verify this and later releases with `gh attestation verify --repo mgkdante/yesid.design`. Attestations for v0.36.0 and earlier stay bound to the old name, so verify those with `--repo mgkdante/yesid.dev-design`.

## 0.36.0

<!-- release-fragment: remembered-sections -->
- `@yesid/ui` (minor): The expand-all control remembers one origin-wide localStorage choice under `sections-choice`.
  Pages with at least two content sections and the control start collapsed on a first visit; the
  visitor's bulk choice wins across pages and visits. The collapsed control is orange and its
  default active effect is `glow`. Individual toggles, the TOC and independent panels keep their
  own state. Server HTML keeps complete, readable bodies, and the head boot script applies initial
  geometry before paint. Blocked storage uses declared interactive defaults.
  The body stays visible during parsing. Boot and app-resource failures expose pending bodies;
  stalled startup has a five-second readable fallback. Other-tab choices apply to future mounts,
  and late content adopts the bulk choice while preserving deliberate individual toggles.
  Pending disclosure semantics and the bulk accessible name match their visual state. Recovery
  preserves the control's space, belongs to pending mounts and keeps future route preferences intact.
  The server HTML eligibility scan has forward-only progress on malformed input.

  This is the owner-approved D15 behavior change of 2026-11-05. Rebuild with the package's new
  `boot.json` CSP hash, update disclosure expectations and privacy/device-storage copy, and rehearse
  the prerelease on both products before stable promotion. No new props, settings, CMS fields or
  consumer initialization are required. See `docs/migrations/remembered-sections.md`.

## 0.35.0

<!-- release-fragment: connect-kit3-truth -->
- `@yesid/ui` (patch), `@yesid/config` (minor): Document Kit 3 as the supported app target, with TypeScript 6 for SvelteKit consumers and
  TypeScript 5.9/6 for the library config. Config flags and package runtime source are unchanged.
  The repository contract suite composes the real Kit 3 config on TypeScript 6, and Gallery now
  runs Kit 3, Vite 8 and the hook-only navigation lifecycle. The optional accepted-start adapter
  retains fake-router coverage; eventless language redirects close the menu on Kit 3.

  Follow the composed product guide for boot hooks, fonts, theme and language injection, Kit/Vite
  config, header/navigation/language/section controls, source scanning and required peers. The UI
  README uses Kit 3 and the existing tap-size token; migration/deprecation notes name shipped
  v0.33.0 and v0.34.0 changes. This does not establish consumer adoption or deployed acceptance.

<!-- release-fragment: connect-module-fixes -->
- `@yesid/ui` (minor): Sheet animation CSS now comes from `@yesid/ui/base.css` and its package-owned
  `tw-animate-css` dependency. Products can remove their direct dependency and stylesheet import.

  Breaking: Sheet Content requires caller-owned `closeLabel` whenever its close button can appear.
  Pass localized copy, or explicitly set `showCloseButton={false}` to omit the button and label.
  The owner approved this coordinated transition without a deprecation wait for v0.35.0.

  DetailFrame accepts both `toc.openAria` and `toc.closeAria`, or neither. Omitting both disables
  the mobile contents pill while retaining active tracking and fragment handling. Existing labelled
  callers and `pillEntries: []` remain valid.

  Document the yesid dot favicon repaint on SiteRoot mount and the CI-decided lockfile rule.
  See `docs/migrations/connect-module-fixes.md` for both products' bump requirements and checks.

<!-- release-fragment: connect-prune -->
- `@yesid/tokens` (minor), `@yesid/gates` (minor), `@yesid/seo-kit` (minor), `@yesid/ui` (minor), `@yesid/analytics` (minor): Remove unused public contracts. The owner approved removing them in this one release,
  without the usual deprecation wait (see DEPRECATION.md). Card keeps its root; compose children with ordinary markup. Sticky panels use
  product layout and the retained scrollChain action. Button, Badge, Sheet and Tabs keep their
  props and types while their variant functions stop being index exports. Remove the unused
  color-mix floor engine, CSP serializer and token parse subpath. Analytics referrer reduction
  and property filtering remain private behind createAnalytics with unchanged request behavior.
  See docs/migrations/connect-prune.md for exact exports, source scans and verification limits.

<!-- release-fragment: connect-station-tab-look -->
- `@yesid/ui` (minor): Add the opt-in `@yesid/ui/station-tabs.css` signage look for Tabs triggers and native navigation
  links. Import it after base.css and apply `station-tabs` to the rail and `station-tab` to controls.
  Active state follows bits-ui's `data-state="active"` or a link's `aria-current="page"`.
  Weight, inactive ink and inactive hover-rule color remain independently adjustable CSS variables.
  Hover keeps full-strength text and shows the existing 3px bottom rule. The inset focus outline
  uses the control's text color for visible keyboard focus on both inactive rails and active chips.
  Existing Tabs variants are unchanged. Product copy removal and regression checks happen at adoption.

<!-- release-fragment: motion-pointer-capability -->
- `@yesid/motion` (minor): Unify device capability policy through the existing `shouldAnimate(tier, input?)` export from
  both the root and `@yesid/motion/policy`. Its optional input is `pointer` or `touch-only`;
  existing calls without an input keep their motion-only behavior.

  All six hover effects require a hover-capable fine pointer, including a mouse on a touchscreen
  laptop or touch-primary tablet. PressBounce now runs only on touch devices without that
  capability, so boop and pressBounce are mutually exclusive. Hybrids use the same CSS press
  baseline as desktops; retain `tap-press` or a deliberate CSS alternative on pressBounce callers.
  The original transform-based action bodies and touch-only phone behavior are preserved.

  Existing reduced-motion tiers and Lenis behavior remain. Missing matchMedia makes input-gated
  actions inert, including on fresh imports. Checks apply at mount time. The device table covers
  all seven actions under both motion preferences, and browser tests verify desktop/hybrid CSS
  press feedback through the hover pulse and after it.

## 0.34.0

<!-- release-fragment: deepen-primitive-cleanup -->
- `@yesid/tokens` (minor), `@yesid/ui` (minor): Remove unused Toggle/ToggleGroup subpaths, Button variants secondary/destructive/link and sizes
  xs/lg/icon/icon-xs/icon-sm/icon-lg, Badge variants secondary/ghost/link, Sheet left, and unused
  inline-icon, button-group and invalid-state selectors. Use bits-ui directly for toggle behavior;
  choose an existing supported variant/size or own a product-specific treatment locally. FilterGroup
  keeps its DOM, classes and keyboard/selection behavior through bits-ui directly. Declared defaults,
  Gallery-only destructive Badge/right Sheet, and Button ghost's dark hover remain.

  Remove the eight sidebar color mappings, exact --radius, --secondary and --color-secondary.
  Use semantic color tokens directly, --radius-md instead of --radius, and --popover instead of
  --secondary. Keep --secondary-foreground and named radius tokens. Transit must migrate its
  MetricInfo radius before adopting this token output. See docs/migrations/deepen-primitives.md.
  These owner-approved removals have no deprecation window.

<!-- release-fragment: deepen-section-independent -->
- `@yesid/ui` (minor): Add `CollapsibleSection.independent` for filter and control panels that keep their own open
  state and stay outside content-section bulk actions, counts and the all-closed calculation.
  Use `<CollapsibleSection independent bind:open={panelOpen}>` without changing the card's
  rendering or storing disclosure state. Explicit section jumps still reveal the target panel
  and its containing disclosures. Included in the coordinated v0.34.0 minor with primitive cleanup.
  When content TOC entries exist, independent targets do not replace their active entry, counter
  or pill label through observation or explicit jumps. Empty-entry controllers retain target activity.
  Static independent panels have the same TOC protection; reveal requests leave their bound `open` unchanged.

<!-- release-fragment: section-jump-cancel -->
- `@yesid/ui` (patch): Keep in-flight section jumps through non-navigating clicks, including reopening the mobile TOC
  while layout settles. Navigation links, newer jumps, history, route changes, root changes and
  disposal still cancel stale landings. Real-component browser coverage reproduces the mobile
  regression; cancellation tests preserve navigation and history restoration.

## 0.33.0

<!-- release-fragment: deepen-disclosure -->
- `@yesid/ui` (minor): Replace QuietModeButton with SectionsToggle and quietMode with in-memory sections state.
  The single expand-all control collapses all content sections whenever any is open, and expands
  all only when every section is closed. It hides with fewer than two mounted collapsible content
  sections. The TOC card, filter groups and listing filter panels remain independent; the TOC does
  not count toward the content-section threshold.
  Remove remembered open/closed state, the Remember/Forget control, persistence props, quiet-mode
  classes/marks and remembered-state boot logic. openSection(anchor) opens mounted sections.
  See docs/migrations/deepen-disclosure.md for the breaking API renames/removals, consumer caller
  inventory and CSP hash migration. The owner explicitly requested these removals for the next minor
  on 2026-11-03; the standard deprecation waiting periods have not elapsed.

<!-- release-fragment: deepen-section-jump -->
- `@yesid/ui` (minor): Replace the public TOC helper cluster with createSectionJump, useSectionJump and SectionJump.
  One controller owns registration, active id, target opening, the 25% landing line, layout settling,
  request cancellation, router fragments and reduced motion. TocNav, TocPill and DetailFrame share
  it through navigation; content opening uses the section interface instead of private classes or
  trigger clicks. Real-section unit, SSR and Gallery tests cover the integration.

  This owner-directed breaking removal retires TOC_TARGET_SELECTOR, navigateToc, observeActiveToc,
  onTocNavigate, openCollapsedTocTarget, reconcileActiveToc, revealTocTarget, settleLayout,
  tocElement and RevealTocTargetOptions from the root and /brand entrypoints. The scoped exception
  to both waiting gates is recorded in DEPRECATION.md. See docs/migrations/deepen-section-jump.md
  for replacements, changed selector/landing semantics and the read-only consumer caller inventory.

<!-- release-fragment: navigation-lifecycle -->
- `@yesid/ui` (minor): Owner-approved breaking transition (2026-11-03, deepen D-c): initialize
  `createNavigationLifecycle({ beforeNavigate, onNavigate, afterNavigate })` once in the persistent
  app layout and pass its result as `SiteHeader.navigation`. The module interrupts Lenis even
  without a header, waits for menu closure and coordinates locale-switch focus through a native
  link ref. `LanguageToggle` is a plain link: remove its `onNavigate` prop.

  Copy now belongs entirely to each app's local locale files (Transit i18n messages and yesid.dev
  local locales, not the CMS): `SiteHeader.labels.menuFooter` and `skipToContent`, plus
  `LanguageToggle.names` (or `SiteHeader.language.names`), are required. Pass an empty footer
  explicitly to hide it. No built-in EN/FR/ES copy or language-name fallback remains. See
  `docs/migrations/navigation-lifecycle.md` for the exact Transit and yesid.dev changes and strings.
  This is source-stage work for the coordinated minor release, not consumer adoption or release proof.

  Navigation also re-closes a menu reopened during a slow loader, reconciles redirect and superseding
  events when `beforeNavigate` is skipped, and advances the stale-focus guard for each actual commit.
  The optional `NavigationEvent.event` preserves native trigger identity through custom adapters.
  Lenis momentum is canceled through its public stop/start API in both navigation hooks, independently
  of any header, without leaving input locked after cancellation. The migration includes the Transit
  unit harness and yesid.dev browser expectation updates required alongside the production calls.

  The router adapter optionally accepts `subscribeNavigation` for redirect continuity: every accepted
  original link start, including superseding links, carries its native event before loading/redirecting.
  Transit / Kit 2 can use `$app/stores.navigating.subscribe`. Kit 3 apps omit it and use the safe
  fallback: direct language switches preserve the menu through matching native hook events, while
  a language switch that lands on an eventless redirect closes the menu without locale refocus.
  There is no Kit 3 SDK adoption prerequisite. Partial/late subscriptions are unsupported; hook-only
  claims are dropped at eventless commits and completed-event replays are ignored. The lifecycle
  never observes DOM clicks or treats `defaultPrevented` as proof of router interception.

## 0.32.2

<!-- release-fragment: language-toggle-full-size -->
- `@yesid/ui` (patch): `LanguageToggle` keeps its boards full size at every width. Phones used to scale the whole post down to 34px, or 22px under 360px, which drew the language codes about 6px tall. The toggle no longer shrinks in a crowded pill, and below 768px it drops its side padding instead. The post stays centred and its pole runs past the 44px slot.

## 0.32.1

<!-- release-fragment: stop-scroll-on-navigate -->
- `@yesid/ui` (patch): `SiteHeader` stops a smooth scroll still in flight when a navigation starts. Clicking a link while Lenis was still easing let the old animation carry on and scroll the new page down, so it could open at its bottom instead of the top. Back and forward navigation still restore the saved position.

## 0.32.0

<!-- release-fragment: slider-button -->
- `@yesid/ui` (minor): Add `SliderButton` to `@yesid/ui/brand`: the shared previous/next control for sliders, carousels and lightboxes, with the chevron centred on the button. Replace hand-rolled arrow buttons with `<SliderButton direction="previous" aria-label={...} onclick={...} />`.

## 0.31.1

<!-- release-fragment: collapsible-mobile-padding -->
- `@yesid/ui` (patch): `CollapsibleSection` gives text more room on phones: below 768px the header, body and article-summary side inset drops from 24px to 16px. Desktop and tablet spacing is unchanged. The inset is one custom property, `--collapsible-pad-x`, set on the section card. No API change.

## 0.31.0

<!-- release-fragment: analytics-allowed-props -->
- `@yesid/analytics` (minor): Add allowlisted custom properties. A preset can declare `props: { key: [allowed values] }`; value lists may be runtime string arrays. `trackEvent(name, props)` sends a subset of them, and the new `context` option of `createAnalytics` adds properties to every pageview and event. Any key or value outside the allowlist is dropped in the browser, including properties from class-tagged clicks. `allowAnalyticsProps` exposes the filter. Presets without `props` behave as before and send no properties.

## 0.30.3

<!-- release-fragment: ordinary-reading-roles -->
- `@yesid/tokens` (patch), `@yesid/ui` (patch): Add explicit ordinary-reading size roles: prose 19/20px, block code 16/17px, inline code 0.95em, figure captions 16px, supporting prose 18px and section headings 20/22px, with desktop sizes starting at 1024px. Apply these roles with the documented line heights when adopting the package. The shared class merger recognizes them as font sizes, preserving text colours and replacing competing base sizes. Existing body, mono, caption, compact-density, control, data and artistic display sizes are unchanged. Gallery demonstrates the reading roles.

<!-- release-fragment: portable-style-regression-paths -->
- `@yesid/gates` (patch): Normalize style-regression hit paths to `src/` with forward slashes on every OS, including scan roots with a trailing separator. Windows callers receive the same finding paths as Linux callers.

<!-- release-fragment: seo-kit-og-background-grid -->
- `@yesid/seo-kit` (patch): Add the subtle blueprint grid to the default shared OG card: 40px minor lines and 200px major lines behind the existing content, using the token accent at 0.04/0.07 opacity. Card dimensions, typography, padding and public helper signatures are unchanged. Consumers receive the background after adopting the release; OG and Twitter reuse the same image asset.

<!-- release-fragment: seo-kit-satori-security-floor -->
- `@yesid/seo-kit` (patch): Require Satori >=0.33.5 and <1 to exclude versions affected by GHSA-wx4j-mvgx-mqwp. Consumers must upgrade their Satori peer before adopting this release. No rendering-helper signatures or injected-rasterizer call shapes changed.

## 0.30.2

<!-- release-fragment: header-link-tap-width -->
- `@yesid/ui` (patch): The last package controls under `--size-tap-min` now meet it: `SiteHeader` links are at least 44px wide with the label centred (a short label such as "Map" was 39px); the `Sheet` close button is a 44px square around the same icon (it was 16px), and a sheet header leaves room for it; the `CodeBlock` copy button is 44px tall inside the same title bar height (it was 29px) and keeps clear of the title when the bar wraps; nested `TocNav` entries are 44px tall like the top level (they were 36px).

## 0.30.1

<!-- release-fragment: resizable-server-separator -->
- `@yesid/ui` (patch): `ResizableHandle` server-renders as a static separator, out of the tab order, and becomes focusable once paneforge has written its `aria-valuenow`, `aria-valuemin` and `aria-valuemax` on mount. Server markup no longer fails axe `aria-required-attr`, so tests can run axe without waiting for hydration.

## 0.30.0

<!-- release-fragment: accessibility-in-the-packages -->
- `@yesid/tokens` (minor), `@yesid/ui` (minor), `@yesid/config` (minor): Accessibility moves into the packages, and both products share one page skeleton.

  - `SiteHeader` opens with a skip link to `#main` ("Skip to content" in en, fr or es; `labels.skipToContent` replaces it) and renders the pill inside a `header`, the page's banner. Render `<main id="main">` after `SiteHeader` and `SiteFooter` after `main`, outside it, then delete any local skip link. The pill's `nav` now carries `labels.nav`; `data-testid="nav"` stays on the outer box.
  - `LanguageToggle`'s name lists the codes the post shows, such as "Language: English (EN FR)". Tests that match the old name exactly need the codes.
  - Footer links are at least `--size-tap-min` wide, `Wordmark` at least that tall, and breadcrumb links 24px tall. The `TocPill` counter uses full `--primary`. Sheets skip their open and close animations under reduced motion. `base.css` adds a focus outline under forced colors.
  - The light `--primary` is `#985000` (was `#A05500`) and `--primary-hover` `#7D4000` (was `#854500`), so primary text passes AA on tinted cards too. Tests pinned to the old values need the new ones. `@yesid/tokens` now tests its semantic contrast pairs, so products can delete their copies.
  - `@yesid/config/playwright`: `expectAccessible` also fails on a name that leaves out its visible text (WCAG 2.5.3). New `expectTapTargets(page, { exclude })` and `expectNoHorizontalOverflow(page, scrollers)`.

## 0.29.0

<!-- release-fragment: config-playwright -->
- `@yesid/config` (minor): Adds `@yesid/config/playwright`. `yesidProjects(baseURL)` returns the standard Playwright projects: `phone` (390×844), `tablet` (768×1024) and `desktop` (1440×900) for untagged tests, `reduced-motion` for tests tagged `@motion`, and `light` and `dark` (seeded through the `theme` localStorage key) for tests tagged `@theme`. `expectAccessible(page, { include, exclude })` fails a test on any serious or critical axe violation of WCAG 2.2 AA or axe best practice; the contrast rule skips blueprint art (`.blueprint-bg`). `@playwright/test` and `@axe-core/playwright` are optional peer dependencies: install them in the same package.json as `@yesid/config` (the workspace root in a monorepo), since a root package cannot see peers installed in a child workspace.

  Deprecates `@yesid/config/turbo/base.json` and the `@yesid/config/tsconfig/base.json` subpath, which have no consumer: each app commits its own `turbo.json`, and products extend `tsconfig/library.json` or `tsconfig/svelte-kit.json`, which keep their base. Replacement: keep your own `turbo.json`, and extend `library.json` or `svelte-kit.json`. Earliest removal: v0.31.0, and not before 90 days after v0.29.0 is published.

<!-- release-fragment: language-toggle-tap-size -->
- `@yesid/ui` (patch): `LanguageToggle`'s link keeps the 44px tap minimum (`--size-tap-min`) on phones. It was 38px wide below 480px and 26px below 360px; the drawing keeps its phone size inside the wider target.

<!-- release-fragment: seo-kit-highlight -->
- `@yesid/seo-kit` (minor), `@yesid/ui` (minor): `@yesid/seo-kit/highlight` adds `highlight(code, lang)`, server-side Shiki highlighting with the JavaScript regex engine. It resolves to token markup for a `<code>` element in `syn-*` classes, with no inline styles, and returns unknown languages escaped. `shiki` 4.x is a new optional peer dependency, needed only for this subpath. `@yesid/ui/base.css` colors the `syn-*` classes through the `--syntax-*` tokens. `CodeBlock`'s copy labels take an optional `copied`, and a polite status now announces `copied` or `failed` after a copy; the visible ✓ and failure label are unchanged.

## 0.28.1

<!-- release-fragment: article-header-still-grid -->
- `@yesid/ui` (patch): `ArticleHeader` holds its circuit grid still while the page scrolls. The grid is fixed to the viewport and clipped to the header, so it lines up with a fixed page grid instead of sliding over it. Nothing else in the header changes.

<!-- release-fragment: closer-phone-spacing -->
- `@yesid/ui` (patch): `ConstructionProps` with `layout="around-fixture"` now spaces its four artworks evenly on phones (below 768px). The order is balise, sign, a centred 40px gap for the caller's light, helmet, barricade, with equal gaps while the row fits its container (304px or wider); a narrower container shrinks the artwork to fit. Its phone rules now use a plain `(max-width: 767px)` query, so they apply without the consumer compiling `@custom-media`; consumers that already compile it get the same CSS. Artwork sizes, wider viewports and the other layouts are unchanged.

## 0.28.0

<!-- release-fragment: c1-carried-fixes -->
- `@yesid/tokens` (minor), `@yesid/motion` (minor), `@yesid/seo-kit` (minor), `@yesid/ui` (minor): `StateNotice` with a `role` is named by its title. `QuietModeButton` paints the remembered labels before hydration instead of flipping them when the app starts. A view transition that a reload cuts short no longer logs `AbortError: Transition was skipped`: `viewTransition` and the head boot script catch its `ready` promise, and `boot.json` carries the new hash. `@yesid/ui/blueprints` exports `BlueprintProps`, the props every drawing takes. `.circuit-grid` and `ArticleHeader`'s grid anchor their lines to the top-left corner, so the grid no longer slides when the page grows.

  Removed without a deprecation period under the owner's 2026-10-29 waiver of both DEPRECATION.md gates; neither app nor the Gallery imports any of them. `@yesid/motion` loses `./utils/sectionMagnet` and its root re-exports (`initSectionMagnet`, `findSettleTarget`, `DESKTOP_TIER`, `TOUCH_TIER`, `MagnetTier`, `SectionMagnetOpts`, `SettleTargetOpts`). `@yesid/tokens` loses `./serialize`, `./types`, `./generators/tokens-css`, `./generators/theme-css`, `./generators/motion-ts` and the legacy `./src/parse.ts`, `./src/generators/tokens-css.ts` and `./src/generators/motion-ts.ts` aliases. `@yesid/seo-kit` loses the `./satori` subpath; `renderSatoriPng` stays in the root export. `@yesid/ui` and `@yesid/ui/brand` stop exporting `flattenToc`, `landTocFragments` and `resolveTocCounter`, and `@yesid/ui/state` stops exporting `DESKTOP_MIN_WIDTH`. To migrate, there is nothing to change unless you imported one of these; `DetailFrame`'s `toc.landFragments` replaces a direct `landTocFragments()` call.

<!-- release-fragment: release-tgz-assets -->
- `@yesid/tokens` (minor), `@yesid/motion` (minor), `@yesid/gates` (minor), `@yesid/seo-kit` (minor), `@yesid/ui` (minor), `@yesid/analytics` (minor), `@yesid/i18n-core` (minor), `@yesid/config` (minor): Each package now ships as its own tarball on the GitHub Release (`yesid-<pkg>-X.Y.Z.tgz`), with a
  build-provenance attestation. Install them by URL instead of vendoring: see
  `docs/BUILD-A-YESID-PRODUCT.md`. `@yesid/ui` and `@yesid/seo-kit` take their sibling packages as
  peer dependencies pinned to the same release, so list every `@yesid` package the app uses.
  `@yesid/config` joins the lockstep version and the separate `config-v*` releases end. The adoption
  CLI, the `yesid.dev-design-vX.Y.Z.tar` archive and the schema-2 `manifest.json` are removed under
  the owner's 2026-10-29 waiver (see `DEPRECATION.md`).

## 0.27.0

<!-- release-fragment: analytics-always-on -->
- `@yesid/ui` (minor), `@yesid/analytics` (minor): `@yesid/analytics` measures without asking. `createAnalytics(preset, { domain })` (in `./client` and the root export) wraps the official `@plausible-analytics/tracker`, now a dependency: it captures pageviews, including client-side navigation, and returns `trackEvent`, typed to the preset's events. Only pageviews, engagement and the preset's custom events are sent, never custom properties or revenue, including events the tracker raises on its own (class-tagged clicks, `window.plausible`). It sends nothing unless `domain` is set and the page is served from that host or one of its subdomains, and it is a no-op without a browser location. Requests carry only the page path, bounded campaign tags and the referrer's origin; nothing is written to cookies or browser storage. `AnalyticsPreset` is now `{ events }`, and `svelte` is no longer a peer dependency.

  Removed without a deprecation period. The owner waived both DEPRECATION.md gates (90 days and the intervening minor) on 2026-10-29 for every removal below: there are no third-party consumers and both apps drop consent in this cycle. `@yesid/ui/feedback` loses `AnalyticsConsent`, `AnalyticsConsentCopy` and `AnalyticsConsentProps`, and `@yesid/ui` no longer depends on `@yesid/analytics`. `@yesid/analytics` loses `./consent` (`createAnalyticsConsentStore`, `probeDurableAnalyticsStorage` and their types), `./policy` (`getAnalyticsPolicy`, `normalizeAnalyticsControls` and their types), `./plausible` (`sendPlausibleEvent`, `PLAUSIBLE_ENDPOINT`, `PLAUSIBLE_REQUEST_TIMEOUT_MS` and their types), `createAnalyticsClient`, `createPathnamePageviewTracker`, `AnalyticsClient` and `AnalyticsClientDependencies` from `./client`, and `AnalyticsStorageKeys` with `AnalyticsPreset`'s `domain` and `storageKeys` from `./config`. Measurement no longer asks, so the consent parts have no replacement. To migrate, delete the consent UI, store, policy and their storage keys, drop `domain` and `storageKeys` from the preset, replace `createAnalyticsClient` and any pageview code with one `createAnalytics(preset, { domain })` call when the app mounts, and allow `connect-src https://plausible.io`.

## 0.26.0

<!-- release-fragment: p4-construction-props -->
- `@yesid/ui` (minor): Add ConstructionProps and ConstructionFloodlight: the four original Montréal construction artworks, optional warm lighting and lit/unlit fixtures, and a scroll-linked reveal beginning when the footer has entered 5% of the active viewport. Reduced motion switches instantly and no-JavaScript artwork stays visible.

## 0.25.3

<!-- release-fragment: p4-manifesto-strength -->
- `@yesid/ui` (patch): Quiet Manifesto circuit backgrounds uniformly through one shared strength default, including static nodes, pointer traces, warm glow and ripple ink. Preserve foreground and listing blueprint ink.

## 0.25.2

<!-- release-fragment: p3-header-copy-contrast -->
- `@yesid/ui` (patch): Protect listing-header glyphs with a solid page-colour shadow beneath their existing soft halo, preserving blueprint ink and header layout.

## 0.25.1

<!-- release-fragment: p3-listing-headers -->
- `@yesid/ui` (patch): `ListingFrame` draws every header drawing at one ink, `--blueprint-ink` on the art slot (0.32 dark, 0.5 light, a step bolder than before). It overrides the opacity `BlueprintShell` and inline styles give the drawings, so apps can delete their own listing-header opacities; an app rule that also forces opacity with `!important` must go. The header copy gets a halo in the page colour, and rests on the bottom of the band at every width; from 1024px without an `aside` it used to sit at the top.

## 0.25.0

<!-- release-fragment: p1-polish-review -->
- `@yesid/tokens` (patch), `@yesid/ui` (patch): `SiteHeader`'s menu line now runs from each item's icon to the next one, short viewports included. The token doctrine names conversion buttons as the only clickable yellow surface and underlined text links as yellow's second interaction.

<!-- release-fragment: p1-polish -->
- `@yesid/tokens` (patch), `@yesid/motion` (patch), `@yesid/ui` (minor), `@yesid/i18n-core` (patch): Polish from the owner's review of both sites. `SiteHeader` menu items take an optional `icon` (a Lucide icon component) that replaces the stop and lights up on the current page, and the menu footer now defaults to "Navigation · All routes" in the language's locale (en, fr, es); `labels.menuFooter` still replaces it, and an empty string hides it (before, an omitted label hid the footer). `@yesid/ui/base.css` makes every link without a class a text link: underlined, in `--accent-text` (yellow in dark, amber in light), with a thicker underline on hover; component links keep their own styles. `ArticleHeader` centers the back link between the chrome and the next line, drops its fixed minimum height and sizes the title with `--text-title` (smaller at every width, and density-aware); apps whose `--chrome-offset` leaves a gap under their chrome set `--chrome-gap`. `SurfaceRail`'s phone sheet now opens centred instead of sliding in from the right. `@yesid/i18n-core`'s `localizeHref` keeps a query or hash while switching the locale (`/fr?provider=stm` now localizes to `/?provider=stm`) and decides path exemptions without them. `@yesid/motion`'s `blueprintScrub` redraws when its trigger resizes, so content rendered after mount no longer leaves a stale first draw. The token doctrine now names underlined text links as a yellow (`accent-text`) job. To migrate, delete local text-link styles and the classes that only styled links, move any typography those rules set onto the surrounding element, pass `icon` per menu item, and drop a menu-footer label that repeats the default.

## 0.24.0

<!-- release-fragment: ds7-brand-surfaces -->
- `@yesid/tokens` (minor), `@yesid/motion` (minor), `@yesid/ui` (minor): The brand surfaces move into the packages. `@yesid/ui/brand` adds `TerminalPanel`, the terminal window (signal-head title bar with `title`, `tag`, `status` and an `actions` snippet, a hazard rule, the body and an optional `footer` readout), `CodeBlock`, which shows source in a `TerminalPanel` with the language as its tag and an optional copy button and takes the app's highlighted `<pre>` as `children`, and `ManifestoCanvas`, the circuit-node backdrop of brand headers (static under reduced motion). `ArticleHeader` now renders a `ManifestoCanvas` by default; its `canvas` snippet replaces it, and an empty snippet leaves the header plain. `@yesid/ui/base.css` styles the terminal and code-block classes (`.terminal-*`, in the components layer), so markup rendered on the server can wear the same chrome. `@yesid/ui/blueprints` (new) exports 40 blueprint drawings in `currentColor`, such as `BlueprintBridge` and `BlueprintSignal`; `BlueprintBusSide` takes the fleet's `operator`. `.led-pulse` now stops under reduced motion, as documented. `@yesid/tokens` adds the `syntax` group (`--syntax-keyword`, `-string`, `-number`, `-function`, `-comment`, `-punctuation`, `-plain`), aliases of the brand voices for code highlighting. `@yesid/motion/utils/blueprintScrub` (new) exports `blueprintScrub(band, trigger = band)`, which draws a header's blueprint art as `trigger` scrolls through the viewport; it fits `ListingFrame`'s `onHeaderMount`. To migrate, delete local manifesto canvases and the `canvas` snippets that pass them, local terminal panels and their CSS, code blocks, blueprint scrubs and drawings, import these instead, and color highlighters through `--syntax-*`.

  Removed, with the owner's waiver of the 90-day wait (the intervening-minor requirement is met for every removed contract, and neither consumer uses them): `@yesid/tokens/generators/theme-block` and its legacy `./src/generators/theme-block.ts` alias (`generateThemeBlock`, `replaceThemeRegion`; deprecated in v0.18.0, use `@yesid/tokens/theme.css` or `generateThemeCss`), `MetroStation`'s `roundel` snippet (deprecated in v0.19.0; the default roundel is the one every product uses), and `QuietModeInit` with its `storageKey` plus `SiteRootProps.quietModeKey` (deprecated in v0.22.0; quiet mode always uses the standard `quiet-mode` key, the one the boot script reads). To migrate, delete any use of them.

## 0.23.0

<!-- release-fragment: ds6-foundation-primitives -->
- `@yesid/ui` (minor), `@yesid/analytics` (minor): `@yesid/ui` adds the parts of a data page. `@yesid/ui/feedback` (new) exports `StateNotice`, a quiet empty, error or status notice in five presentations and four tones, and `AnalyticsConsent`, the consent rail for an `@yesid/analytics/consent` store with the product's copy, controls and privacy link. `@yesid/ui/table` (new) exports `DataTable`, a captioned table from column definitions that stacks into label and value pairs or scrolls sideways on narrow screens; a scrolling table that overflows becomes a focusable region named by its caption. `@yesid/ui/layout` adds `Surface`, `Masthead`, `Breadcrumb` (a named trail with the current page last), `ControlsRail`, `DashboardGrid` and `SurfaceRail` (a sticky rail from 1024px, a pill and bottom sheet below). `@yesid/ui/brand` adds `CornerMeta`, `SegmentedChoice` (a single choice with radio-group keyboard behavior) and `ToggleChip` (a controlled `aria-pressed` pill). `@yesid/ui` now depends on `@yesid/analytics`. `@yesid/analytics/vitals` (new) holds the web-vitals beacon schema and `startVitals({ endpoint, load })`, which collects Core Web Vitals once per page and sends one beacon when the page is hidden; `load` supplies the `web-vitals` module. To migrate, delete local copies of these parts and import them from the packages; static pills use `Badge variant="tag"`.

## 0.22.0

<!-- release-fragment: ds5-i18n-and-format -->
- `@yesid/ui` (minor), `@yesid/i18n-core` (minor): `@yesid/i18n-core` adds `createIntl`, which binds each app locale to an Intl tag and returns cached `number`, `dateTime`, `collator` and `plural` Intl objects plus `relativeTime` (a signed offset in seconds read in its largest whole unit, with Intl's own "now" under 5 seconds), and `createCopy`, which returns a `defineCopy` that type-checks every locale against a source locale's keys and signatures. `@yesid/ui/state` adds `clock`, a shared wall clock (1 s tick while subscribed, 30 s under reduced motion, paused in hidden tabs) with a server-time anchor, and `createLocaleContext`. `SiteRoot` takes `lang` and keeps `<html lang>` current after client navigation. A remembered quiet mode now paints right on reload: the head boot script closes every section that follows quiet mode (marked `data-quiet`) before first paint, and `SiteRoot` restores quiet mode before its children render, so they hydrate closed. `@yesid/ui/boot.json`'s hash changes. Importing `@yesid/ui/state` no longer throws where there is no `window` (a node test that loads Svelte's client build); `desktop.current` reads false there. Deprecated: `QuietModeInit.storageKey` and `SiteRootProps.quietModeKey`, because the boot script only reads the standard `quiet-mode` key; a custom key keeps working, but what the boot script paints can disagree with it until hydration. They stay through v0.23.0: removal is no earlier than v0.24.0 and 90 days after this release is published. To migrate, delete local formatter caches, relative-time tables, locale-context code, `<html lang>` effects and clock stores, bind `createIntl`, `createCopy` and `createLocaleContext` once per app, pass `lang` to `SiteRoot`, drop any `quietModeKey`, and take the new `boot.json` hash into a hash-based CSP.

## 0.21.0

<!-- release-fragment: ds4-head-seo-assets -->
- `@yesid/seo-kit` (minor), `@yesid/ui` (minor): `@yesid/ui/head` adds `SeoHead`, which writes a page's title, description, canonical and hreflang, Open Graph, Twitter, robots and one `@graph` JSON-LD script from resolved values, and `injectThemeBoot`, which swaps `%yesid.themeBoot%` in `app.html` for the pre-paint script. That script sets the stored theme and, as the parser adds them, the stored open or closed state of persisted collapsibles, so a reload no longer paints a closed section open. `@yesid/ui/boot.json` carries the script's CSP hash. `CollapsibleSection`, `FilterGroup` and `ListingFrame` mark their state with `data-persisted-key` and `data-persisted-body`; `ChevronToggle` and `FilterGroup` style from `data-state` instead of the `chevron-open` and `filter-open` classes. The theme store also repaints `link[rel="icon"]` with the brand mark in `--primary`. `@yesid/seo-kit` adds `serializeJsonLd`, `robotsTxt`, the share card (`./og` with `renderOgPng` and the token palette, `./og/fonts` for Vite and `./og/files` for Bun scripts, with Inter and JetBrains Mono TTFs), `./icons` (`brandMarkSvg`, `touchIconSvg`) and `./headers` (`SECURITY_HEADERS`, `contentSecurityPolicy`). To migrate, replace the app's SeoHead, OG template and fonts, favicon builder and app.html theme script with these, and change any test that reads `chevron-open` or `filter-open` to read `data-state` or `aria-expanded`.

## 0.20.0

<!-- release-fragment: ds3-site-header -->
- `@yesid/ui` (minor): `@yesid/ui/layout` adds `SiteHeader`, the floating pill header with the full-screen metro-line menu: wordmark, `links` (with `priority` 2 and 3 folding them away below 500px and 1024px of header width), an optional `search` snippet from 1024px, an `actions` snippet, and the theme, language and menu controls. It takes `beforeNavigate`, `onNavigate` and `afterNavigate` from `$app/navigation` as its `navigation` prop. `--site-header-inset-end` makes room for a docked side panel. `@yesid/ui/brand` adds `Wordmark`, `LanguageToggle` (the signpost; the app supplies each locale's `href`, and `preserveState` keeps scroll then resets focus) and `resetFocusAfterNavigation`. `@yesid/ui/base.css` now defines the header geometry (`--nav-top` through `--nav-clearance`); `--chrome-offset` stays app-owned. To migrate, replace the app's nav, menu overlay, language switch and wordmark with these and delete the app's copies of the `--nav-*` variables.

  `ArticleHeader` is about 25% shorter again at the owner's request: tighter padding and gaps around the same title, meta and controls (minimum height 240px from 1024px wide, 220px below).

## 0.19.1

<!-- release-fragment: toc-landing-line -->
- `@yesid/ui` (patch): TOC jumps land on the active-section line. `navigateToc` and `revealTocTarget` (with the default `block: 'start'`) now place the target a quarter down the viewport instead of flush under the site chrome, and `observeActiveToc` reads that same line, so after a jump the pill counter and the highlighted entry name the section the reader picked. App scroll margins no longer affect TOC jumps. No API changes.

## 0.19.0

<!-- release-fragment: ds2-adoption-sweep -->
- `@yesid/motion` (minor), `@yesid/ui` (minor): The package defaults take the settled looks, so consumers can delete their adapters. `Card` has a lit top bevel and adds `shadow-section` on hover. `Button` adds the `conversion` variant (yellow signage CTA with an amber lift at cta sizes) and the 44px `icon-tap` size, uses `text-sm`/`text-xs`, and keeps a caller's `data-slot`. The resizable handle is neutral, the hazard `Separator` is full width by default, `StickyPanel` is `surface-3` with no shadow and chains wheel scrolling through `scrollChain`, `TerminalCursor` is `accent` in dark, and the `MetroStation` default roundel matches the signage Badge, so its `roundel` snippet is deprecated: omit it to get the default. It keeps working, and the earliest removal is the later of 90 days after the v0.19.0 publish date and v0.21.0. `ArticleHeader`'s subtitle now uses the meta row's mono type, and both use the larger `--article-meta-size`. `@yesid/ui/base.css` adds the View Transitions route crossfade, off under reduced motion. `@yesid/motion/utils/gsap` adds `loadDrawSVG`, `loadMorphSVG` and `loadCustomEase`; `@yesid/motion/utils/viewTransition` exports `viewTransition` for `onNavigate`. To migrate, delete local Card, Button, resizable handle, StickyPanel, TerminalCursor, MetroStation and hazard-separator adapters, local GSAP loaders and route fades, and call `onNavigate(viewTransition)` from the root layout.

## 0.18.0

<!-- release-fragment: tokens-one-source -->
- `@yesid/tokens` (minor), `@yesid/ui` (minor): Make the tokens the one source for the Tailwind theme, fonts and density. `@yesid/tokens` adds `theme.css` (the Tailwind `@theme` map plus the semantic color utilities, from the new `@yesid/tokens/generators/theme-css` `generateThemeCss`), `fonts.css` with bundled Inter and JetBrains Mono latin and latin-ext files (OFL), `preloadFont` from `@yesid/tokens/fonts`, new tracking, measure, glass blur, `size.tap-min` and `z.footer` tokens, and a `density.compact` group that `tokens.css` emits as a `[data-density="compact"]` block. `@yesid/ui/base.css` now imports `@yesid/tokens/theme.css`, adds `.glass-chrome`, and `.label-section` reads `--tracking-eyebrow`. To migrate, delete the pasted TOKENS region, any `@theme inline` color map and duplicate `--font-*` variables from the app stylesheet, import `@yesid/tokens/fonts.css` from the root layout, preload with `preload: ({ type, path }) => type !== 'font' || preloadFont(path)` in SvelteKit's `resolve`, and have dense apps such as Transit set `data-density="compact"` on `<html>`. Deprecated in v0.18.0: `generateThemeBlock` and `replaceThemeRegion` from `@yesid/tokens/generators/theme-block` (and the legacy `./src/generators/theme-block.ts` alias); the replacement is `@yesid/tokens/theme.css` or `generateThemeCss`. They keep working, and the earliest removal is the later of 90 days after the v0.18.0 publish date and v0.20.0, since v0.19.0 is the intervening minor.

## 0.17.0

<!-- release-fragment: detail-footer-error-frames -->
- `@yesid/ui` (minor): Add the shared detail, footer and error frames. `@yesid/ui/layout` now exports `DetailFrame` (header, hazard rule, toolbar, left rail or a caller-owned `rail`, center, right rail, `after`, TOC tracking and `TocPill`), `ArticleHeader` (no tag pills; `highlight` accents one title keyword; `canvas`, `decorations`, `actions` and `controls` snippets; about 25% shorter; decorative text at `--article-deco-opacity`, 0.25), `SiteFooter` and `ErrorPage`, with their prop types. `@yesid/ui/brand` adds `ErrorIllustration`, whose sign text comes from `code` and `signLabel`. `@yesid/ui/base.css` now carries the semantic `@theme inline` color utilities and the small-screen metric-value size. To migrate, render `DetailFrame` and `ArticleHeader` from detail pages (pass the app's background canvas through `canvas` and its quiet-mode button through `controls`), `SiteFooter` from the root layout and `ErrorPage` from `+error.svelte`, pad full-bleed detail pages' tops by `--chrome-offset`, keep `afterNavigate(onTocNavigate)` in the app, delete the local shells, headers, footer and error illustration, and drop the color map from the app stylesheet.

## 0.16.0

<!-- release-fragment: listing-frame -->
- `@yesid/ui` (minor): Add the shared listing frame. `@yesid/ui/layout` now exports `ListingFrame`: edge title, accent rail, blueprint header, hazard rule, a filter column and the results. From 1024px its filter panel is always shown, so desktop filters work before hydration and without JavaScript. Below 1024px a toggle opens it, with the open state kept under `persisted:<filterPersistKey>`. `onHeaderMount(header, frame)` starts header motion such as a scroll scrub and returns its cleanup. The frame offsets itself by `--chrome-offset`. `@yesid/ui/brand` adds `FilterGroup`, `FilterSection`, `FilterSummary` and `SearchInput` with their prop types; they hold no product wording, so `FilterGroup` takes `allLabel`, `FilterSummary` takes `countLabel`, `locale` and `clearLabel`, and `SearchInput` takes `label`. To migrate, render `ListingFrame` from the listing page, pass the search field and filters as snippets, define `--chrome-offset` if the app names its chrome height differently, and delete the local shell, filter components and listing CSS. `FilterGroup` has no `joined-grid` variant; render a segmented control directly instead.

## 0.15.0

<!-- release-fragment: navigation-brand-atoms -->
- `@yesid/motion` (minor), `@yesid/ui` (minor): Add table-of-contents navigation and brand atoms. `@yesid/ui/brand` now exports `CollapsibleSection`, `CornerMarks`, `MetricDisplay`, `SectionHeading`, `SectionIcon`, `StatusDot`, `TocNav` and `TocPill` with their prop types, plus the toc helpers `TOC_TARGET_SELECTOR`, `flattenToc`, `landTocFragments`, `navigateToc`, `observeActiveToc`, `onTocNavigate`, `openCollapsedTocTarget`, `reconcileActiveToc`, `resolveTocCounter`, `revealTocTarget`, `settleLayout` and `tocElement`. `@yesid/ui/state` adds `persisted`, tab-scoped state whose values must be locale-free. `@yesid/motion` adds `./lenis.css`, which `@yesid/ui/base.css` now imports. `CollapsibleSection` follows quiet mode by default and stores only reader choices under `persisted:<sectionKey>`. `TocPill` defaults `onNavigate` to `navigateToc`, which jumps under reduced motion. To migrate, import from `@yesid/ui/brand` and `@yesid/ui/state`, delete the local copies, and drop any direct `lenis/dist/lenis.css` import. Drop `closeSignal`, `bulkCollapsed` and any `openSignal` fed from quiet mode: the default follows quiet mode, and `quiet={false}` opts out. Keep `openSignal` only for opens the reader triggers, and remove quiet-mode terms from combined signals, because every change counts as a reader click and is stored. Pass Transit-style absence text through `MetricDisplay`'s `absent` snippet.

## 0.14.1

<!-- release-fragment: lenis-registers-scrolltrigger -->
- `@yesid/motion` (patch): `initLenis` now registers ScrollTrigger before it reads `ScrollTrigger.isTouch`. Before, Lenis started on touch devices whenever the app had not yet called `initScrollTriggerConfig()`, which is the case when `SiteRoot` mounts before the app's own `onMount`. Apps that already call `initScrollTriggerConfig()` first are unaffected.

<!-- release-fragment: rune-modules-prebundle -->
- `@yesid/ui` (patch), `@yesid/analytics` (patch): Fix consumer Vite dev servers. vite-plugin-svelte pre-bundles vendored `.svelte.ts` modules without stripping TypeScript, so the `@yesid/ui/state` stores failed with `Unexpected token` under `vite dev`. Production builds were unaffected. The two rune modules now ship as `.svelte.js` with `.d.ts` declarations beside them, and `@yesid/analytics/consent`, which uses no runes, moves to a plain `consent.ts`. Public subpaths and types are unchanged.

## 0.14.0

<!-- release-fragment: adoption-release-safety -->
- `@yesid/tokens` (patch), `@yesid/motion` (patch), `@yesid/gates` (patch), `@yesid/seo-kit` (patch), `@yesid/ui` (patch), `@yesid/analytics` (patch), `@yesid/i18n-core` (patch): Harden adoption path validation with identity-bound, token-scoped recovery evidence, and carry the existing LICENSE, NOTICE, and TRADEMARK.md bytes through coordinated archives and installed vendor trees starting at v0.13.4 while preserving older immutable archive layouts.

<!-- release-fragment: gate-filesystem-safety -->
- `@yesid/gates` (patch): Make comment scanning linear and bounded, and make stable-tree filesystem traversal deterministic, resource-bounded, explicit about rejecting observed links, and portable across POSIX and Windows path semantics.

<!-- release-fragment: runtime-contracts -->
- `@yesid/motion` (patch), `@yesid/analytics` (patch): Bind ticker disposers to their own registration and contain analytics hostname and listener-teardown failures in the unavailable consent state.

<!-- release-fragment: site-root-foundation -->
- `@yesid/motion` (minor), `@yesid/ui` (minor): Add the shared app root and its state. `@yesid/ui/layout` exports `SiteRoot`, which initializes the theme and quiet mode and owns the Lenis lifecycle. `@yesid/ui/state` exports the `theme`, `quietMode`, and `desktop` stores, `@yesid/ui/brand` adds `ThemeToggle`, and `@yesid/ui/base.css` holds the base layer both products share. `QuietModeButton` state and actions now default to the shared store, and existing controlled usage is unchanged. `@yesid/motion` exports `scrollChain` from `./actions`, and `initLenis` accepts an optional `{ wrapper, content }` element scroller. Both packages move their `happy-dom` dev dependency to `^21.0.4`. Migration: wrap the root layout in `SiteRoot`, import `@yesid/ui/base.css` after Tailwind, and delete the local theme and quiet-mode stores, `ThemeToggle`, and `scrollChain` copies.

## 0.13.3

<!-- release-fragment: architecture-efficiency-pass-2 -->
- `@yesid/tokens` (patch), `@yesid/motion` (patch), `@yesid/gates` (patch), `@yesid/seo-kit` (patch), `@yesid/ui` (patch), `@yesid/analytics` (patch), `@yesid/i18n-core` (patch): Give every coordinated package a local ownership contract covering its interface, invariants,
  consumers, commands, failure modes, deterministic rules, and release implications. Remove
  duplicated tokens and motion narration from package manifests after those facts move to the
  nearest README. Make style-regression scans read each source file once while preserving finding
  order, diagnostics, and caller-owned RegExp state.

## 0.13.2

<!-- release-fragment: postphase3-contract-docs -->
- `@yesid/tokens` (patch), `@yesid/ui` (patch): Move fluid-token and UI compatibility guidance into durable package contracts without changing public APIs, runtime behavior, or token values.

<!-- release-fragment: postphase3-lineage-cleanup -->
- `@yesid/tokens` (patch), `@yesid/motion` (patch), `@yesid/ui` (patch): Remove historical lineage labels from package comments and token descriptions without changing APIs, behavior, or token values.

## 0.13.1

<!-- release-fragment: absolute-ui-guide-link -->
- `@yesid/ui` (patch): Fix the vendored UI README link to the immutable v0.13.1 product setup guide.

## 0.13.0

<!-- release-fragment: 035-footer-ripple-strip -->
- `@yesid/tokens` (minor), `@yesid/motion` (minor), `@yesid/ui` (minor): Add the footer leaf primitive subpath, the opt-in global ripple utility and stylesheet subpaths, and the semantic strip-height token with its public CSS output.

## 0.12.0

<!-- release-fragment: p2-i18n-core -->
- `@yesid/i18n-core` (minor): Add consumer-configured locale-routing mechanics with injected locale values, route exemptions, route-segment syntax, and URL-state preservation semantics.

## 0.11.1

<!-- release-fragment: p2-wordmark-autoplay-cleanup -->
- `@yesid/motion` (patch): Cancel delayed wordmark autoplay and active GSAP timelines when the motion action is destroyed.

## 0.11.0

<!-- release-fragment: i1-neutral-analytics -->
- `@yesid/analytics` (minor): Add neutral consent-aware analytics policy, sanitization, client, and injected Plausible transport primitives.

## 0.10.0

<!-- release-fragment: d1-canonical-breakpoints -->
- `@yesid/tokens` (minor): Add canonical tablet and desktop min/max breakpoint tokens and generated custom-media aliases for reusable consumer media queries.

## 0.9.0

<!-- release-fragment: d3-quiet-mode-button -->
- `@yesid/ui` (minor): Add the controller-neutral `QuietModeButton` brand component with caller-owned copy, state, actions, and an explicit optional glow effect.

## 0.8.0

<!-- release-fragment: i2-seo-foundation -->
- `@yesid/gates` (minor), `@yesid/seo-kit` (minor): Add framework-neutral JSON-LD, sitemap, and injected-rasterizer Satori primitives, plus reusable sitemap and Open Graph coverage engines.

## 0.7.1

<!-- release-fragment: reduced-motion-resubscribe -->
- `@yesid/motion` (patch): Refresh the OS reduced-motion preference when the store gains its first subscriber so preference changes while idle never leave later consumers with a stale animation policy.

## 0.7.0

<!-- release-fragment: u1-package-contracts -->
- `@yesid/tokens` (minor), `@yesid/motion` (minor), `@yesid/gates` (minor), `@yesid/ui` (minor): Move the four vendorable packages to one lockstep release, publish explicit conditioned source and opt-in CSS exports, tighten UI props to rendered behavior, and make UI configuration single-assignment per ESM module graph.

<!-- release-fragment: u2-token-ownership -->
- `@yesid/tokens` (patch): Make token generation a pure logical engine, keep repository paths in the private adapter, and establish `@yesid/tokens/tokens.css` as the single committed public CSS artifact.

<!-- release-fragment: u3-policy-neutral-gates -->
- `@yesid/gates` (minor): Remove product-named preset subpaths and policy tables, require consumers to provide their own brand hex policy, and expose only pure parameterized gate engines with app-neutral defaults.

<!-- release-fragment: u4-verified-adoption -->
- `@yesid/tokens` (minor), `@yesid/motion` (minor), `@yesid/gates` (minor), `@yesid/ui` (minor): Replace schema-1 shallow-clone adoption with schema-2 immutable Release acquisition, deterministic trust receipts, atomic installation, durable rollback and recovery, stable operational exits, and offline verification by the vendored tool bundle.

<!-- release-fragment: u5-ui-accessibility -->
- `@yesid/ui` (patch): Preserve semantic foreground utilities across every typography token, keep filtered combobox keyboard selection and listbox relationships accessible, and make scrollable UI surfaces keyboard reachable.
