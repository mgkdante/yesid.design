---
"@yesid/ui": minor
---

Add SiteHeader `brand` and `wordmarkAutoPlay` (default true), and Button `wrap` (default false).
Existing callers keep their wordmark and button layout. A supplied brand owns its motion.
Empty effective menus now omit the menu button; compact controls remain in the pill without a
menu. Supply menu items to retain the menu. No language disclosure or replacement toggles.

Fix compact pre-hydration popover spacing and visible labels without changing toggle artwork,
and round the menu button focus outline. Regression browser cases fail on main before these fixes.

Fix table cells splitting ordinary words through inherited base styles: cells now use
`word-break: normal` and `overflow-wrap: break-word`. Review consumer table CSS overrides on
adoption; a word wider than the cell may still split. Browser regression at 320 and 390px fails
on main. Additive options require no migration; behavior fixes should be rehearsed in consumers.
