---
"@yesid/ui": minor
---

Add the opt-in `@yesid/ui/station-tabs.css` signage look for Tabs triggers and native navigation
links. Import it after base.css and apply `station-tabs` to the rail and `station-tab` to controls.
Active state follows bits-ui's `data-state="active"` or a link's `aria-current="page"`.
Weight, inactive ink and inactive hover-rule color remain independently adjustable CSS variables.
Hover keeps full-strength text and shows the existing 3px bottom rule. The inset focus outline
uses the control's text color for visible keyboard focus on both inactive rails and active chips.
Existing Tabs variants are unchanged. Product copy removal and regression checks happen at adoption.
