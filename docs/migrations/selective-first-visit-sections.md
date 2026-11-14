# Selective first-visit sections

Owner-approved opt-in under answer 5A, 13 November 2026. Existing callers keep their output.
On a page with `SectionsToggle` and at least two collapsible content sections, pass
`firstVisitClosed` to each optional `CollapsibleSection` that should start closed:

```svelte
<CollapsibleSection title={technicalTitle} firstVisitClosed>
  {#snippet summary()}<p>{technicalFinding}</p>{/snippet}
  <!-- Product-owned technical content -->
</CollapsibleSection>
```

A saved `sections-choice` of `expanded` or `collapsed` wins. Missing or malformed values use
the selective first-visit defaults without writing storage. If storage is blocked, the opt-in
still closes; other sections use declared defaults. Individual toggles do not persist.
Below the bulk threshold and for independent panels, `open` still owns the default.
Keep the page's main answer outside collapsible bodies. Do not mark content independent to
avoid the visitor's bulk choice. Fragments and TOC jumps still reveal their targets.
Without JavaScript all server-rendered bodies remain readable.

## CSP adoption

The head script bytes and their hash change together. The release's UI tarball continues to
include `src/head/boot.json`, exported as `@yesid/ui/boot.json`. Read the actual candidate
artifact after installing the exact candidate version, then compose its hash into the product's
`script-src` directive (with the required CSP single quotes):

```js
import boot from '@yesid/ui/boot.json' with { type: 'json' };
const bootSource = `'${boot.hash}'`;
```

Continue injecting `%yesid.themeBoot%` early in the head through `injectThemeBoot`.
Do not predict or copy the hash from an older release. Do not add a hash to a policy that relies
on `'unsafe-inline'`: hashes disable that allowance. Check the final product with its CSP enforced,
including delayed hydration, blocked storage and no JavaScript.

## Consumers checked read-only

Transit T4, T6, T7 and T11 can opt optional depth into this prop while keeping findings visible;
map tools remain independent. yesid.dev's case-study technical section can use the same prop,
with its localized title and summary. Selecting the optional section is a product decision;
no title matching, new CMS field or product-specific branch is introduced here.
yesid.login has no content-section adoption. Product rehearsal remains required at release adoption.

Gallery proof: `/sections/selective`, first visit mixed, saved Collapse all, saved Expand all.
