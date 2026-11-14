# Gallery

A private SvelteKit app that renders the tokens, UI and motion packages from the workspace: token
sheets, primitives, brand components, motion, and the listing, detail, data, error and site-header
pages. Its unit and Playwright suites check rendered behavior and accessibility. It is never
released, and a passing Gallery run does not replace a product's own tests.

Gallery runs SvelteKit 3 with TypeScript 6 and Vite 8. `kit.config.js` is passed to the
`sveltekit` Vite plugin; `tsconfig.json` composes `$app/tsconfig` after sync. Its persistent
layout uses the hook-only navigation lifecycle, as both products do. Direct language links
preserve an open menu; eventless redirects close it and reset focus. The optional accepted-start
subscription remains covered by the UI package's fake-router tests, not a Kit 2 browser fixture.

Gallery uses `@yesid/tokens`, `@yesid/motion` and `@yesid/ui` at runtime and `@yesid/gates` in its
tests, with its own gate policy, demo data and theme persistence. Packages never import it. Its
coverage test fails when a public UI family or shared motion action has no example.

## Commands

```sh
bun run --cwd apps/gallery dev
bun run --cwd apps/gallery test
bun run --cwd apps/gallery check
bun run browser:install
bun run test:browser
bun run test:browser:list
```

`GALLERY_BROWSER_PORT=4187 CI=1 bun run test:browser` selects an isolated port (PowerShell:
`$env:GALLERY_BROWSER_PORT="4187"; $env:CI="1"; bun run test:browser`). Server reuse is always off.

`browser:install` downloads Chromium once. `test:browser` builds the Gallery, then runs Playwright;
`test:browser:list` lists the browser matrix without building. Browser runs are pinned to Chromium,
UTC, `en-CA` and reduced motion, on the standard projects from `@yesid/config/playwright` (untagged
tests at phone, tablet and desktop, `@theme` tests in light and dark, `@motion` tests with reduced
motion), with one worker and no retries. They assert behavior, never pixels.

`/text-links` demonstrates orange underlined prose links on every documented surface and
a dark island. `/registers` demonstrates expressive, reading and task regions with EN, FR
and ES copy. The focused `text-links.spec.ts` checks cues, forced colours and 320 to 1920px.
