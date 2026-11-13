---
"@yesid/ui": minor
---

Add an optional `CollapsibleSection` summary snippet for the finding, period and caveat. It stays
visible outside the collapsible body, wraps without clamping and describes the heading button.
Existing subtitles keep their current behavior.

Correct section toggling so only the heading button toggles it. Body clicks and taps no longer
close text while it is being read. Header actions keep their own behavior. This is a defect fix
under DEPRECATION.md: regression tests cover prose clicks, touch followed by click and selection,
with Gallery checks at phone and desktop widths. Existing callers need no prop changes; move any
finding that must remain fully readable from subtitle into summary. Bulk preferences and jumps
are unchanged.
