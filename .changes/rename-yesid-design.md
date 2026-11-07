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

The repository is now `mgkdante/yesid.design`. Package names and APIs are unchanged. To migrate, replace `mgkdante/yesid.dev-design` with `mgkdante/yesid.design` in every tarball URL when you bump to this release. Verify this and later releases with `gh attestation verify --repo mgkdante/yesid.design`. Attestations for v0.36.0 and earlier stay bound to the old name, so verify those with `--repo mgkdante/yesid.dev-design`.
