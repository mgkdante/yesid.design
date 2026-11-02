---
"@yesid/ui": patch
---

`SiteHeader` stops a smooth scroll still in flight when a navigation starts. Clicking a link while Lenis was still easing let the old animation carry on and scroll the new page down, so it could open at its bottom instead of the top. Back and forward navigation still restore the saved position.
