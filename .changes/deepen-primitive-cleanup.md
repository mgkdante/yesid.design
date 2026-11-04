---
"@yesid/ui": minor
"@yesid/tokens": minor
---

Remove unused Toggle/ToggleGroup subpaths, Button variants secondary/destructive/link and sizes
xs/lg/icon/icon-xs/icon-sm/icon-lg, Badge variants secondary/ghost/link, Sheet left, and unused
inline-icon, button-group and invalid-state selectors. Use bits-ui directly for toggle behavior;
choose an existing supported variant/size or own a product-specific treatment locally. FilterGroup
keeps its DOM, classes and keyboard/selection behavior through bits-ui directly. Declared defaults,
Gallery-only destructive Badge/right Sheet, and Button ghost's dark hover remain.

Remove the eight sidebar color mappings, exact --radius, --secondary and --color-secondary.
Use semantic color tokens directly, --radius-md instead of --radius, and --popover instead of
--secondary. Keep --secondary-foreground and named radius tokens. Transit must migrate its
MetricInfo radius before adopting this token output. See docs/migrations/deepen-primitives.md.
These owner-approved removals have no deprecation window. No release is prepared by this change.
