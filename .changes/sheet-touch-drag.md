---
"@yesid/ui": patch
---

Bottom Sheet detents can now be dragged by touch. A touch drag on the handle used to stop after its first move, because the
touched child's implicit pointer capture ended when the sheet took capture, and that event bubbled up as the end of the
drag. Only the sheet's own lost capture ends a drag now. Mouse drags, taps and keyboard changes are unchanged. No migration is required.
