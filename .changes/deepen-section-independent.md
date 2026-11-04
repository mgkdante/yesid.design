---
"@yesid/ui": minor
---

Add `CollapsibleSection.independent` for filter and control panels that keep their own open
state and stay outside content-section bulk actions, counts and the all-closed calculation.
Use `<CollapsibleSection independent bind:open={panelOpen}>` without changing the card's
rendering or storing disclosure state. Explicit section jumps still reveal the target panel
and its containing disclosures. Included in the coordinated v0.34.0 minor with primitive cleanup.
When content TOC entries exist, independent targets do not replace their active entry, counter
or pill label through observation or explicit jumps. Empty-entry controllers retain target activity.
Static independent panels have the same TOC protection; reveal requests leave their bound `open` unchanged.
