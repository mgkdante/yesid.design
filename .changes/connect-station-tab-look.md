---
"@yesid/ui": minor
---

Add the opt-in `@yesid/ui/station-tabs.css` signage look for Tabs triggers and native navigation
links. Import it after base.css and apply `station-tabs` to the rail and `station-tab` to controls.
Active state follows bits-ui's `data-state="active"` or a link's `aria-current="page"`.
Weight, inactive ink and inactive hover opacity remain independently adjustable CSS variables.
Existing Tabs variants are unchanged. Product copy removal and regression checks happen at adoption.
