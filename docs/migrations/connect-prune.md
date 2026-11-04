# Connect: remove unused public contracts

Planned for v0.35.0. The owner approved connect c-8 on 2026-11-04 without a deprecation
window. Both normal removal gates are waived for this list only. API-report approval before
stable release and the two-product prerelease rehearsal remain required. This document is
source evidence, not a release, adoption or deployed-acceptance receipt.

## Removed surface and migration

| Package / entry | Removed contracts | Migration |
| --- | --- | --- |
| `@yesid/ui/card` | `Content`, `Description`, `Footer`, `Header`, `Title`, `Action` and their `CardContent`, `CardDescription`, `CardFooter`, `CardHeader`, `CardTitle`, `CardAction` aliases | Keep `Card` or `Root`; compose content with ordinary markup. Gallery owns its six demo-only parts locally. |
| `@yesid/ui`, `@yesid/ui/brand` | `StickyPanel`, `StickyPanelProps` | Product layout owns sticky geometry; use `scrollChain` where nested scroll needs it. |
| `@yesid/ui/button`, `@yesid/ui/badge`, `@yesid/ui/sheet`, `@yesid/ui/tabs` | `buttonVariants`, `badgeVariants`, `sheetVariants`, `tabsListVariants` | Use component props and the retained public prop/variant types. Class functions remain in component-local code. |
| `@yesid/gates` | `colorMixViolations`, `buildColorMixPatterns`, `DEFAULT_COLOR_MIX_CONFIG`, `ColorMixFloorConfig` | Check rendered contrast in product browser suites; percentage-only source heuristics do not prove contrast. |
| `@yesid/seo-kit/headers` | `contentSecurityPolicy` | Serialize product-owned CSP directives locally. `SECURITY_HEADERS` stays byte-identical. |
| `@yesid/tokens/parse` | The subpath, including `parseTokens`, `isPrimitive`, `isClampToken`, `isLeaf` | Repository token tooling keeps using the private source file; consumers have no caller to migrate. |
| `@yesid/analytics`, `@yesid/analytics/client` | `sanitizeAnalyticsReferrer`, `allowAnalyticsProps` | Use `createAnalytics`; it retains both privacy operations internally. |

Unchanged: Card root and its selectors, config's
`tsconfig/base.json` and `turbo/base.json`, `sectionGlow`, footer `Group` and `Link`, all
component props and class pins. Sheet and DetailFrame implementation work belongs to c-7.

## Current source verification

Design baseline: `8aacc3af5e72de6fe5c04a667bcb1be35cef7ed2`, fetched `origin/main` on
2026-11-04. The older dossier used `dde11246`; its retained/removal claims were checked
again rather than carried forward as current proof.

The two clean, read-only product checkouts matched GitHub's live `commits/main` response:

| Product | Verified main head | Findings |
| --- | --- | --- |
| Transit | `b5b283781a6fe6ab12c424dd685bbb854d515962` | One `@yesid/ui/card` import, `{ Card }`; no imports of removed contracts. Sheet namespace callers use retained Root, Content, Header and Title. |
| yesid.dev | `bab42a1af728c5bccf167121d0be40be640f59b6` | Fourteen `@yesid/ui/card` imports, all `{ Card }`; no imports of removed contracts. One StickyPanel mention is a comment in ProjectGlancePanel. |

Scans covered tracked product source, tests and tooling, named exports and affected package
imports, including multiline and namespace usage. No consumer files or pins were changed.
Package/Gallery gates cannot establish consumer acceptance. Actual candidate tarballs still
need c-1's product rehearsal before stable promotion.

After c-6 and c-7 merged, c-8 merged design main
`c994dd25d94f91ce1c7f50e3dec5a7682e56fe05` without rewriting history. Before removing the
`tabsListVariants` re-export, fresh searches of fetched product main refs found no occurrences
in tracked code: Transit `b5b283781a6fe6ab12c424dd685bbb854d515962`, yesid.dev
`116706d2da2899f0783bc9ead6ccc3a5dc4e44c0`. Both refs matched GitHub's live main heads.
The component-local function and `TabsListVariant` type stay; c-6's station styling needs
neither the public function nor a runtime change.

### Four findings from the retiring color-mix engine

All four dossier lines remain at the product heads above, inspected before deleting the engine:

| Product file | Source | What it establishes |
| --- | --- | --- |
| yesid.dev `apps/web/src/lib/components/blog/BlogDetailPage.svelte:436` | foreground 60% mixed with transparent | Body-related text uses alpha; rendered contrast is unverified here. |
| yesid.dev `apps/web/src/lib/components/home/ManifestoTransit.svelte:84` | accent-text 45% mixed with transparent | Small text uses alpha; rendered contrast and decorative exemption are unverified here. |
| Transit `apps/web/src/lib/components/surface/FreshnessStamp.svelte:114` | accent-text 70% mixed with foreground | The engine ignores the opaque second color; its percentage threshold alone cannot establish a contrast failure. |
| Transit `apps/web/src/lib/components/surface/MapDrilldownLink.svelte:25` | primary 60% mixed with foreground | Same opaque-mix limitation; no rendered contrast claim. |

These are source observations, not browser measurements. Fixing product colors is outside c-8.
