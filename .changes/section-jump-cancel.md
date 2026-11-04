---
"@yesid/ui": patch
---

Keep in-flight section jumps through non-navigating clicks, including reopening the mobile TOC
while layout settles. Navigation links, newer jumps, history, route changes, root changes and
disposal still cancel stale landings. Real-component browser coverage reproduces the mobile
regression; cancellation tests preserve navigation and history restoration.
