# Disclosure migration (D-a)

`SectionsToggle` replaces the former QuietModeButton. Content sections no longer remember
open/closed choices between visits. Filter groups and listing filter panels remain independent.

## Required consumer changes

- Remove `sectionKey` from `CollapsibleSection` and `TocNav`. Keep `anchor` for TOC identity.
- Remove `persistKey` from `FilterGroup` and `filterPersistKey` from `ListingFrame`.
- Remove `quiet` from `CollapsibleSection` and `TocNav`. Every mounted collapsible content section now
  participates in the page bulk control. TocNav keeps its independent toggle and does not count
  toward the two-content-section threshold. Remove adapter code that separately forwards the quiet
  counters into `open` or `openSignal`; that would duplicate the shared action.
- Rename `QuietModeButton` to `SectionsToggle`, `QuietModeButtonProps` to `SectionsToggleProps`,
  `QuietModeButtonCopy` to `SectionsToggleCopy`, and `QuietModeActiveEffect` to
  `SectionsToggleActiveEffect`. Remove `remember` and `forget` copy and `remembered` /
  `onRememberToggle` props. Rename the controlled `enabled` prop to `collapsed`. Keep localized
  `collapse`, `expand`, `collapseTitle` and `expandTitle`. There is one button: Collapse all
  whenever any section is open, Expand all only when every section is closed. Mixed state
  collapses everything. The control hides when fewer than two collapsible content sections are mounted.
  It is omitted during SSR and appears after registration during hydration; static cards and the TOC do not count.
- Replace `quietMode` / `QuietModeStore` with `sections` / `SectionsState` from `@yesid/ui/state`.
  Replace `set(true)` with `collapseAll()`, `set(false)` with `expandAll()`, and `enabled` reads
  with `allCollapsed`. `count` is the number of registered collapsible content sections. `toggle()`
  remains. Remove `remembered`, `rememberCurrent`, `forgetDefault`,
  `init`, `resetForTest`, `closeSignal` and `openSignal`; the mounted sections register themselves.
  `CollapsibleSection.openSignal` remains available for consumer-specific opening requests.
- Replace wrapper files and copy owners during adoption: Transit has
  `apps/web/src/lib/components/shared/QuietModeButton.svelte` and `quietMode.copy.ts`;
  yesid.dev has `apps/web/src/lib/components/shared/QuietModeButton.svelte`. Rename their imports,
  exports, tests and usages. CMS/schema Remember/Forget copy can stop feeding the button; this
  migration does not perform or require destructive CMS field cleanup.
- Update selectors from `quiet-mode-controls` / `quiet-mode-toggle` and their visual modifiers to
  `sections-controls` / `sections-toggle`. The corresponding test ids use the new names. The
  remember button and `data-remembered` are removed, with no replacement.
- Replace private trigger clicks with `openSection(anchor)` from `@yesid/ui/brand` (also root).
  It opens every mounted matching collapsible card and returns whether any matched. It is safe
  after unmount and refreshes on anchor changes. Static cards always show their bodies.
- Keep a keyed boundary per page or entity identity around disclosures: defaults reset on remount, not when a reused CollapsibleSection receives a new anchor.
- In yesid.dev `apps/web/src/lib/components/blog/BlogFilterSidebar.svelte`, the custom date filter
  still uses `persisted('blog-filter-date', true)` outside FilterGroup. Replace it with local state
  seeded true and update its `.value` bindings. Search queries, dates and other selections can
  continue using the generic store.
- Rebuild CSP configuration with the new `@yesid/ui/boot.json` hash when adopting the package.
  Transit already imports that JSON in `apps/web/svelte.config.js`, so its hash updates with the
  dependency bump and rebuild. Theme boot and interrupted view-transition handling remain. No disclosure marks are emitted
  or processed. Old `persisted:*` disclosure keys and `quiet-mode` storage are ignored and left
  untouched. Generic `persisted` remains for search and selection state.
- Update browser/SSR tests: reload starts at declared `open` / `startOpen` defaults; the mobile
  ListingFrame filter panel starts closed. Assert one bulk control, no Remember/Forget button,
  content-section bulk behavior, individual reopen, inert/focus behavior and reduced motion.

## Read-only consumer inventory

Scanned the two local consumer source trees on 2026-11-03. These are source usages, not proof
that either consumer has adopted or accepted this change. No consumer files were edited.

### transit

**Remove disclosure identity used only for persistence**

- `apps/web/src/lib/components/surface/__fixtures__/EntityDetailHarness.svelte`
- `apps/web/src/lib/components/surface/EntityDetail.svelte.test.ts`
- `apps/web/src/lib/components/surface/EntityDetail.svelte`
- `apps/web/src/lib/features/health/sections/SectionConformance.svelte`
- `apps/web/src/lib/features/health/HealthStatus.svelte`
- `apps/web/src/lib/features/stops/StopDetail.svelte`
- `apps/web/src/lib/features/lines/RouteDetail.svelte`
- `apps/web/src/lib/features/alerts/AlertHistory.svelte`
- `apps/web/src/lib/features/receipt/AccountabilityReceipt.svelte`
- `apps/web/src/lib/features/hotspots/HotspotsBoard.svelte`
- `apps/web/src/lib/features/lines/reliability/RouteReliabilityClusters.svelte`
- `apps/web/src/lib/features/stops/reliability/sections/StopReliabilitySurface.svelte`
- `apps/web/src/lib/features/repeat-offenders/RepeatOffenders.svelte`
- `apps/web/src/lib/features/network/reliability/sections/NetworkSurface.svelte`
- `apps/web/src/lib/features/metrics/MetricsExplainer.svelte`
- `apps/web/src/lib/features/network/reliability/sections/SectionWeekday.svelte`
- `apps/web/src/lib/features/network/reliability/sections/SectionTrend.svelte`
- `apps/web/src/lib/features/network/reliability/sections/SectionStatusMix.svelte`
- `apps/web/src/lib/features/network/reliability/sections/SectionCompleteness.svelte`
- `apps/web/src/lib/features/network/reliability/sections/SectionReporting.svelte`
- `apps/web/src/lib/features/network/reliability/sections/SectionLiveHeadline.svelte`
- `apps/web/src/lib/features/network/reliability/sections/SectionCancellations.svelte`
- `apps/web/src/lib/features/network/reliability/sections/SectionDelayHistogram.svelte`
- `apps/web/src/lib/features/network/reliability/sections/SectionByTimeOfDay.svelte`
- `apps/web/src/lib/features/network/reliability/sections/NetworkTile.svelte`
- `apps/web/src/lib/features/network/reliability/sections/SectionCrowdingByDay.svelte`

**Remove filter persistence props**

- `apps/web/src/lib/features/stops/StopsIndex.svelte`
- `apps/web/src/lib/features/lines/LinesIndex.svelte`

**Remove quiet exclusions or remembered API**

- `apps/web/src/lib/components/surface/EntityDetail.svelte`
- `apps/web/src/lib/components/shared/__fixtures__/CollapsibleDatavizHarness.svelte`

**Remove Remember/Forget copy from the button adapter and update tests**

- `apps/web/src/lib/components/shared/quietMode.copy.ts`

Consumer test roots also need their stored-disclosure expectations updated during adoption.
In Transit, this includes `apps/web/src/routes/layout.data-independent.test.ts`, which still
asserts restoration of remembered quiet mode.

### yesid.dev

**Remove disclosure identity used only for persistence**

- `apps/web/src/lib/components/shared/_quiet-mode-fixture.svelte`
- `apps/web/src/lib/components/services/ServiceStackPanel.svelte`
- `apps/web/src/lib/components/projects/ProjectOverviewCard.svelte`
- `apps/web/src/lib/components/projects/ProjectImpactCard.svelte`
- `apps/web/src/lib/components/projects/ProjectGlancePanel.svelte`
- `apps/web/src/lib/components/services/ServiceDetailPage.svelte`
- `apps/web/src/lib/components/projects/ProjectDetailPage.svelte`
- `apps/web/src/lib/components/blog/BlogDetailPage.svelte`
- `apps/web/src/lib/components/blog/BlogEntryRail.svelte`

**Remove filter persistence props**

- `apps/web/src/lib/components/projects/ProjectListingPage.svelte`
- `apps/web/src/lib/components/projects/ProjectFilterSidebar.svelte`
- `apps/web/src/lib/components/blog/BlogFilterSidebar.svelte`
- `apps/web/src/lib/components/blog/BlogListingPage.svelte`

**Remove quiet exclusions or remembered API**

No source callers found.

**Remove Remember/Forget copy from the button adapter and update tests**

- `apps/web/src/lib/components/shared/QuietModeButton.test.ts`
- `apps/web/src/lib/components/shared/QuietModeButton.svelte`
- `apps/web/src/lib/content/site-labels.ts`

Consumer test roots also need their stored-disclosure expectations updated during adoption.

## Adoption gates

Both products must run their own source/API guards, typecheck, unit, build, accessibility and
browser checks when bumped. Transit must check EntityDetail's former quiet opt-out and its
article/receipt/reliability section adapters. yesid.dev must check project/blog/service details
and mobile listing filters. Package and Gallery checks do not establish consumer acceptance.

## Additional state and selector test callers

These source tests also reference the removed init API, document marks or control selectors.
No production `quietmodechange` event listeners were found in either consumer source tree.

### transit

- `apps/web/src/lib/features/stops/StopDetail.svelte.test.ts`
- `apps/web/src/lib/features/lines/RouteDetail.svelte.test.ts`
- `apps/web/src/lib/features/repeat-offenders/RepeatOffenders.svelte.test.ts`
- `apps/web/src/lib/features/repeat-offenders/RepeatOffenders.history.svelte.test.ts`
- `apps/web/src/lib/features/hotspots/HotspotsBoard.history.svelte.test.ts`
- `apps/web/src/lib/features/hotspots/HotspotsBoard.svelte.test.ts`
- `apps/web/src/lib/features/health/HealthStatus.async.svelte.test.ts`
- `apps/web/src/lib/features/receipt/AccountabilityReceipt.async.svelte.test.ts`
- `apps/web/src/lib/features/receipt/AccountabilityReceipt.svelte.test.ts`
- `apps/web/src/lib/features/alerts/AlertHistory.svelte.test.ts`
- `apps/web/src/lib/features/metrics/MetricsExplainer.svelte.test.ts`

### yesid.dev

- `apps/web/src/lib/components/shared/QuietModeButton.test.ts`
