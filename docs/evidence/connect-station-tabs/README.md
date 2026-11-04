# c-6 visual evidence

Captured 2026-11-04 in Chromium 149 (Playwright 1.61.1), reduced motion, at widths 1280 and
390 CSS px, with Gallery's bundled fonts. Each filename gives the look, theme and width.
The first inactive Tabs trigger is hovered. The native-link row is at rest.

- `old-transit-*.png`: reconstruction of EntityDetail's station-tab CSS from Transit
  `b5b283781a6fe6ab12c424dd685bbb854d515962`.
- `old-site-*.png`: reconstruction of StationTabs' station-tab CSS from yesid.dev
  `2892360e7689e2de6ab0ff13d7ecd8d9d8436092`.
- `new-*.png`: the proposed shared CSS on Gallery `/station-tabs`, based on design
  `dde11246c41cb3da36b6850ebdeb473b786cc465` plus this PR.

The old screenshots apply the source tab rules to the same neutral Gallery content, adapting
the `.active` selector to the fixture's semantic state attributes. They retain Gallery's rail
geometry and tokens. They are **not screenshots of running products** and do not prove product
placement, strip geometry, swipe, scrolling, localization or release adoption. The new screenshots
are the real Gallery implementation. Product copies were read only. Consumer regression checks
and the remaining adoption limits are in `docs/migrations/station-tabs.md`.

The default remains provisional: active weight 700, inactive ink `--primary-foreground`,
inactive hover opacity 0.7, minimum height from `--size-tap-min`. No owner acceptance is implied.
