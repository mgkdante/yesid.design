---
"@yesid/ui": patch
---

SurfaceRail keeps its controls mounted inside the mobile sheet until the closing animation finishes,
so dismissal slides the complete panel away without briefly showing an empty pill. Control state,
focus restoration and desktop breakpoint handoff are preserved. No migration is required.
