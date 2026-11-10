---
"@yesid/tokens": patch
"@yesid/motion": patch
"@yesid/gates": patch
"@yesid/seo-kit": patch
"@yesid/ui": patch
"@yesid/analytics": patch
"@yesid/i18n-core": patch
"@yesid/config": patch
---

Pack sibling design dependencies at the release's own repository, tag and asset
version, including previously pinned URLs from before the repository transfer to
yesid-dev/yesid.design. New tarballs no longer retain old-owner sibling URLs that
rely on GitHub redirects. All-eight-package packing regression checks every
design dependency URL against the canonical repository. Public APIs are unchanged;
consumers receive this correction through the next normal release upgrade.
