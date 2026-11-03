---
"@yesid/ui": minor
---

Owner-approved breaking transition (2026-11-03, deepen D-c): initialize
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
