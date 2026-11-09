---
"@yesid/ui": patch
---

Section cards in `DetailFrame` are wider on phones. Below 768px, top-level section cards in the
center column now sit 8px from the screen edges instead of the 24px page gutter, so their text gets
about 32px more width. Nested cards, tablets and desktops are unchanged. Update product tests that
expect section cards on phones to line up with the page gutter.
