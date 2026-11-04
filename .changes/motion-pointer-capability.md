---
"@yesid/motion": minor
---

Unify device capability policy through the existing `shouldAnimate(tier, input?)` export from
both the root and `@yesid/motion/policy`. Its optional input is `pointer` or `touch-only`;
existing calls without an input keep their motion-only behavior.

All six hover effects require a hover-capable fine pointer, including a mouse on a touchscreen
laptop or touch-primary tablet. PressBounce now runs only on touch devices without that
capability, so boop and pressBounce are mutually exclusive. Hybrids use the same CSS press
baseline as desktops; retain `tap-press` or a deliberate CSS alternative on pressBounce callers.
The original transform-based action bodies and touch-only phone behavior are preserved.

Existing reduced-motion tiers and Lenis behavior remain. Missing matchMedia makes input-gated
actions inert, including on fresh imports. Checks apply at mount time. The device table covers
all seven actions under both motion preferences, and browser tests verify desktop/hybrid CSS
press feedback through the hover pulse and after it.
