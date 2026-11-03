# Navigation lifecycle migration (deepen D-c)

This is an owner-approved breaking transition for the next coordinated minor release. The owner
requested immediate removal of package-owned header/language copy on 2026-11-03 (D5/D8/D11),
alongside the navigation lifecycle change. The owner also confirmed that both apps keep header
labels and language names in local locale files, never the CMS. The normal 90-day and
intervening-minor compatibility window is waived for these named contracts. No version is cut
by this change.

## One lifecycle in the persistent layout

During the persistent SvelteKit app layout's initialization, call the factory once. Do this even
when the current route renders no header, so navigation still interrupts Lenis momentum:

```svelte
<script lang="ts">
  import { beforeNavigate, onNavigate, afterNavigate } from '$app/navigation';
  import { createNavigationLifecycle } from '@yesid/ui/brand';

  const navigation = createNavigationLifecycle({ beforeNavigate, onNavigate, afterNavigate });
</script>

<SiteHeader {navigation} {home} {links} {menuItems} {labels} {language} />
```

`SiteHeader.navigation` takes this lifecycle instance instead of the three router hooks. Keep the
instance stable across route changes. Pass it down to wrappers with props or an app-owned Svelte
context. Do not initialize it in a conditional header, a reactive effect, or `onMount`.
SvelteKit requires hook registration during component initialization; an `onNavigate` promise
holds navigation and a returned function runs after the DOM update
([navigation hook contract](https://svelte.dev/docs/kit/$app-navigation#onNavigate)).

The factory registers each hook once. Header mounting only attaches its menu and bound language
link. Unmounting releases any pending navigation hold. Ordinary link/goto/history navigations
close the menu, wait for its focus trap and close animation, and suppress stale trigger focus.
Only a link navigation to the exact language-link URL (query and fragment included) preserves an
open menu and returns focus to the updated language link. Shallow `goto` remains untouched.
The module interrupts the current Lenis instance's momentum; it does not own scroll restoration,
analytics, view transitions or locale/URL policy. Keep those app-owned hooks.

`onNavigate` reconciles the actual commit event even when SvelteKit skips `beforeNavigate`
during an active load. It re-closes an ordinary menu that was reopened while loading, then waits
for that close. A layout-scoped observer records intercepted internal link clicks, including
superseding clicks that receive no `beforeNavigate`. Redirects use that latest observed intent;
an absent native event alone never proves continuity with an earlier loader. The observer ignores
modified clicks, downloads, other targets/origins and same-document fragments, and is removed
when the layout unmounts. Pass the hooks directly; custom wrappers should still forward the
optional native `NavigationEvent.event` when available. Without observed trigger evidence,
unmatched URLs are handled from the actual event rather than dropped.

Lenis interruption is independent of header attachment and runs in both `beforeNavigate` and
`onNavigate`, including when only the latter fires. The lifecycle uses Lenis's public `stop()`
then `start()` in the same callback to cancel its animation and velocity while restoring input.
It leaves an already-stopped instance alone. This is momentum cancellation, not a navigation-long
scroll lock: cancellation or document departure may have no `afterNavigate`, and a deferred restart
could leave scrolling locked. Real-Lenis tests cover both window and element scrollers, wheel-like
and programmatic animations, subsequent animation frames, and ownership of an existing stop.

`SiteRoot` props are unchanged. The lifecycle does not depend on SiteRoot or SiteHeader mounting.

## Required props and copy

`SiteHeader.labels` must now include all six required fields:
`openMenu`, `closeMenu`, `menu`, `theme`, `menuFooter`, `skipToContent`.
`nav` remains optional. Use `menuFooter: ''` to hide it deliberately. The first four fields were
already required; `menuFooter` and `skipToContent` no longer have package defaults.

`SiteHeader.language` still takes `locale`, `locales`, `href`, and `label`, and now also requires
`names`. Standalone `LanguageToggle` has the same required props. Supply a name for every
supported locale, including the current one. The component provides no translated fallback.
The autonym map, shared by every UI locale, is:

```ts
const languageNames = { en: 'English', fr: 'Français', es: 'Español' };
```

These are the strings needed to preserve the previous package defaults. They are migration
inputs for app-owned copy, not new package defaults:

| New required copy | EN | FR | ES |
| --- | --- | --- | --- |
| `labels.skipToContent` | Skip to content | Aller au contenu | Saltar al contenido |
| `labels.menuFooter` | Navigation · All routes | Navigation · Toutes les routes | Navegación · Todas las rutas |
| `language.names` entry | `en: 'English'` | `fr: 'Français'` | `es: 'Español'` |

The language control's existing label remains app-owned: EN `Language`, FR `Langue`, ES `Idioma`.
Keep the app's existing menu, theme and navigation strings.

## Transit: local i18n messages

Read-only inventory on 2026-11-03: the current labels are in
`apps/web/src/lib/components/shell/navPill.copy.ts`; locale configuration and `defineCopy` live in
`apps/web/src/lib/i18n/`. The checkout does not yet have a shared messages module. In the app bump,
put this copy in Transit's local i18n messages, retaining these exact existing field names plus
`menuFooter` and `names`. The table uses `navPill` as the local message group. The app owns the
physical message filenames; do not add CMS fields or depend on a CMS export.

| Local message key | Maps to | EN | FR | ES |
| --- | --- | --- | --- | --- |
| `navPill.openMenu` | `labels.openMenu` | Open menu | Ouvrir le menu | No current Transit value |
| `navPill.closeMenu` | `labels.closeMenu` | Close menu | Fermer le menu | No current Transit value |
| `navPill.menu` | `labels.menu` | Navigation menu | Menu de navigation | No current Transit value |
| `navPill.theme` | `labels.theme` | Dark theme | Thème sombre | No current Transit value |
| `navPill.nav` | `labels.nav` | Primary navigation | Navigation principale | No current Transit value |
| `navPill.skipToContent` | `labels.skipToContent` | Skip to content | Aller au contenu | Saltar al contenido (prior package default only) |
| `navPill.menuFooter` | `labels.menuFooter` | Navigation · All routes | Navigation · Toutes les routes | Navegación · Todas las rutas (prior package default only) |
| `navPill.language` | `language.label` | Language | Langue | No current Transit value |
| `navPill.names.en` | `language.names.en` | English | English | English |
| `navPill.names.fr` | `language.names.fr` | Français | Français | Français |
| `navPill.names.es` | `language.names.es` | Español | Español | Español |

The autonyms are identical across UI locales by definition. Transit currently publishes only
EN/FR: preserve those existing labels, add `menuFooter` and `names` to the local messages, and
pass `names: navCopy.names` to `SiteHeader.language`. A two-entry EN/FR names map is sufficient;
the ES row records the current package autonym for a complete map. There are no current Transit
ES values for the other labels, so this migration neither invents them nor enables Spanish.

Initialize the lifecycle in `apps/web/src/routes/+layout.svelte` and pass it through AppShell to
`apps/web/src/lib/components/shell/NavPill.svelte` (or use an app-owned context). Replace that
header's raw navigation-hook object with the lifecycle. Keep `reload: true`, availableLocales,
localizeUrl, provider state, `#page-scroller` / `#main-flow`, scroll-restoration hooks and header
geometry adapters. Remove hook imports from NavPill if nothing else uses them.

## yesid.dev: local locale files

Read-only inventory on 2026-11-03: `apps/web/src/routes/+layout.svelte` currently resolves
`navChrome` from site labels. The current strings below appear in
`apps/web/src/lib/content/site-labels.ts`, an exported content surface. Per the owner decision,
copy these values into yesid.dev's app-owned local locale files and wire the header to those
local values. Do not keep reading header chrome from CMS-generated site labels, and do not add
these keys to the CMS. Preserve the existing `navChrome.shared` keys to keep the mapping explicit:

| Local locale key | Maps to | EN | FR | ES |
| --- | --- | --- | --- | --- |
| `navChrome.shared.openMenuAria` | `labels.openMenu` | Open menu | Ouvrir le menu | Abrir menú |
| `navChrome.shared.closeMenuAria` | `labels.closeMenu` | Close menu | Fermer le menu | Cerrar menú |
| `navChrome.shared.menuOverlayAria` | `labels.menu` | Navigation menu | Menu de navigation | Menú de navegación |
| `navChrome.shared.themeToggleAria` | `labels.theme` | Dark theme | Thème sombre | Tema oscuro |
| `navChrome.shared.menuOverlayFooterLabel` | `labels.menuFooter` | NAVIGATION · ALL ROUTES | NAVIGATION · TOUTES LES ROUTES | NAVEGACIÓN · TODAS LAS RUTAS |
| `navChrome.shared.skipToContentLabel` | `labels.skipToContent` | Skip to content | Aller au contenu | Saltar al contenido |
| `navChrome.shared.localeSwitcherAria` | `language.label` | Language | Langue | Idioma |
| `navChrome.shared.languageNames.en` | `language.names.en` | English | English | English |
| `navChrome.shared.languageNames.fr` | `language.names.fr` | Français | Français | Français |
| `navChrome.shared.languageNames.es` | `language.names.es` | Español | Español | Español |

The first seven keys preserve current app copy; the last three move the former package language
names into the local locale contract. Pass the complete local `languageNames` object as `names`.
Make `labels.skipToContent` unconditional and required in the local type, removing the layout's
optional branch that passes `undefined`. SiteHeader currently gets no `labels.nav` here, so there
is no additional navigation-label key required by this slice.

Initialize the lifecycle once in the persistent layout and pass it as `SiteHeader.navigation`.
Keep localized href/localeAlternates policy, the dynamic preserveState decision, view-transition
and analytics hooks. `apps/web/src/lib/utils/navigation-focus.ts` re-exports
`resetFocusAfterNavigation`; that helper remains available for app-owned programmatic navigation.

## Standalone LanguageToggle

Remove `onNavigate`: this component no longer registers hooks. A normal link or `reload: true`
needs no extra integration. For `preserveState: true` outside a header, bind its native link ref
and give the lifecycle a live getter so it can restore focus after the state-preserving navigation:

```svelte
<script lang="ts">
  let languageLink = $state<HTMLAnchorElement | null>(null);
  const navigation = createNavigationLifecycle(
    { beforeNavigate, onNavigate, afterNavigate },
    { languageLink: () => languageLink },
  );
</script>

<LanguageToggle bind:ref={languageLink} {locale} {locales} {href} {label} names={languageNames} preserveState />
```

The header supplies its own direct link ref automatically. Do not query test IDs in production.

## Consumer acceptance and rollback

Update the consumer test integrations with the production calls during each bump:

- **Transit, `apps/web/src/lib/components/shell/NavPill.svelte.test.ts`:** its current harness
  renders NavPill with no lifecycle and mocks the three raw `$app/navigation` hooks as no-ops.
  Create the real lifecycle with an app-local fake router adapter and supply it through the new
  NavPill prop or app context, matching the production layout integration. Give each test a fresh
  adapter/lifecycle and exercise the relevant callbacks when asserting navigation. Do not import
  this repository's private fake-router fixture from the released package.
- **yesid.dev, `apps/web/tests/header.spec.ts` and `apps/web/tests/accessibility.spec.ts`:**
  replace header expectation reads from CMS-generated `siteLabels.navChrome.shared` with the same
  local locale copy files the header now uses. Update their `chrome` mapping and locale resolution
  for open/close/menu/skip/language labels, using the exact keys and strings above. Keep CMS imports
  that still serve unrelated content expectations.

Neither consumer is edited or accepted by this source PR. At each eventual package bump, run
that app's full source guards, generated-output checks, unit tests, build and accessibility/browser
gates. Exercise EN/FR/ES as applicable, both window and element scrolling, menu closure during
navigation, language switching while opening/closing, focus after a closed-menu switch, Escape
after a preserved switch, rapid reopen, Back/Forward, no-header routes, narrow layouts and reduced
motion. Transit must also exercise its reload language links and provider/rail geometry.

Rollback restores the prior exact package release URLs and lockfile together with the old
consumer navigation/copy calls. Repository/Gallery evidence does not establish consumer runtime
or deployed acceptance. Independent shared-contract review remains with the integration owner.
