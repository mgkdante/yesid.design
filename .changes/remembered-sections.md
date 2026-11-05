---
"@yesid/ui": minor
---

The expand-all control remembers one origin-wide localStorage choice under `sections-choice`.
Pages with at least two content sections and the control start collapsed on a first visit; the
visitor's bulk choice wins across pages and visits. The collapsed control is orange and its
default active effect is `glow`. Individual toggles, the TOC and independent panels keep their
own state. Server HTML keeps complete, readable bodies, and the head boot script applies initial
geometry before paint. Blocked storage uses declared interactive defaults.
The body stays visible during parsing. Boot and app-resource failures expose pending bodies;
stalled startup has a five-second readable fallback. Other-tab choices apply to future mounts,
and late content adopts the bulk choice while preserving deliberate individual toggles.

This is the owner-approved D15 behavior change of 2026-11-05. Rebuild with the package's new
`boot.json` CSP hash, update disclosure expectations and privacy/device-storage copy, and rehearse
the prerelease on both products before stable promotion. No new props, settings, CMS fields or
consumer initialization are required. See `docs/migrations/remembered-sections.md`.
