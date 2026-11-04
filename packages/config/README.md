# @yesid/config

Shared TypeScript, Svelte and Turborepo configuration for yesid repositories. It ships as
`yesid-config-X.Y.Z.tgz` on each `vX.Y.Z` release, in lockstep with the other packages.

## Compatibility

| Contract | Supported range |
| --- | --- |
| `tsconfig/base.json` (deprecated) | TypeScript `>=5.9 <7` |
| `tsconfig/library.json` | TypeScript `>=5.9 <7` |
| `tsconfig/svelte-kit.json` | TypeScript `>=6 <7`; SvelteKit `>=3 <4` |
| `svelte/project-runes.js` | Svelte `>=5 <6`; Kit 3 apps need Svelte `>=5.57.1` and Node `>=22.17` |
| `playwright/index.js` | Playwright `>=1.50 <2`; `@axe-core/playwright` `>=4.10 <5` |
| `turbo/base.json` (deprecated) | Turbo `>=2.9 <3` |

The TypeScript contracts run on the locked 5.9.3 and 6.0.3 compilers for libraries, and on 6.0.3
composed after the real Kit 3 generated config for apps. Gallery checks/build/browser tests run
on Kit 3.1.1, Svelte 5.57.2 and Vite 8.3.5. These are sampled versions within the supported ranges,
not an exhaustive version matrix. Kit 2 is no longer a supported app target. Both products extend
this config on TypeScript 6; package/tooling checks retain TypeScript 5.9. No config flags changed.
Only the Playwright export names its tools, as optional peers.

## TypeScript and Svelte

- `@yesid/config/tsconfig/base.json` is deprecated as an import: no product extends it directly, and
  `library.json` and `svelte-kit.json` keep it as their base.
- `@yesid/config/tsconfig/library.json` adds the no-emit library settings. Products still own
  module format, globals, libraries, paths and source inclusion.
- `@yesid/config/tsconfig/svelte-kit.json` composes after SvelteKit's generated config.
  Kit 3 writes `$app/tsconfig` during `svelte-kit sync`. Apps still own source inclusion,
  package `#lib/*` imports, runtime globals and any stricter local policy.
- `@yesid/config/svelte/project-runes.js` supplies the shared Svelte 5 runes policy. Pass
  `import.meta.dirname`; adapters, preprocessors, routes and version polling stay local.

```json
{
  "extends": [
    "$app/tsconfig",
    "@yesid/config/tsconfig/svelte-kit.json"
  ],
  "include": ["src", "tests", "*.ts", "*.js"]
}
```

```js
import { projectRunes } from '@yesid/config/svelte/project-runes.js';

// Pass this object to sveltekit(config) in vite.config.ts, not svelte.config.js.
export default {
  compilerOptions: { runes: projectRunes(import.meta.dirname) }
};
```

## Turborepo

`@yesid/config/turbo/base.json` is deprecated. Each product commits its own `turbo.json`, and nothing
reads this base any more. It goes no earlier than v0.31.0.

ESLint, Prettier, Vitest and deploy settings stay in each product until two products need the same
setup.

## Playwright

`@yesid/config/playwright` exports `yesidProjects(baseURL)`, the standard projects, and three checks:
`expectAccessible(page)` runs axe, `expectTapTargets(page)` measures tap targets and
`expectNoHorizontalOverflow(page)` catches sideways scrolling. See
[Test accessibility with the standard projects](https://github.com/mgkdante/yesid.dev-design/blob/v0.35.0-rc.1/docs/BUILD-A-YESID-PRODUCT.md#7-test-accessibility-with-the-standard-projects).
