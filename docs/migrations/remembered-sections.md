# Remembered sections (connect c-10)

`@yesid/ui` carries this owner-approved behavior contract in a **minor** bump. Both yesid.dev and
Transit start with content collapsed on a first visit, with an orange expand-all control and
the `glow` active effect. An explicit bulk choice wins across later pages and visits on that
origin. Pages with fewer than two collapsible content sections have a hidden control and use
declared defaults. The TOC starts open. Filters, listing panels, static cards, `independent`
panels and map tools keep their own defaults and actions.

## Storage and rendering contract

- `localStorage['sections-choice']` is exactly `collapsed` or `expanded`. Only bulk actions write
  it, including the shared `sections` bulk API. Individual toggles, fragment and TOC jumps do not.
  There is no per-page or per-section identity, cookie, server state, CMS setting, expiry or
  cross-origin sharing. Malformed values use the collapsed first-visit default without rewriting
  the stored value. Changes from another tab apply to future mounts without forcing a bulk action
  on the current view. If content crosses the two-section threshold later, untouched mounts adopt
  the choice and deliberate individual toggles stay as chosen. Historical `persisted:*` disclosure keys and `quiet-mode` stay ignored.
- The head script injected by `injectThemeBoot` applies geometry while HTML is parsed, before
  paint. Package CSS covers pending sections and reserves the control. Hydration adopts the
  choice once per mount. The injected script carries eligibility from the complete server markup,
  so the first parsed card can use the bulk choice while later HTML arrives. The body, header and
  TOC remain visible while parsing. Boot exceptions and app-resource failures expose all pending
  bodies and hide the inactive bulk control. A five-second recovery exposes pending bodies if
  startup stalls without an error event; hydration preserves that readable fallback. The script also exposes a direct fragment's target and containing
  sections before hydration; the section-jump controller owns final landing and cancellation.
- Server HTML contains every section body, open and readable even when `open={false}` was
  declared for the interactive view. With JavaScript disabled those bodies stay open. If storage
  access throws, the interactive view uses declared defaults and bulk actions remain usable.
- Interactive closed bodies remain mounted in a zero-height CSS grid with clipped overflow,
  `inert` and `aria-hidden`. They keep their source, links, tables and media in the DOM. Browser
  find-in-page generally excludes inert content until it is opened. This is a visibility and
  interaction boundary, not lazy deletion. Responsive media keep their width; chart libraries
  that measure height or wait for intersection still need their product's real opening tests.
- Metadata, canonical links, JSON-LD and social head tags are independent of the bulk choice.
  SSR source remains available to HTML readers and source-based llms exporters. The Gallery
  checks complete source and metadata; Google indexing, Google's rendered inspection, social
  crawlers and each product's llms generator require product evidence. No deployed crawler or
  indexing result is claimed by this source PR. [Google's mobile-first guidance](https://developers.google.com/search/docs/crawling-indexing/mobile/mobile-sites-mobile-first-indexing)
  permits equivalent content in accordions and warns against loading primary content only on
  interaction. [The HTML inert contract](https://html.spec.whatwg.org/multipage/interaction.html#inert-subtrees)
  explains the browser-search exclusion. The local Chromium test verifies find after expansion.

At the consumer revisions listed below, yesid.dev's `apps/web/src/lib/server/llms.ts` generates
both text endpoints from the build-time content catalog. `apps/web/src/routes/llms-full.txt/+server.ts`
returns that generated text; it does not serialize section DOM or read browser storage. The UI
preference has no input to this generator. No tracked llms endpoint was found in Transit's tree
at that revision. Recheck both products' built outputs during rehearsal.

## At both product bumps

1. Adopt the same exact prerelease for all design dependencies and rebuild. Keep
   `%yesid.themeBoot%` before page content, the `injectThemeBoot` hook and package component CSS.
   No new prop, initialization call or default option is needed. `activeEffect` defaults to
   `glow`; explicit `none` remains supported.
2. Allow the new hash from `@yesid/ui/boot.json`. yesid.dev imports it in
   `apps/web/vite.config.ts` and checks it in `apps/web/scripts/check-csp.ts`; Transit imports it
   in `apps/web/kit.config.js`. These imports follow the dependency on rebuild. A manually copied
   hash must match the candidate's JSON. Do not retain an earlier hash for this script.
3. Update the affected tests below, including hidden control assertions: server markup contains
   the hidden control so boot can reserve its space. Assert visibility, rather than DOM absence,
   when a `SectionsToggle` is mounted below its threshold. Product pages that mount no control
   can still assert absence. Clear `sections-choice` and the boot marks between unit scenarios;
   seed `expanded` when a test intentionally needs open content at entry.
4. Verify actual content under first visit, stored collapse and stored expand: reload, a second
   route, a fresh context carrying origin storage, blocked storage, disabled JavaScript, a
   direct nested fragment, TOC navigation, Back, locale reading-position restoration, responsive
   views and reduced motion. Measure initial geometry with hydration delayed and record layout
   shifts. Keep filters, listing panels, independent panels and map tools outside the count.
5. Update localized privacy/device-storage copy. yesid.dev's legal copy is CMS-held and belongs
   to the owner; Transit owns `apps/web/src/lib/features/legal/legal.copy.ts`, `device-storage`.
   Suggested English wording: “The expand-all control stores your choice as `collapsed` or
   `expanded` in localStorage under `sections-choice` on this site's origin. The choice applies
   across pages and visits until you change it or clear site data. Individual section toggles
   affect only the current view. This preference is not sent to a server and sets no cookie.”
   Translate through each product's existing copy workflow. No CMS label is needed for the
   control; Remember/Forget actions and labels remain absent.

## Product regression inventory

### Privacy copy for the CMS owner

**FR**

Lorsque vous utilisez le bouton qui replie ou déplie toutes les sections, votre choix (`collapsed`
ou `expanded`) est enregistré dans le stockage local de votre navigateur (`localStorage`), sous la
clé `sections-choice`, pour ce site. Il s’applique aux autres pages et aux visites suivantes,
jusqu’à ce que vous le changiez ou effaciez les données du site dans votre navigateur. Ouvrir ou
fermer une section individuellement ne modifie que la vue en cours. Cette préférence n’est pas
envoyée à un serveur et ne crée aucun témoin de connexion (cookie).

**EN**

When you use the control to expand or collapse all sections, your choice (`collapsed` or
`expanded`) is saved in your browser’s local storage (`localStorage`) under the key
`sections-choice` for this site. It applies to other pages and later visits until you change it
or clear the site’s data in your browser. Opening or closing an individual section affects only
the current view. This preference is not sent to a server and sets no cookie.

**ES**

Cuando usas el control para expandir o contraer todas las secciones, tu elección (`collapsed` o
`expanded`) se guarda en el almacenamiento local de tu navegador (`localStorage`), con la clave
`sections-choice`, para este sitio. Se aplica a las demás páginas y a las visitas posteriores
hasta que la cambies o borres los datos del sitio en tu navegador. Abrir o cerrar una sección
individual solo cambia la vista actual. Esta preferencia no se envía a un servidor ni crea
ninguna cookie.

### Consumer tests

Read-only inventory on 2026-11-05: Transit `6e24556ca3134f2c34563cac9dc1106687929c7b`,
yesid.dev `3bc954e0225be6495b2e190a521e8ff20736b748`. Refresh these at adoption.
This PR changes neither product.

| Product | Existing assertions and required bump checks |
| --- | --- |
| yesid.dev | `apps/web/tests/sections.spec.ts`: reload and a different service currently assert declared-open defaults. `apps/web/tests/language.spec.ts`, “content disclosures reset on FR→ES→EN remounts”, asserts open defaults. `apps/web/tests/nav-anchor-offset.spec.ts` describes Back remounting at declared defaults. Update these to assert the remembered bulk choice while retaining reading-position and fragment coverage. |
| yesid.dev | `apps/web/src/lib/components/shared/SectionsToggle.test.ts` asserts absent DOM below threshold and starts from mixed declared state. `apps/web/src/lib/components/services/ServiceStackPanel.test.ts` asserts open on remount. `ServiceDetailPage.sections.test.ts` also covers real content counts. Isolate storage and distinguish individual-only remount behavior from a bulk choice. |
| yesid.dev | `apps/web/src/lib/state/detail-reading-position.ts` restores ordinal section progress by geometry and intentionally performs no disclosure opening. With a collapsed bulk choice, individually open a section, read inside it, then switch locale: the target can remount collapsed. The bump must make the locale-restoration adapter reveal the saved section and enclosing sections before measuring progress, using the existing section-opening/jump contract without writing the bulk choice. Extend `detail-reading-position.svelte.test.ts` and `tests/language.spec.ts` for this case. Generic pixel-only Back restoration needs the same real-caller check; Gallery's Back case uses a remembered expanded page. This is required consumer integration work, not established acceptance from this source PR. |
| Transit | `apps/web/e2e/locale.spec.ts`, “page actions affect content only and reload restores declared defaults”, explicitly asserts nothing is remembered. Update reload and locale expectations to the bulk preference. `apps/web/src/lib/components/shared/SectionsToggle.svelte.test.ts` asserts absent DOM below threshold and mixed defaults. |
| Transit | `apps/web/src/lib/components/surface/EntityDetail.svelte.test.ts` keeps the independent TOC at its declared default and asserts historical `persisted:*` keys stay absent; preserve those exclusions. `HealthStatus.async.svelte.test.ts`, `RouteDetail.svelte.test.ts`, `StopDetail.svelte.test.ts`, `MetricsExplainer.methodology.svelte.test.ts` assert declared defaults for new cards or panes. New content mounts on pages with the bulk control adopt the bulk choice; excluded panels keep their own state. |
| Transit | Exercise actual route/stop/network reliability charts, methodology tables and live panels: SVG/canvas width and height after opening, tooltips/pointer coordinates, ResizeObserver/IntersectionObserver activation, live updates while closed then opened, nested fragments and reduced motion. `CollapsibleDatavizHarness.svelte`, line reliability `CollapsibleSection.svelte.test.ts`, `NetworkSurface.svelte.test.ts`, and `e2e/data-surfaces.spec.ts` are existing starting points. Gallery's responsive SVG, DataTable and live-counter fixture establishes shared mechanics only. |

## Release evidence boundary

The API report changes the fingerprint of the public `./boot.json` asset because the CSP-approved
script now also applies section geometry. Public exports, props and method signatures are
unchanged. Owner approval must cover this asset/report and the D15 default/persistence behavior
before the first candidate tag. A later candidate with a changed report needs renewed approval.
The new change fragment stays in the source PR; release preparation belongs in a separate PR.
Both products must rehearse the same prerelease tarballs through their own required checks and
real callers before stable promotion, as `RELEASING.md` requires. This PR authorizes no release,
tag, merge, consumer adoption, CMS write or deployment.
