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

Navigation also re-closes a menu reopened during a slow loader, reconciles redirect and superseding
events when `beforeNavigate` is skipped, and advances the stale-focus guard for each actual commit.
The optional `NavigationEvent.event` preserves native trigger identity through custom adapters.
Lenis momentum is canceled through its public stop/start API in both navigation hooks, independently
of any header, without leaving input locked after cancellation. The migration includes the Transit
unit harness and yesid.dev browser expectation updates required alongside the production calls.
