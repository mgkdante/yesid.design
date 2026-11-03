---
"@yesid/ui": minor
---

Replace QuietModeButton with SectionsToggle and quietMode with in-memory sections state.
The single expand-all control collapses all content sections whenever any is open, and expands
all only when every section is closed. It hides with fewer than two mounted collapsible content
sections. The TOC card, filter groups and listing filter panels remain independent; the TOC does
not count toward the content-section threshold.
Remove remembered open/closed state, the Remember/Forget control, persistence props, quiet-mode
classes/marks and remembered-state boot logic. openSection(anchor) opens mounted sections.
See docs/migrations/deepen-disclosure.md for the breaking API renames/removals, consumer caller
inventory and CSP hash migration. The owner explicitly requested these removals for the next minor
on 2026-11-03; the standard deprecation waiting periods have not elapsed.
