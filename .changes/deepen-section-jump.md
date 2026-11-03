---
"@yesid/ui": minor
---

Replace the public TOC helper cluster with createSectionJump, useSectionJump and SectionJump.
One controller owns registration, active id, target opening, the 25% landing line, layout settling,
request cancellation, router fragments and reduced motion. TocNav, TocPill and DetailFrame share
it through navigation; content opening uses the section interface instead of private classes or
trigger clicks. Real-section unit, SSR and Gallery tests cover the integration.

This owner-directed breaking removal retires TOC_TARGET_SELECTOR, navigateToc, observeActiveToc,
onTocNavigate, openCollapsedTocTarget, reconcileActiveToc, revealTocTarget, settleLayout,
tocElement and RevealTocTargetOptions from the root and /brand entrypoints. The scoped exception
to both waiting gates is recorded in DEPRECATION.md. See docs/migrations/deepen-section-jump.md
for replacements, changed selector/landing semantics and the read-only consumer caller inventory.
