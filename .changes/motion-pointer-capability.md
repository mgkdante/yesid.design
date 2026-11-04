---
"@yesid/motion": minor
---

Unify the six hover effects behind `shouldAnimatePointerEffect(tier)`, exported from the root and
`@yesid/motion/policy`. Devices with a hover-capable fine pointer now get every effect, including
touchscreen laptops and touch-primary tablets with an attached mouse. Touch-only, coarse-only and
non-hovering devices get none. Existing reduced-motion tiers, Lenis and pressBounce are preserved.
No caller changes are required. Capability checks apply at mount time; remount after attaching a
pointer. The device regression table covers all six actions with and without reduced motion.
