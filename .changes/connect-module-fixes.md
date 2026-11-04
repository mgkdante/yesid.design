---
"@yesid/ui": minor
---

Sheet animation CSS now comes from `@yesid/ui/base.css` and its package-owned
`tw-animate-css` dependency. Products can remove their direct dependency and stylesheet import.

Breaking: Sheet Content requires caller-owned `closeLabel` whenever its close button can appear.
Pass localized copy, or explicitly set `showCloseButton={false}` to omit the button and label.
The owner approved this coordinated transition without a deprecation wait for v0.35.0.

DetailFrame accepts both `toc.openAria` and `toc.closeAria`, or neither. Omitting both disables
the mobile contents pill while retaining active tracking and fragment handling. Existing labelled
callers and `pillEntries: []` remain valid.

Document the yesid dot favicon repaint on SiteRoot mount and the CI-decided lockfile rule.
See `docs/migrations/connect-module-fixes.md` for both products' bump requirements and checks.
