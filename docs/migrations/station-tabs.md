# Station-tab signage

Import `@yesid/ui/station-tabs.css` after base.css and remove the local visual rules for the
rail and tabs. Add `station-tabs` to the rail and `station-tab` to each trigger or native link.
Use bits-ui's `data-state="active"` for Tabs and `aria-current="page"` for navigation links.
The module supplies no routing, selection, centering, scrolling, swipe guard or persistence.

Provisional defaults awaiting the owner: active weight 700, inactive ink `--primary-foreground`,
inactive hover opacity 0.7, minimum height `--size-tap-min`. The three visual choices can be
changed independently through `--station-tab-active-weight`, `--station-tab-ink` and
`--station-tab-hover-opacity`. Active signage colors remain theme-independent.

Keep product strip geometry and overflow wrappers. Do not retain conflicting local visual
rules or inline opacity on the controls: inline opacity would override the shared hover rule.
Product-specific distance opacity must allow the inactive hover rule to take precedence.

## Consumer checks at the bump

These are required adoption checks, not claims of consumer acceptance in this PR. Both consumer
copies stay unchanged until their release bumps. Gallery `/station-tabs` proves the shared CSS
on Tabs and links only.

| Consumer | Existing regression checks | Visual and interaction checks |
| --- | --- | --- |
| Transit | `apps/web/e2e/data-surfaces.spec.ts`, `apps/web/e2e/brand-surfaces.spec.ts` | Entity-detail active tab, keyboard selection and focus, disabled state where present, narrow horizontal scroll and fade, strip height and sticky placement, light/dark and reduced motion. |
| yesid.dev | `apps/web/tests/page-content/services-detail.spec.ts`, `apps/web/tests/page-content/service-deep-link.spec.ts`, `apps/web/tests/mobile/services.spec.ts` | Service listing scroll-mode selection and centering without moving the window, swipe guard and distance opacity; service-detail native links and locale destinations; active ink/weight, hover, tap height, narrow overflow/fade, sticky placement, light/dark and reduced motion. |

Run each consumer's check, build and browser suites on isolated ports with server reuse off.
Compare real pages before removing the local copies. Keep caller labels, numbering and localized
copy. Do not treat a shared Gallery pass as evidence that these product flows still work.
