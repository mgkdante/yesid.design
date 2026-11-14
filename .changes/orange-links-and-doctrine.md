---
"@yesid/ui": minor
"@yesid/tokens": patch
---

Owner answer 9A (13 November 2026) approves orange text links in v0.43.0.
Text links (a link without a class) now use `--primary`. Remove product rules that colour
links yellow; a component that needs another link style styles its own. Underlines and focus
outlines stay unchanged. Rehearse the migration in yesid.dev, yesid.login and Transit.

Publish the doctrine and register recipes; amend colour descriptions without token value changes.
Deprecate SiteFooter's self-made `statusPrefix` / `liveLabel` date/status pair, retaining its API.
Omit both, or use `statusStart` with a real source, subject and observation time. Removal waits
90 days after publication and an intervening minor, or the owner's waiver. See
`docs/migrations/footer-status.md`. The former pulse is already still.
