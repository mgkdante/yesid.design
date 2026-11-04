# Connect module fixes

These source changes target v0.35.0. Release rehearsal, publication and both product bumps are
separate work. The owner approved the breaking Sheet label change on 2026-11-04.

## Sheet styles and copy

Keep importing `@yesid/ui/base.css` after Tailwind. It now imports `tw-animate-css` from
`@yesid/ui`'s own dependency. Remove the product's direct `tw-animate-css` import and dependency
at the bump. Stock bottom/right motion, focus handling and dismissal stay package-owned;
Transit keeps its product-specific sheet motion overrides.

Sheet Content no longer supplies English `Close`. Supply localized copy whenever the button
can show, including when `showCloseButton` is omitted or is a dynamic boolean:

```svelte
<Sheet.Content closeLabel={copy.closePanel}>...</Sheet.Content>
<Sheet.Content showCloseButton={false}>...</Sheet.Content>
```

Only the explicit `false` branch permits omitting `closeLabel`. This is a breaking type
contract. The API report records both branches; the approved transition is in DEPRECATION.md.

## DetailFrame without a mobile contents pill

Supply both `toc.openAria` and `toc.closeAria` to enable the pill. Omit both to keep entry
tracking and fragment navigation without a pill. Supplying just one is a type error. `rail` or
an empty `pillEntries` still suppresses the pill even with labels, so existing callers work.

```svelte
<DetailFrame toc={{ entries, navigation }}>...</DetailFrame>
```

## Consumer bump checks

Run each product's source checks, tests, build and affected browser suites against the candidate
tarballs. Package and Gallery results do not establish either product's acceptance.

| Product | Caller requirements | Regression evidence required at its bump |
| --- | --- | --- |
| Transit | Preserve `showCloseButton={false}` on BottomSheet, MapFilterPill and the touch harness; SurfaceRail also hides the stock control. Hidden-pill DetailFrame callers may drop both empty labels and their `pillEntries: []` workaround. Keep labels on any page that uses TocPill. Remove the direct animation CSS dependency/import. | Sheet touch/drag, outside dismissal, Escape/focus return; BottomSheet and map pill overrides; stock SurfaceRail opening/closing under normal and reduced motion; hidden-pill data pages still track sections; visible contents pills retain localized names and navigation at mobile/tablet/desktop. |
| yesid.dev | No direct Sheet caller was found at the checked head below; re-inventory at the bump. Any newly introduced visible Sheet close control must pass localized `closeLabel`. Keep both labels on detail/article pages that render the pill. Remove the direct animation CSS dependency/import if no app-owned use remains. | Detail/article contents navigation and focus, mobile drawer labels in every locale, both themes and reduced motion; shared header/disclosure browser checks and every E2E shard. |

Recheck those inventories on each app's bump head. No product files are changed here.

Source inventory, refreshed from both remotes on 2026-11-04: Transit
`b5b283781a6fe6ab12c424dd685bbb854d515962` and yesid.dev
`bab42a1af728c5bccf167121d0be40be640f59b6`. Transit still has the three direct Sheet callers above,
all hiding the stock button, and five hidden-pill callers: AlertHistory, HotspotsBoard,
NetworkSurface, AccountabilityReceipt and RepeatOffenders. This is source evidence only.

Existing browser suites to run at adoption include Transit's `e2e/data-surfaces.spec.ts`,
`e2e/brand-surfaces.spec.ts` and `e2e/accessibility.spec.ts`; yesid.dev's
`tests/nav-anchor-offset.spec.ts`, `tests/header.spec.ts`, `tests/accessibility.spec.ts` and
`tests/page-content/{blog,projects,services}-detail.spec.ts`. Include each app's existing sheet
touch tests and relevant unit/source guards. No consumer suite was run by this source PR.

## Documented policies

Every in-house product shows the yesid dot in the tab. SiteRoot calls `theme.init()` on mount;
it repaints every `link[rel="icon"]` in `--primary` even on a first load without a theme change.
Later theme changes repaint it too. This release documents existing behavior.

Generate dependency changes with the repository's pinned Bun on your machine. CI's Linux frozen
install accepts the lockfile; if resolution requires a change there, regenerate with that Bun
version on Linux and review the diff. CONTRIBUTING.md owns the contributor procedure.
