---
"@yesid/motion": minor
---

The global ripple now skips any click inside an element marked `data-ripple-exempt`, without needing an `exclude` option.
Mark reading surfaces such as article bodies, editorial cards, charts and maps with the attribute so the ripple stays on
navigation and controls. A consumer `exclude` selector still works and now adds to this rule instead of being the only
one. Consumers that already pass `exclude: '[data-ripple-exempt]'` can drop it; leaving it in place is harmless. No other
migration is required.
