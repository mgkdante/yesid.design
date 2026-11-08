---
"@yesid/tokens": minor
"@yesid/ui": minor
---

The floating nav keeps one text size at every width: header links are 16px (was 15px on desktop,
14px on tablets and 13px on small phones) and the wordmark is 18px (was 18, 17 and 16px). All
`--text-nav-link-*` tokens are now `1rem` and all `--text-nav-brand-*` tokens `1.125rem`.

Links that don't fit move to the menu instead of shrinking. `SiteHeader` now shows `priority: 1`
links (the default) from a 375px-wide header; below that the header shows the wordmark and
controls only. `priority: 2` still shows from 500px and `priority: 3` from 1024px. Keep every
header link in `menuItems` so narrow phones can still reach it. Update product tests that expect
header links on screens narrower than 375px or assert the old nav text sizes.
