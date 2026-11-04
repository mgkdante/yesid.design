# Build a yesid product from a release

Use this checklist in the new product:

- [ ] Start from Bun, SvelteKit 3, TypeScript 6, Svelte 5, Vite 8 and Tailwind CSS v4.
- [ ] Pick one exact `yesid.dev-design` release tag.
- [ ] Add the package tarball URLs for that tag to `package.json` and run `bun install`.
- [ ] Load the package token styles and bundled fonts.
- [ ] Import one shared UI initializer from both SvelteKit client and server init hooks.
- [ ] Apply the motion tiers and expose reduced-motion state where the product needs it.
- [ ] Add one consumer-owned gate policy module and run it with `lint:design` in CI.
- [ ] Start analytics in the root layout and set `PUBLIC_PLAUSIBLE_DOMAIN` in production.
- [ ] Run the app tests, typecheck, and production build.

## 1. Prerequisites

Use:

- Bun 1.3 or newer;
- Node 22.17 or newer (CI uses Node 22);
- SvelteKit `>=3 <4`, TypeScript `>=6 <7`, Svelte `>=5.57.1 <6`, Vite `>=8.0.12 <9`
  and `@sveltejs/vite-plugin-svelte >=7 <8`;
- Tailwind CSS v4 through `@tailwindcss/vite`.

Create the SvelteKit app first. Confirm its normal test, check, and build commands pass before adding the design packages.

This is the Kit 3 setup path for the next coordinated v0.35.0 release. The examples use
contracts already present in v0.34.0; v0.35.0 must be published and reviewed before installing
its URLs. Gallery remains workspace evidence, never product acceptance.

## 2. Install one exact release

Pick the newest release you have reviewed on the [releases page](https://github.com/mgkdante/yesid.dev-design/releases).
Each release carries one tarball per package. Add the packages with the same tag in every URL:

```json
{
  "dependencies": {
    "@yesid/analytics": "https://github.com/mgkdante/yesid.dev-design/releases/download/vX.Y.Z/yesid-analytics-X.Y.Z.tgz",
    "@yesid/i18n-core": "https://github.com/mgkdante/yesid.dev-design/releases/download/vX.Y.Z/yesid-i18n-core-X.Y.Z.tgz",
    "@yesid/motion": "https://github.com/mgkdante/yesid.dev-design/releases/download/vX.Y.Z/yesid-motion-X.Y.Z.tgz",
    "@yesid/seo-kit": "https://github.com/mgkdante/yesid.dev-design/releases/download/vX.Y.Z/yesid-seo-kit-X.Y.Z.tgz",
    "@yesid/tokens": "https://github.com/mgkdante/yesid.dev-design/releases/download/vX.Y.Z/yesid-tokens-X.Y.Z.tgz",
    "@yesid/ui": "https://github.com/mgkdante/yesid.dev-design/releases/download/vX.Y.Z/yesid-ui-X.Y.Z.tgz"
  },
  "devDependencies": {
    "@yesid/config": "https://github.com/mgkdante/yesid.dev-design/releases/download/vX.Y.Z/yesid-config-X.Y.Z.tgz",
    "@yesid/gates": "https://github.com/mgkdante/yesid.dev-design/releases/download/vX.Y.Z/yesid-gates-X.Y.Z.tgz"
  }
}
```

Run `bun install`. The lockfile records each tarball's integrity, so CI installs exactly the bytes
the release published. `@yesid/ui` takes `@yesid/tokens`, `@yesid/motion` and `@yesid/seo-kit` as
peer dependencies pinned to the same release. `@yesid/seo-kit` takes `@yesid/tokens` and
`satori >=0.33.5 <1`: list them explicitly, even one the product never imports, so the app
holds a single copy. Add `satori` to dependencies (or devDependencies for a wholly static build).
Add `shiki >=4 <5` only if importing the optional server-side `@yesid/seo-kit/highlight` subpath. The packages ship TypeScript and Svelte
source that Vite compiles (see `ssr.noExternal` in section 4).
`gh attestation verify <tarball> --repo mgkdante/yesid.dev-design` proves a tarball came from the
release workflow.

## 3. Load the tokens and fonts

Import the styles in this order in the app stylesheet. `@yesid/ui/base.css` brings `@yesid/tokens/theme.css`: the Tailwind theme and semantic color utilities.

```css
@import '@yesid/tokens/tokens.css';
@import 'tailwindcss';
@import 'tw-animate-css';
@import '@yesid/ui/base.css';
@source '../node_modules/@yesid/ui/src';
```

Adjust the `@source` path to where the app's `node_modules` sits relative to the stylesheet.

Install `tw-animate-css` alongside Tailwind. Import `@yesid/tokens/fonts.css` from the root
layout. The single server hook in section 4 preloads only the latin font faces.

Dense products opt into the compact type scale with `data-density="compact"` on `<html>`.

To use `@custom-media` breakpoints (`--tablet-min`, `--tablet-max`, `--desktop-min`, `--desktop-max`) inside Svelte styles, add `@csstools/postcss-global-data` and `postcss-custom-media` to `css.postcss.plugins` in `vite.config`, pointing global-data at `fileURLToPath(import.meta.resolve('@yesid/tokens/tokens.css'))`.

Product token overrides live in the product stylesheet after these imports. The product never pastes or regenerates the theme.

## 4. Configure UI once per module graph at boot

Call `configureUi` before the first `@yesid/ui` component renders. Add only
product-owned Tailwind vocabulary. Base yesid text and color names already work
without configuration.

Create one shared initializer, for example `src/lib/ui-initialization.ts`:

```ts
import { configureUi, type ConfigureUiResult } from '@yesid/ui/cn';

export function initializeUi(): ConfigureUiResult {
  return configureUi({
    vocab: {
      text: ['console-label'],
      colors: ['metric-healthy', 'metric-warning'],
    },
  });
}
```

Import that same initializer from both SvelteKit boot hooks. In
`src/hooks.client.ts`:

```ts
import type { ClientInit } from '@sveltejs/kit/hooks';
import { initializeUi } from '#lib/ui-initialization.ts';

export const init: ClientInit = () => {
  initializeUi();
};
```

The server initializer is composed with font preloading, language replacement and theme boot
in the single `hooks.server.ts` below. Keep one `handle` export.

Do not put `configureUi` in a root layout instance script. The client and server
hooks are the explicit initialization boundaries. They import one initializer
source, while the client bundle and every SSR worker still load independent ESM
module graphs and initialize their own package state. Separately bundled copies
of `@yesid/ui` also have independent state. HMR can recreate a graph, at which
point its boot hook initializes the recreated state.

Within one loaded module graph, the first explicit call in an unlocked graph
returns `'initialized'`. Repeating the same semantic configuration returns
`'unchanged'`: omitted and empty fields are equivalent, and duplicate or
reordered vocabulary entries do not change the meaning. A conflicting call
throws without replacing the first configuration. There is no reset API.

If `cn` runs first, directly or during a primitive render, it locks the
zero-configuration default. A later empty call returns `'unchanged'`, while a
later custom call throws. Keep the initializer ahead of all UI use when the
product has custom vocabulary.

This configuration is fixed application vocabulary. Never derive it from a
request, tenant, user, locale, or other runtime-scoped value. Provider/context
configuration is deferred and is not part of the current public API.
`ConfigureUiResult = 'initialized' | 'unchanged'` is observable public API, not
an internal diagnostic.

### Kit 3 config and source imports

Keep the app's adapter and runes policy in `kit.config.js`, then pass that object to
`sveltekit(kit)` in `vite.config.ts`. Kit 3 no longer reads `svelte.config.js` or a nested
`kit: { ... }` object. This static example uses `@sveltejs/adapter-static`; select the
adapter for the product's deployment. A static product also exports `prerender = true`
from its root `+layout.ts` and supplies entries for dynamic locale routes.

`kit.config.js`:

```js
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { projectRunes } from '@yesid/config/svelte/project-runes.js';
import boot from '@yesid/ui/boot.json' with { type: 'json' };

/** @type {import('@sveltejs/kit/vite').Config} */
export default {
  adapter: adapter(),
  preprocess: vitePreprocess(),
  compilerOptions: { runes: projectRunes(import.meta.dirname) },
  csp: {
    mode: 'hash',
    directives: {
      'default-src': ['self'],
      'script-src': ['self', boot.hash],
      'connect-src': ['self', 'https://plausible.io'],
      'style-src': ['self', 'unsafe-inline'],
      'img-src': ['self', 'data:'],
      'font-src': ['self'],
      'object-src': ['none'],
      'base-uri': ['self'],
      'frame-ancestors': ['none'],
    },
  },
};
```

The product owns its CSP: add only the origins its features need. Hash mode suits prerendered
HTML; use the current release's `boot.hash` instead of copying an old hash.

`vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import kit from './kit.config.js';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit(kit)],
  ssr: { noExternal: ['@yesid/tokens', '@yesid/seo-kit', 'bits-ui', 'gsap'] },
});
```

These source/ESM dependencies must compile in dev, SSR and tests too. Configure the same Kit
plugin when a Vitest config does not inherit Vite. Keep bundler choices in the product; no
shared bundler preset is required.

Add `"imports": { "#lib/*": "./src/lib/*" }` to the app's `package.json`. Kit 3 uses package
imports instead of `$lib`. Use `$app/env` for `browser`/`dev`, `$app/env/public` for public
environment values, and `$app/state` for `page`. `$app/stores` is removed. Hook types come
from `@sveltejs/kit/hooks`, not the package root.

After `svelte-kit sync`, compose the app's `tsconfig.json` with the generated config:

```json
{
  "extends": ["$app/tsconfig", "@yesid/config/tsconfig/svelte-kit.json"],
  "compilerOptions": { "rewriteRelativeImportExtensions": false },
  "include": ["src", "tests", "*.ts", "*.js"]
}
```

This no-emit app override permits `#lib/*.ts` imports. The shared library defaults stay intact.
Kit 3's `page.url` and search parameters are readonly: create `new URL(page.url.href)` or
`new URLSearchParams(page.url.searchParams.toString())` before editing a local copy.

### One server hook: initialization, fonts, language and theme

Put `%yesid.themeBoot%` before `%sveltekit.head%` in `src/app.html`, and set
`<html lang="%lang%">`. Only the stored theme is restored before paint; disclosure state
resets to declared defaults on each mount.

This example's product supports EN/FR paths. Add `src/lib/site.ts`:

```ts
export const locales = ['en', 'fr'] as const;
export type Locale = (typeof locales)[number];
export function localeFromPath(path: string): Locale {
  return path.split('/')[1] === 'fr' ? 'fr' : 'en';
}
export function localizeUrl(input: { href: string }, locale: string): string {
  const url = new URL(input.href);
  const path = url.pathname.replace(/^\/(en|fr)(?=\/|$)/, '');
  url.pathname = '/' + locale + (path || '/');
  return url.pathname + url.search + url.hash;
}
```

The app owns route creation, locale validation, translated copy and redirects. Replace these
helpers with its real routing policy when paths differ. `src/hooks.server.ts` composes every
operation in one `resolve` call:

```ts
import type { Handle, ServerInit } from '@sveltejs/kit/hooks';
import { injectThemeBoot } from '@yesid/ui/head';
import { preloadFont } from '@yesid/tokens/fonts';
import { initializeUi } from '#lib/ui-initialization.ts';
import { localeFromPath } from '#lib/site.ts';

export const init: ServerInit = () => { initializeUi(); };
export const handle: Handle = ({ event, resolve }) => {
  const locale = localeFromPath(event.url.pathname);
  return resolve(event, {
    preload: ({ type, path }) => type !== 'font' || preloadFont(path),
    transformPageChunk: ({ html }) => injectThemeBoot(html.replace('%lang%', locale)),
  });
};
```

For dynamic documents, apply the product's approved response headers around this same resolve
call. Static HTML/assets need the host's headers file or deployment configuration too; a server
hook alone does not cover them. `@yesid/seo-kit/headers` exports `SECURITY_HEADERS` and
`contentSecurityPolicy`; review HSTS/includeSubDomains/preload for the deployment before
adopting it. This guide does not change an existing host's HSTS policy.

### One persistent root layout: header, navigation and sections

Create the lifecycle once during root-layout initialization, outside any pathname key, conditional
header or `onMount`. Pass it through app props or context when the shell is a wrapper.
The following shell uses example English chrome; supply translated app-local labels/copy for
every locale before enabling those routes.

```svelte
<script lang="ts">
  import { page } from '$app/state';
  import { beforeNavigate, onNavigate, afterNavigate } from '$app/navigation';
  import { SiteRoot, SiteHeader, SiteFooter } from '@yesid/ui/layout';
  import { createNavigationLifecycle, SectionsToggle } from '@yesid/ui/brand';
  import { localeFromPath, locales, localizeUrl } from '#lib/site.ts';
  import '@yesid/tokens/fonts.css';
  import '../app.css';

  let { children } = $props();
  const locale = $derived(localeFromPath(page.url.pathname));
  const navigation = createNavigationLifecycle({ beforeNavigate, onNavigate, afterNavigate });
  const names = { en: 'English', fr: 'Français' };
  const home = $derived('/' + locale + '/');
  const links = $derived([{ href: home, label: 'Home', current: page.url.pathname === home }]);
  const labels = {
    openMenu: 'Open menu', closeMenu: 'Close menu', menu: 'Site menu', theme: 'Dark theme',
    menuFooter: 'Navigation · All routes', skipToContent: 'Skip to content',
  };
  const sectionCopy = {
    collapse: 'Collapse sections', expand: 'Expand sections',
    collapseTitle: 'Collapse all content sections', expandTitle: 'Expand all content sections',
  };
</script>

<SiteRoot lang={locale}>
  <SiteHeader {navigation} {home} {links} menuItems={links} {labels}
    language={{ locale, locales, href: (next) => localizeUrl(page.url, next),
      label: 'Language', names, preserveState: true }}>
    {#snippet actions()}<SectionsToggle copy={sectionCopy} />{/snippet}
  </SiteHeader>
  <main id="main">{@render children()}</main>
  <SiteFooter tagline="Example product" groups={[]} statusPrefix="System" liveLabel="Online">
    {#snippet brand()}<a href={home}>Example product</a>{/snippet}
  </SiteFooter>
</SiteRoot>
```

`SiteHeader.language` renders `LanguageToggle`; a second language control is unnecessary.
Standalone `LanguageToggle` from `@yesid/ui/brand` accepts the same `locale`, `locales`,
`href`, `label` and required `names`. For a standalone `preserveState` link, bind its `ref`
and pass a live `languageLink` getter as the lifecycle's second argument. `reload` performs
a document load instead.

`SectionsToggle` uses shared in-memory sections state. It appears with at least two mounted
content `CollapsibleSection` instances and expands all only when all are closed. TOC/filter/control
panels stay independent and disclosure state is never remembered. Put the control in page actions
if sections belong only to a detail route.

Kit 3 integrations omit the optional `subscribeNavigation`: there is no public accepted-start
stream carrying native events. Direct language switches keep an open menu and refocus its link.
An eventless language redirect closes it and restores ordinary page focus. Do not fabricate a
subscription from `$app/state` or document clicks. A custom router may supply a complete
accepted-start subscription under the [migration contract](migrations/navigation-lifecycle.md);
that optional path retains fake-adapter coverage. The lifecycle interrupts Lenis momentum but
leaves scroll restoration, analytics, view transitions and routing policy with the product.

Render `SeoHead` from `@yesid/ui/head` once with the route's resolved `title`, `description`,
`siteName`, `ogLocale` and absolute `image` (`url` and `alt`), plus `canonical` and `alternates`
where appropriate. The share card, favicon, robots and header utilities come from `@yesid/seo-kit`.
The app owns the actual URLs and metadata.

## 5. Apply the motion policy

Read `node_modules/@yesid/motion/src/policy.ts` before adding an animation. Use `shouldAnimate('motion-gated')` for scroll scrubs, parallax, pointer translation, large scale changes, rotation, ambient loops, and smooth scrolling. Small feedback in the `safe-always` tier can still run under reduced motion.

```ts
import { shouldAnimate } from '@yesid/motion/policy';

if (shouldAnimate('motion-gated')) {
  startAmbientSequence();
}
```

Use the store when the component must render reduced-motion state:

```svelte
<script lang="ts">
  import { prefersReducedMotion } from '@yesid/motion/stores/reducedMotion';
</script>

{#if $prefersReducedMotion}
  <p>Motion reduced</p>
{/if}
```

`@yesid/ui/base.css` already imports the Layer 1 `.tap-press` and `.tap-feedback` utilities.
Only a product that does not load that base stylesheet needs this direct import:

```css
@import '@yesid/motion/tap-feedback.css';
```

The stylesheet remains copyable from `@yesid/motion/tap-feedback.css` when the product must control Tailwind layer order or adapt the utilities for Tailwind v3/plain CSS. The motion package does not import application CSS automatically.

## 6. Run the brand gates as a lint script

Keep product policy in the product. Copy its real brand hexes, forbidden
patterns, contrast pairs, and identities into `tools/design-gates.ts`; do not
invent replacements or copy another app's table.

Create `tools/lint-design.ts` and run it as `"lint:design": "bun tools/lint-design.ts"`:

```ts
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import tokens from '@yesid/tokens/tokens.json' with { type: 'json' };
import {
  brandHexViolations,
  runContrastPairs,
  runIdentities,
  styleRegressionViolations,
} from '@yesid/gates';
import {
  PRODUCT_AA_PAIRS,
  PRODUCT_BRAND_HEXES,
  PRODUCT_FORBIDDEN,
  PRODUCT_IDENTITIES,
} from './design-gates.js';

const srcRoot = fileURLToPath(new URL('../src/', import.meta.url));
const generated = new Set([
  join(srcRoot, 'app.css'),
  join(srcRoot, '../tools/design-gates.ts'),
]);
const failures: string[] = [];

const brand = brandHexViolations({
  root: srcRoot,
  hexes: PRODUCT_BRAND_HEXES,
  allowlist: generated,
});
if (brand.fileCount === 0) failures.push(`No source files scanned: ${srcRoot}`);
for (const violation of brand.violations) failures.push(`Raw brand hex: ${violation}`);

for (const { reason, hits } of styleRegressionViolations({
  root: srcRoot,
  forbidden: PRODUCT_FORBIDDEN,
})) {
  if (hits.length > 0) failures.push(`${reason}: ${hits.join(', ')}`);
}

runContrastPairs(tokens, PRODUCT_AA_PAIRS).forEach(({ label, pass }, index) => {
  if (!pass) {
    const [, fg, bg] = PRODUCT_AA_PAIRS[index]!;
    failures.push(`${label}: color.${fg[0]}.${fg[1]}, color.${bg[0]}.${bg[1]}`);
  }
});
runIdentities(tokens, PRODUCT_IDENTITIES).forEach(({ label, pass }, index) => {
  if (!pass) {
    const [, a, b] = PRODUCT_IDENTITIES[index]!;
    failures.push(`${label}: color.${a[0]}.${a[1]}, color.${b[0]}.${b[1]}`);
  }
});

if (failures.length > 0) { console.error(failures.join('\n')); process.exit(1); }
```

`@yesid/gates` exports engines and neutral defaults from its root only. A
consumer with additional semantic color tokens, such as a product-specific
accent, must pass its full `brandTokens` list to `colorMixViolations` instead
of relying on the neutral default.

Run these commands in CI:

```sh
bun run lint:design
bun x vitest run
bun run check
bun run build
```

## 7. Test accessibility with the standard projects

`@yesid/config/playwright` gives every product the same Playwright projects and the same checks. Install
`@playwright/test` and `@axe-core/playwright` next to `@yesid/config`, in the workspace root of a monorepo; they are
optional peer dependencies.

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test';
import { yesidProjects } from '@yesid/config/playwright';

const baseURL = 'http://127.0.0.1:4173';

export default defineConfig({ use: { baseURL }, projects: yesidProjects(baseURL) });
```

```ts
// e2e/accessibility.spec.ts
import { expect, test } from '@playwright/test';
import { expectAccessible, expectNoHorizontalOverflow, expectTapTargets } from '@yesid/config/playwright';
import { routes } from '../src/lib/routes';

test.describe('accessibility', { tag: '@theme' }, () => {
  for (const route of routes) {
    test(route, async ({ page }) => {
      await page.goto(route);
      await expectAccessible(page);
    });
  }
});

for (const route of routes) {
  test(`${route} keeps the skeleton, fits the viewport and sizes its targets`, async ({ page }) => {
    await page.goto(route);
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('href', '#main');
    await expect(page.getByRole('banner')).toHaveCount(1);
    await expect(page.getByRole('main')).toHaveAttribute('id', 'main');
    await expect(page.getByRole('contentinfo')).toHaveCount(1); // 0 on a page without a footer
    await expectNoHorizontalOverflow(page);
    await expectTapTargets(page);
  });
}
```

Untagged tests run at phone (390×844), tablet (768×1024) and desktop (1440×900). Tag a test `@theme` to run it
once in each theme, or `@motion` to run it once with reduced motion.

- `expectAccessible(page, { include, exclude })` fails on any serious or critical violation of WCAG 2.2 AA or axe
  best practice, including a name that leaves out its visible text (WCAG 2.5.3). The contrast rule skips blueprint
  art (`.blueprint-bg`).
- `expectTapTargets(page, { exclude })` fails when a visible control is smaller than `--size-tap-min` (44px). A
  control that is the only one in its list item or table row needs WCAG's 24px, and a link inside a sentence is
  exempt.
- `expectNoHorizontalOverflow(page, scrollers)` fails when the page, or an element matching one of the `scrollers`
  selectors, scrolls sideways.

### The page skeleton

Every product renders the same skeleton, so the skip link and the landmarks match across sites:

```svelte
<SiteRoot lang={locale}>
  <SiteHeader … />  <!-- the skip link to #main, then the header: the banner -->
  <main id="main">{@render children()}</main>
  <SiteFooter … />  <!-- outside main, so it is the contentinfo landmark -->
</SiteRoot>
```

Wrappers are fine, such as a full-height shell or a scroll container that holds `main` and the footer, as long as
the order holds and the footer stays outside `main`. A full-bleed page, such as a map, may leave the footer out.

### Who owns what

| The packages guarantee | The product owns |
| --- | --- |
| The focus ring, with an outline under forced colors | Names that contain their visible text |
| The menu dialog: focus trap, Escape and focus return | Its own dialogs, charts, maps and forms |
| `<html lang>` after client navigation | Alt text, copy and CMS text, heading order |
| Reduced motion in the header, sheets and route transitions | Reduced motion in its own animations |
| The skip link, the banner and the footer landmark | `<main id="main">` and its routes |
| Footer links 44px both ways, `Wordmark` 44px tall, breadcrumb links 24px tall | Every other target: header link widths, injected search, actions and rail controls |
| Contrast of the token pairs, tested in `@yesid/tokens` | Colors it mixes from the tokens |

Component roles, names, states, focus and keyboard paths are tested in `@yesid/ui` and its Gallery. The product's
spec loops over its own routes and the states it opens, such as menus, dialogs and form errors, and never re-tests
the packages.

## 8. Keep localization authority and copy in the product

`@yesid/i18n-core` does not discover product locale authority or ship product copy. Consumers inject their concrete locale values, routing policy, framework adapters, and runtime flag values. Bind the locale plumbing once in the product's i18n module: `createLocaleRouting`, `createIntl` with the product's Intl tags, `createCopy` for typed copy dictionaries, and `createLocaleContext` from `@yesid/ui/state`, provided from the root layout, which also passes `lang` to `SiteRoot`. Format through `intl` rather than `toLocaleString` or a new `Intl.*` at the call site. Other packages continue to receive translated labels, placeholders, clear labels, empty states, option labels, and `StopLabel` prefixes from the product. See the [Combobox contract](../packages/ui/README.md#combobox) and the [localized StopLabel prefix](../packages/ui/README.md#stoplabel). The same durable package guide ships at `node_modules/@yesid/ui/README.md`.

Do not add product-specific locale checks, copy policy, or framework virtual-module imports to a package. If a third product needs a new copy seam, add a generic prop upstream with a default that preserves current consumers.

## 9. Measure

`@yesid/analytics` stays off until the product starts it. Start it once in the root layout:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import * as env from '$app/env/public';
  import { createAnalytics, defineAnalyticsPreset } from '@yesid/analytics';

  const preset = defineAnalyticsPreset({ events: [] });
  onMount(() => {
    createAnalytics(preset, { domain: env.PUBLIC_PLAUSIBLE_DOMAIN ?? '' });
  });
</script>
```

Set `PUBLIC_PLAUSIBLE_DOMAIN` to the production host (for example `example.com`) in the production
environment only; unset means off. The client sends only from that host or its subdomains, so leave
the variable unset for local, preview and fork deployments to keep them silent. Add
`https://plausible.io` to `connect-src` (see the CSP in section 4).

## 10. Bump the brand pin deliberately

A brand change follows one direction:

1. Edit `packages/tokens/tokens.json` in `yesid.dev-design`.
2. Regenerate and verify the upstream outputs.
3. Follow [`RELEASING.md`](../RELEASING.md) to publish the next release.
4. In the product, change the tag and version in every `@yesid` URL, run `bun install`, and review
   the lockfile diff and product overrides together.
5. Run the tests, typecheck, gates, and the production build.

Never use `^`, `~`, a branch, or a floating tag, and never
patch files under `node_modules/@yesid`. Upstream the change, release it, and let each consumer
choose when to take the bump.

## 11. Roll back

A rollback is the same edit pointing every `@yesid` URL at an earlier release this product already
accepted, in its own pull request, followed by the full product checks. If that release has a
different package set, add or remove the matching entries. Never move or replace an upstream tag.
