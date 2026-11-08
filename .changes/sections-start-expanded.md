---
"@yesid/ui": minor
---

Content sections now start expanded on a first visit. With no `sections-choice` stored, or a
malformed one, pages with a `SectionsToggle` and at least two content sections open every section,
and the control shows Collapse all in its neutral state. A remembered Collapse all still collapses
content across pages and visits, and the control is orange after it. Blocked storage still uses
declared defaults.

The boot script changed, so `@yesid/ui/boot.json` has a new CSP hash. Products that import it
pick it up on rebuild; a manually copied hash must be updated. Update product tests that expect
collapsed content on a fresh visit. See
[Remembered sections](docs/migrations/remembered-sections.md#first-visit-opens-content).
