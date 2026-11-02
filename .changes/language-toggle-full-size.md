---
"@yesid/ui": patch
---

`LanguageToggle` keeps its boards full size at every width. Phones used to scale the whole post down to 34px, or 22px under 360px, which drew the language codes about 6px tall. The toggle no longer shrinks in a crowded pill, and below 768px it drops its side padding instead. The post stays centred and its pole runs past the 44px slot.
