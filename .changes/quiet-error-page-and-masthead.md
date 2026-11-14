---
"@yesid/ui": minor
---

Quiet task headers and error page. `Masthead`'s `kicker` is now optional (omit it to start with
the heading) and a new `dot` prop (default `true`) can drop the brand dot; `tape` was already
optional. `ErrorPage`'s `label` is now optional, a new `tape` prop (default `true`) can drop the
hazard rule, and a new `illustration` prop (`'large-first'` default, `'small-after'` or `'none'`,
exported as `ErrorPageIllustration`) places the construction scene: `'small-after'` draws it small
after the heading, body, destinations and terminal line. Every default keeps today's output.

Fix: the suggestions navigation is always named. Without `suggestionsLabel`, or with an empty or
whitespace-only one, it was a navigation landmark with no usable name; it is now named by the
heading through `aria-labelledby`. Callers that pass a non-blank `suggestionsLabel` keep their
output; the heading gains an `id` either way. Regression proof: `packages/ui/src/layout/ErrorPage.test.ts`,
"names the navigation by the heading when suggestionsLabel is ..." (undefined, empty, spaces, tab,
newline and mixed whitespace), which fails on v0.42.0's `ErrorPage.svelte`, with server markup in
`ErrorPage.ssr.test.ts` and the Gallery's `quiet-task-headers.spec.ts`.

No migration is required. The error scene's lamps have been still since v0.42.0, so no still-lights
option was added.
