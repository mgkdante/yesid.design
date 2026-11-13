---
"@yesid/ui": patch
---

Restore the shared 2px offset keyboard focus outline on every Button variant, including filled
buttons and links. The outline meets 3:1 contrast on page and card surfaces in both themes and
keeps the forced-colours outline. No prop changes or caller migration are needed. Unit and
Gallery browser regressions cover outline availability, contrast, stable geometry and accessibility.
