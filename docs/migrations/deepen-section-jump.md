# Section-jump migration (D-b)

One page controller now owns registration, active identity, target opening, the 25% landing line,
layout settling, reduced motion and fragments. No navigation code queries private section classes
or clicks disclosure triggers. The controller scopes D-a's openSection(anchor, root?) call to its
registered page root, so an identical anchor in another scope is left alone. Jumping opens the
requested content section; it does not collapse or expand other sections. The expand-all label updates from the resulting section state.

## Page setup

```svelte
<script lang="ts">
  import { afterNavigate } from '$app/navigation';
  import { useSectionJump, TocNav } from '@yesid/ui/brand';
  import { DetailFrame } from '@yesid/ui/layout';
  const navigation = useSectionJump(afterNavigate);
  // entries and localized labels remain consumer-owned.
</script>

<TocNav {entries} {navigation} heading={contentsLabel} />
<DetailFrame toc={{ entries, navigation, landFragments: true, openAria, closeAria }}>
  <!-- Real CollapsibleSection children with their anchor ids. -->
</DetailFrame>
```

Call the helper once during page initialization. It registers the router callback and handles
mount ordering; remove afterNavigate(onTocNavigate). DetailFrame registers the entries and
releases observers, listeners and pending work on unmount. Standalone pages use createSectionJump()
and return navigation.register(entries, options) from their effect/lifecycle. Re-register when the
entry identities or target scope change. Each controller belongs to one page/scope.

The public interface is createSectionJump, useSectionJump, SectionJump and the existing TocEntry.
TocNav/TocPill accept navigation and derive activeId from it when no explicit activeId is passed.
Existing explicit activeId and onNavigate adapters remain supported. DetailFrame.toc.navigation
shares the same controller. The TOC's own disclosure remains independent of content sections.

## Custom reveals and restoration

- Replace manual open-signal + tick + settle + scroll sequences with
  navigation.jump(id, { beforeReveal, behavior }). Keep product tab/grain selection in beforeReveal;
  it may return a promise. The controller then resolves the mounted target, opens its owning
  content section, observes it, waits for settlement and lands it. Latest request wins; cleanup
  and router history cancel pending work. An external isCurrent generation counter is unnecessary.
- A missing, detached or superseded target returns false. Use that result for app-owned fallback
  scroll restoration. ProjectDetailPage's locale restoration can request behavior: 'auto' for a
  captured heading, then restore raw y only if the jump returns false. Its former 20% calculation
  becomes the shared 25% line. No private element lookup or scroll-offset formula is needed.
- Smooth behavior is always downgraded to auto under reduced motion. Every jump lands at the
  quarter-viewport line, including consumers that previously called scrollIntoView(block: 'start')
  directly. The observer uses that same viewport-height line and refreshes on resize.
- selector now adds headings to marked sections and explicit entry ids. Delete copied base target
  inventories such as yesid.dev's toc-selector utility; supply only the product's additional
  heading selector. Registered entries may identify section-N, data-toc anchors or ordinary ids.
- Keep loading/presence policy local. If a consumer deliberately retains its active id while an
  asynchronous list is temporarily empty, defer replacing that registration until its list is ready.
- Keep D-a's keyed page/entity boundary. Changing an anchor on a reused section does not reset its
  open state; a jump opens the target explicitly. No router reset or persistence is added.

## Removed public exports and read-only caller inventory

Removed from both @yesid/ui and @yesid/ui/brand. Scanned both consumer source trees on 2026-11-03;
no consumer files were edited. This is source migration evidence, not consumer adoption proof.

### TOC_TARGET_SELECTOR

Remove the composed base selector; registration owns it. Pass only additional headings in selector.

- yesid.dev: `apps/web/src/lib/utils/toc-selector.ts`

### navigateToc

navigation.jump(id), or pass navigation to the TOC view.

- yesid.dev: `apps/web/src/lib/components/blog/BlogDetailPage.svelte`
- yesid.dev: `apps/web/src/lib/components/services/ServiceDetailPage.svelte`
- yesid.dev: `apps/web/src/lib/components/projects/ProjectDetailPage.svelte`

### observeActiveToc

navigation.register(entries); read navigation.activeId.

- transit: `apps/web/src/lib/features/stops/reliability/sections/StopReliabilitySurface.svelte`
- transit: `apps/web/src/lib/features/health/HealthStatus.async.svelte.test.ts`
- transit: `apps/web/src/lib/features/lines/reliability/RouteReliabilityClusters.svelte`

### onTocNavigate

useSectionJump(afterNavigate), shared with DetailFrame via toc.navigation.

- yesid.dev: `apps/web/src/lib/components/services/ServiceDetailPage.svelte`
- yesid.dev: `apps/web/src/lib/components/blog/BlogDetailPage.svelte`
- yesid.dev: `apps/web/src/lib/components/projects/ProjectDetailPage.svelte`

### openCollapsedTocTarget

No callback needed: jump opens its target through the content-section interface.

- transit: `apps/web/src/lib/components/surface/EntityDetail.svelte`
- transit: `apps/web/src/lib/features/lines/reliability/RouteReliabilityClusters.svelte`

### reconcileActiveToc

register reconciles the active id against the previous entry order.

- transit: `apps/web/src/lib/components/surface/EntityDetail.svelte`
- transit: `apps/web/src/lib/site/articleNavigation.svelte.ts`

### revealTocTarget

navigation.jump(id, { beforeReveal, behavior }); request cancellation is internal.

- transit: `apps/web/src/lib/components/surface/EntityDetail.svelte`
- transit: `apps/web/src/lib/features/network/reliability/sections/NetworkSurface.svelte`
- transit: `apps/web/src/lib/features/stops/reliability/sections/StopReliabilitySurface.svelte`
- transit: `apps/web/src/lib/features/lines/reliability/RouteReliabilityClusters.svelte`
- transit: `apps/web/src/lib/site/articleNavigation.svelte.ts`

### settleLayout

No separate call: jump waits for layout internally.

- transit: `apps/web/src/lib/features/health/HealthStatus.svelte`
- transit: `apps/web/src/lib/features/metrics/MetricsExplainer.svelte`

### tocElement

Use jump for navigation/heading restoration and its boolean result for fallback policy.

- transit: `apps/web/src/lib/features/metrics/MetricsExplainer.svelte`
- transit: `apps/web/src/lib/features/health/HealthStatus.svelte`
- yesid.dev: `apps/web/src/lib/components/projects/ProjectDetailPage.svelte`

### RevealTocTargetOptions

Jump options are inferred from SectionJump.jump; beforeReveal may be async. No external isCurrent or block option.

No consumer source callers found.

## Adoption verification

Both consumer bumps still need their own typecheck, source guards, unit, build, accessibility,
responsive, reduced-motion and browser checks. Transit must check asynchronous tab/grain reveals
and its receipt/reliability/metrics/health navigation. yesid.dev must check blog/project/service
fragments, locale restoration and desktop/mobile duplicate targets. Gallery tests prove the
neutral package flow only. D-a and D-b remain unreleased until integration and release approval.
