---
"@yesid/ui": patch
---

`SiteHeader` now moves its links to the menu whenever the pill would not fit its header with 4px
to spare, measured from the real labels. The fixed 375px threshold alone let longer labels run off
narrow phones: yesid.dev's Spanish header was 399px wide on a 390px phone. Width thresholds still
apply before the app script runs. No API change.
