---
"@yesid/ui": patch
---

Fix SiteHeader compact mode removing language and theme control access before hydration:
the menu button opens the existing controls through a native popover while JavaScript is
delayed or disabled, then the existing dialog takes over after hydration. The toggles keep
their appearance and behavior, with one language link in the DOM and no hydration layout shift.
Keep priority-1 pill links eligible below 375px in compact mode when they fit; higher priorities
and callers without compactControls retain their folding rules.
Gallery regressions cover disabled and held JavaScript at 320, 390 and 599px, real language
navigation, keyboard reachability, hydration CLS, and EN/FR/ES action lengths at 320, 360 and
390px. These restore previously valid access under DEPRECATION.md.
