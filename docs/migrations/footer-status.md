# Footer status needs a source

Starting with v0.43.0, SiteFooter's `statusPrefix` / `liveLabel` pair is Deprecated.
The pair remains accepted and functional; it manufactures today's date without measuring
service health. Its former automatic pulse is already still under the no-endless-loop policy.

Omit both props when no measured status exists. For a real status use the existing
`statusStart` snippet with the source, subject, state and observation time supplied by the
product. Do not derive a status timestamp from the visitor's clock. No new status API is added.

```svelte
<SiteFooter {groups} {tagline}>
  {#snippet brand()}<a href={home}>Example product</a>{/snippet}
  {#snippet statusStart()}
    <p>{status.subject}: {status.label}. <a href={status.sourceUrl}>{status.sourceName}</a>.
      <time datetime={status.observedAt}>{status.observedLabel}</time></p>
  {/snippet}
</SiteFooter>
```

Only render that snippet when a real measurement exists. Products own and translate its words.
Removal requires 90 days from the first published deprecation and an intervening minor,
or the owner's explicit waiver. Earliest eligible version is v0.45.0 if v0.44.0 retains it;
the calendar date is publication date plus 90 days and is not established by this source PR.
