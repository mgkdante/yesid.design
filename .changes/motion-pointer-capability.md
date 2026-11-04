---
"@yesid/motion": minor
---

Unify the six hover effects behind `shouldAnimatePointerEffect(tier)`, exported from the root and
`@yesid/motion/policy`. Devices with a hover-capable fine pointer now get every effect, including
touchscreen laptops and touch-primary tablets with an attached mouse. Touch-only, coarse-only and
non-hovering devices get none. Existing reduced-motion tiers and Lenis/pressBounce touch gates are preserved.
No caller changes are required. Capability checks apply at mount time; remount after attaching a
pointer. The device regression table covers all six actions with and without reduced motion.

Boop and pressBounce now own separate transform channels, so a hover timer cannot clear a held
press or install a transform transition over GSAP. Boop uses individual scale/rotate properties;
pressBounce animates a value through GSAP and writes only transform. Both restore their owned
inline styles on destroy. All pointer effects return inert cleanup objects when matchMedia is
missing, including when the reduced-motion store is first imported without it.
