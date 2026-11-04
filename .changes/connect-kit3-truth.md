---
"@yesid/config": minor
"@yesid/ui": patch
---

Document Kit 3 as the supported app target, with TypeScript 6 for SvelteKit consumers and
TypeScript 5.9/6 for the library config. Config flags and package runtime source are unchanged.
The repository contract suite composes the real Kit 3 config on TypeScript 6, and Gallery now
runs Kit 3, Vite 8 and the hook-only navigation lifecycle. The optional accepted-start adapter
retains fake-router coverage; eventless language redirects close the menu on Kit 3.

Follow the composed product guide for boot hooks, fonts, theme and language injection, Kit/Vite
config, header/navigation/language/section controls, source scanning and required peers. The UI
README uses Kit 3 and the existing tap-size token; migration/deprecation notes name shipped
v0.33.0 and v0.34.0 changes. This does not establish consumer adoption or deployed acceptance.
