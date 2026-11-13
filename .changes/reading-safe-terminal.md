---
"@yesid/ui": minor
---

TerminalPanel now renders a lamp only with `signal={{ color, label, live? }}`. Colors reuse
StatusDotColor and the required caller label names the signal for screen readers. Only a live
signal pulses, after mount and when motion is allowed. Existing callers lose the automatic
traffic-light chrome and green pulse; status, tag, actions and footer remain unchanged.
This is a documented implementation-defect correction under DEPRECATION.md: decorative chrome
must not claim measured health. Unit and SSR regressions cover omitted and named signals;
Gallery checks cover motion gating at phone and desktop sizes.

Large section cards no longer scale on press under reduced motion. Global overscroll suppression
now applies only to fine pointers, preserving native touch overscroll and pull-to-refresh.
Gallery checks assert held-press geometry and pointer-specific computed overscroll styles.
