# @yesid/ui

Source-shipped Svelte 5 primitives and promoted brand components. The package owns reusable
rendering mechanics and shared theme, content-section actions and tab-scoped state in `@yesid/ui/state`.
Consumers choose what to persist and own product copy, policy, data, routing and every recorded
compatibility seam. Consumers import individual families so unused primitives stay out of their
bundle. The primitives are owned code derived from shadcn-svelte under MIT;
there is no shadcn CLI, registry or package dependency.

```svelte
<script lang="ts">
	import { Badge } from '@yesid/ui/badge';
	import { Button } from '@yesid/ui/button';
	import { Card } from '@yesid/ui/card';
	import { Combobox, type ComboboxOption } from '@yesid/ui/combobox';
</script>

<Card>
	<h2 class="px-4">Queue status</h2>
	<div class="px-4"><Badge>Ready</Badge></div>
	<Button>Open queue</Button>
</Card>
```

`@yesid/ui/card` exports only `Card` and its `Root` alias. Compose its content with ordinary
markup. Variant functions stay internal to the Button, Badge and Sheet implementations; their
props and public variant types remain available.

## Source scanning and application tokens

Because the package ships source, a Tailwind product must scan it. Point `@source` at the
installed source, relative to the stylesheet that holds the directive:

```css
@source "../node_modules/@yesid/ui/src";
```

`Combobox` preserves a 44px minimum tap target through `var(--size-tap-min)`. Import
`@yesid/tokens/tokens.css`, which defines `--size-tap-min: 44px`; products do not need to redeclare
it. Product copy, placeholders, labels, options and localized prefixes always stay in the caller.

## Current public component contracts

### Rendered-element ownership

`ButtonProps` and `BadgeProps` discriminate on `href`. `null` or `undefined` selects the
button/span branch; any string, including `href=""`, selects the anchor branch. Each branch
exposes its real element ref, events, and attributes. Anchor-only attributes are rejected on the
button/span branches. Button-only attributes are rejected on the Button anchor branch except for
the wrapper-owned disabled-link API.

Fixed-content `ChevronToggle`, `SectionLabel`, `StopLabel`, and `TerminalCursor` reject `children`
and export named prop types from `@yesid/ui/brand`. `CollapsibleContent` keeps consumer children
but hides the low-level bits-ui `child` hook because the wrapper owns its animation scaffold.

### Combobox

`Combobox` accepts an optional bindable `value?: string | null` and bindable `open`. It forwards
the supported root behavior props and invokes `onValueChange`, `onOpenChange`, and
`onOpenChangeComplete` once per committed change. The input shows the typed query while searching
and the selected label otherwise, including after an external value update. Closing resets the
transient query; clearing commits `null`; disabled state reaches the clear control.

The caller supplies the option catalogue, stable values, visible labels, optional glyphs and
sublabels, precomputed search haystacks, a pure fold function, and all accessible copy. Filtering
uses token-AND matching over the caller's folded haystack. The package does not import product
locale or copy modules.

### Separator

`Separator` has a discriminated surface. The `default` variant delegates to bits-ui and retains
its `child`, `children`, and `decorative` contract. `hazard` and `gradient` render native
wrapper-owned divs, accept native div attributes, and reject delegated-only props. Custom
variants consume `orientation` instead of leaking it to the DOM, apply `maxWidth`, forward the
outer ref, and preserve or default `data-slot` on that outer element.

The hazard tape is full width by default; the gradient rule defaults to `var(--width-content)`.
Labels use the shared station label vocabulary.

### Sheet

Sheet exports named prop types for Root, Trigger, Close, Portal, Content, Overlay, Header, Footer,
Title, and Description. `SheetContentProps.portalProps` excludes portal children because Content
owns the portal body. `closeLabel` is required caller-owned accessible copy whenever the close
button can appear (including the default). Only `showCloseButton={false}` permits omitting it.
There is no built-in English label.

## UI configuration

Primitives merge package classes with the caller's `class` prop. The package uses one
module-level merger and exposes a boot-time configuration hook:

```ts
import { configureUi, type ConfigureUiResult } from '@yesid/ui/cn';

const result: ConfigureUiResult = configureUi({
	vocab: {
		text: ['console-label'],
		colors: ['metric-healthy', 'metric-warning'],
	},
});
```

`ConfigureUiResult = 'initialized' | 'unchanged'` is observable public API. `configureUi` is
single-assignment per loaded ESM module graph. The first explicit call in an unlocked graph stores
its semantic configuration and returns `'initialized'`. Omitted fields and empty arrays mean the
zero-configuration default. Vocabulary arrays are deduplicated and order-insensitive, so an
equivalent repeat returns `'unchanged'`. A conflicting repeat throws without replacing the first
merger. There is no reset API.

The first `cn` use, including a primitive's first class merge, locks the zero-configuration
default. Products with custom vocabulary must initialize before any primitive renders. Use one
shared initializer imported by both SvelteKit `hooks.client.ts` (`ClientInit`) and
`hooks.server.ts` (`ServerInit`), not a root layout instance script. See the
[product guide](https://github.com/yesid-dev/yesid.design/blob/v0.41.1/docs/BUILD-A-YESID-PRODUCT.md)
for the complete hook pattern.

The state boundary is the loaded ESM module graph. Browser and SSR bundles, separately bundled
package copies, workers, and HMR-recreated graphs have independent state. Configuration is fixed
application vocabulary only. Never derive it from a request, tenant, user, locale, or other
runtime-scoped value. A provider/context API and per-component `cn` plumbing remain intentionally
outside the public contract.

Package-owned `tailwind-variants` definitions use the base `twMergeConfig` so package vocabulary
is deterministic. The second `cn` merge is where consumer vocabulary applies. There are no app
checks or consumer conditionals in either stage.

## Primitive family seams

These seams are part of the consumer contract. They say what the package owns and what a product
must keep locally to avoid an unreviewed visual or behavior change.

### Badge

Variants are `default`, `destructive`, `outline`, `tag`, `tag-active` and `number`; sizes
remain `default`, `xs` and `sm`.

The package owns the shared variants, sizes, rendered-element split, and merge configuration.
Consumer typography may still resolve named tokens differently. In particular, a product that
must preserve its existing number-badge size keeps the relevant class or adapter locally.
`TocBadge` pins its number to `0.75rem` so current products and Gallery agree without changing the
general Badge token contract.

### Button

Variants are `default`, `conversion`, `outline` and `ghost`. Sizes are `default`, `sm`,
`icon-tap`, `cta-sm`, `cta` and `cta-lg`.

The package owns the variants, the element split, disabled-link behavior and the touch
`pressBounce`. `conversion` is the yellow signage CTA (at most one per view); the `cta` sizes
lift on hover. `icon-tap` is the 44px touch target. A caller's `data-slot` replaces the default.

### Card

A solid panel with a lit top bevel (`edge-highlight`); hover firms the border and adds
`shadow-section`. `interactive` adds a one-pixel rise, removed under reduced motion.

### Collapsible

`CollapsibleContent` force-mounts by default, adds the grid/clip scaffold, marks closed content
`inert` and `aria-hidden`, and transitions grid rows plus opacity with `--duration-slow` and
`--ease-default`. Reduced motion removes the transition. A consumer replacing a transparent
Content wrapper must account for the extra DOM, forced mounting, closed-state semantics, and both
animation directions.

### Resizable

Panes, groups and a neutral handle (`withHandle` adds the rounded grip).

### Scroll Area

Root, viewport binding, axes, scrollbars, thumb, corner, and forwarded props are shared. Current
consumer marker-class and transparent-border spelling differences have no visual effect and do
not create a package variant. Add an adapter only if a live consumer selector establishes one.

### Tabs

For station signage, import `@yesid/ui/station-tabs.css` after `base.css`. Apply `station-tabs`
to `Tabs.List` and `station-tab` to each `Tabs.Trigger`, or use the same classes on a native
`nav` and its links. The CSS module has no Tabs or JavaScript dependency. It reads
`data-state="active"` on triggers and `aria-current="page"` on links; callers own selection,
navigation, accessible labels, keyboard behavior, disabled-link handling and overflow scrolling.
Keep the rail horizontal. Product geometry (strip height, padding, centering, fades), distance
opacity and swipe guards remain in the product. Remove the previous local look when adopting.

```svelte
<script lang="ts">
	import '@yesid/ui/station-tabs.css';
</script>

<nav class="station-tabs" aria-label="Service pages">
	<a class="station-tab" href="/overview" aria-current="page">01 Overview</a>
	<a class="station-tab" href="/connections">02 Connections</a>
</nav>
```

The shared defaults are active weight 700, inactive ink `--primary-foreground`, a 3px bottom rule
on inactive hover (with text at full strength), and minimum tap height `--size-tap-min`. Active chips use `--signage-bg` and
`--signage-text` in both themes. Set `--station-tab-active-weight`, `--station-tab-ink` and
`--station-tab-hover-rule-color` on the rail to change those three decisions independently.
The hover rule defaults to `currentColor`; `transparent` hides it without dimming the text.
Reduced motion removes the rule-color transition. Keyboard focus uses a 2px inset outline in
the control's current text color so it contrasts with both the inactive rail and active chip.
Gallery's `/station-tabs` renders both compositions. Ordinary Tabs variants stay unchanged.

The package targets bits-ui's real `data-state="active"` selector and rejects the dead
`data-active:` form. A product may keep its rail height, padding, active shadow, underline
position, and typography locally. Adoption requires visual comparison of those geometry and
active-state details rather than treating the import replacement as sufficient proof.

### Sheet and Skeleton

Sheet supports `bottom` and `right`. Its bottom side is the mobile-first default; its overlay, focusable close control, animation,
and side geometry are package-owned. Skeleton is decorative (`aria-hidden="true"`) and its pulse
stops under reduced motion. A product with no prior local family treats first use as a new
product-level visual and accessibility decision, not proof supplied by the package.

### Draggable bottom sheets

`Sheet.Content` accepts `detents` to opt into draggable heights. Supply at least two stops,
ordered from smallest to largest, with unique ids. Each stop has `{ id, size, label }`.
Sizes use positive `px` or `%`; percentages become `dvh`. Stops of the same unit must ascend.
When mixed units cross on a short viewport (`120px` against `50%`), a stop is floored at the
earlier one, so the order never reverses. Detents require `side="bottom"` (the default)
and `handleLabel`. Both the handle name and each stop's label are caller-owned copy.

`bind:detent` stores the current id. Missing or unknown ids resolve to the first stop.
`ondetentchange(id)` fires only when the user changes stops by dragging, keyboard or handle tap.
Content exposes `data-detent` for caller styling. A header should use `shrink-0`; a scrolling body
should use `min-h-0 flex-1 overflow-y-auto`. The handle occupies 44px above the header.
Interactive controls, scrollable descendants and `[data-sheet-no-drag]` do not start drags.
There is no drag-to-dismiss. Height snaps use motion tokens and become instant under reduced motion.
The id and CSS size hold through viewport changes without a resize listener.

`modal={false}` works with or without detents. It removes the overlay, focus trap and scroll lock.
The page remains interactive, outside clicks keep the sheet open, and Tab can leave it. Escape
closes only from inside the sheet. Caller-supplied Bits props override these defaults.
Modal behavior remains the default.

Persistence belongs to the caller. For tab-scoped persistence:

```svelte
<script lang="ts">
  import * as Sheet from '@yesid/ui/sheet';
  import { persisted } from '@yesid/ui/state';
  const height = persisted('detail-height', 'peek');
  const stops = [
    { id: 'peek', size: '120px', label: 'Peek' },
    { id: 'half', size: '50%', label: 'Half height' },
    { id: 'full', size: '90%', label: 'Full height' },
  ] as const;
</script>

<Sheet.Root>
  <Sheet.Trigger>Open detail</Sheet.Trigger>
  <Sheet.Content detents={stops} bind:detent={height.value}
    handleLabel="Detail height" closeLabel="Close detail" modal={false}>
    <Sheet.Header class="shrink-0"><Sheet.Title>Detail</Sheet.Title></Sheet.Header>
    <div class="min-h-0 flex-1 overflow-y-auto">Body</div>
  </Sheet.Content>
</Sheet.Root>
```

Alternatively keep local `bind:detent` state and write the id through `ondetentchange` when only
user changes should persist. The component supplies no storage key or translated strings.

### Combobox compatibility

The package public name and DOM hooks are `Combobox`, `ComboboxOption`, `ComboboxProps`, and
`data-slot="combobox"`; no `LineCombobox` compatibility alias exists. Consumers preserve their
caller-provided copy and change imports, types, component names, and any DOM-hook selector
together. The value, options, filtering, glyph, markup, and accessibility behavior do not depend
on a product name.

## Brand components and composed patterns

### BlueprintShell

Nested SVG text normalization is controlled by `normalizeTextFont`. The default normalizes to
`var(--font-mono)`; a consumer preserving presentation-attribute behavior passes `false`. Source
guards compare numeric CSS meaning rather than lexical forms such as `0.30` versus `0.3`.

### ChevronToggle and SectionLabel

These components own their shared SVG/classes and label styles. Both Chevron directions retain
the established 90-degree open rotation, keyed on `data-state="open"`. Equivalent class ordering is
not a consumer seam.

### SliderButton

The previous/next control for sliders, carousels and lightboxes: a round tap target with a
chevron drawn on the button centre. `direction` and `aria-label` are required; state such as
`disabled` and handlers pass through.

### StopLabel

The component supports an optional label and heading element and defaults `prefix` to `ARRÊT`.
Locale tables and locale selection stay in the product; the consumer passes the resolved prefix.
No product locale type or copy table enters the package.

### MetroStation

Renders the zero-padded station number in a 2rem signage roundel with a pulse.

### TocBadge

The package owns the narrow badge-spec union and renders icons with the public `SectionIcon`. Its
number stays at `0.75rem` across current products even where a consumer's general `text-micro`
token differs.

### TerminalCursor

A blinking block cursor in `accent` (`accent-text` in light); it stops blinking under reduced motion.

### TerminalPanel and CodeBlock

`TerminalPanel` is the terminal window: a title bar with the
`title`, an optional `tag` and `status` and an `actions` snippet, a hazard rule, the body (pass
`noPadding` when the content pads itself) and an optional `footer` readout of label and value
pairs. Extra attributes go to the root. Its look comes from the `.terminal-*` classes in
`base.css`, so markup rendered on the server can wear the same chrome.

There is no lamp or colored window chrome by default. To report a status the caller can verify,
pass `signal={{ color: 'green', label: 'Live feed', live: true }}`. `color` uses `StatusDotColor`;
`label` is required and supplies screen-reader text. Omit `live` for a steady lamp. Only `live: true`
may pulse, after mount and when the `motion-gated` policy permits it. Server output stays still,
and reduced-motion CSS also suppresses the pulse. `status` remains independent text.
Removing the automatic green pulse corrects an unmeasured status claim; existing callers need
no prop changes unless they want to report a verified signal.

`CodeBlock` puts source in a `TerminalPanel` with the `language` as its tag. Pass `copy` labels
to show a copy button; it copies `code` and shows ✓ for two seconds, or `copy.failed` if the
clipboard refuses, and a polite status announces `copy.copied` or `copy.failed`. Highlight on the
server with `@yesid/seo-kit/highlight` and render its markup as `children` inside
`<pre tabindex="0"><code>` so the keyboard can scroll it; give the `<pre>` `role="region"` and an
`aria-label` if it needs a name. `base.css` colors the `syn-*` classes through the `--syntax-*`
tokens. Without `children` the code shows as a plain, focusable `<pre>`.

### ConstructionProps

The four original yesid.dev construction artworks: crossing sign, helmet, barricade and Montréal
balise, with their original responsive ground positions. The caller owns the positioned scene
above its footer. Optional `lighting` preserves the warm scene treatment. Pass a stable marker
before the growing ground as `revealAt` and, for nested scrolling, its viewport as `revealRoot`.
Reveal starts when that collapsed footer edge enters 5% of the active viewport and completes
over the next 25vh of scrolling, reversing proportionally on return. There is no timed transition,
timeout, stagger or delay. Bind `progress` to unfold the caller-owned background below the marker;
keeping the marker before the changing height avoids scroll feedback. Reduced motion switches
instantly and SSR without JavaScript remains plain and visible. No fetch, parser or HTML injection.
`layout="spread"` distributes artwork evenly; `layout="around-fixture"` spaces mobile artwork
evenly in one row around a centred 40px gap for a separate light. `floodlight` includes an unlit
fixture in the moving group.
Omit `revealAt` for always-visible artwork. Stationary lit fixtures remain outside the group.
Spread layout honors `--construction-end-inset` for a caller's stationary fixture/wordmark area.

`ConstructionFloodlight` is the original stationary fixture, unlit by default; `lit` enables its
original lens and halo. The caller owns positioning and any beam. Keep it outside the moving props.

### ManifestoCanvas

The circuit-node backdrop of brand headers. It fills `containerEl` (which must be positioned) and
listens there: nodes glow and link up near the pointer, and a click sends out a ripple. Under
reduced motion the nodes are static. It is decorative and pauses while off screen.
The shared base stylesheet owns `--manifesto-background-strength` (0.75), applied once to
nodes/traces, warm glow and ripple ink. Companion product grids use the same property.

### Blueprint drawings

`@yesid/ui/blueprints` exports the brand's blueprint drawings (`BlueprintBridge`,
`BlueprintSignal` and the rest), drawn in `currentColor`. Each takes `BlueprintProps` (`class`, `style` and other attributes), and `BlueprintBusSide` names the fleet's `operator`; compose them in a
`BlueprintShell`. The Gallery shows every one.

### SectionsToggle

`SectionsToggle` renders one Collapse all / Expand all control. The caller supplies localized
`collapse`, `expand`, `collapseTitle` and `expandTitle` copy. State and `onToggle` default to the
shared `sections` state and origin-wide bulk preference; `collapsed` and `onToggle` support a controlled adapter. The default
label reflects the mounted sections: Expand all when all are closed, Collapse all otherwise.
The control has hidden server markup. The boot script shows it before paint when the server
markup contains at least two collapsible content sections. Client registration keeps the threshold current. Independent panels, static cards
and TocNav do not count;
the TOC keeps its independent toggle and is never changed by expand-all actions.
`activeEffect="none"` keeps flat marks; `"glow"` adds a scoped core filter.

### ThemeToggle

`ThemeToggle` is a `role="switch"` signal lamp bound to the shared `theme` store. The caller
supplies one fixed `label`; `aria-checked` carries the state.

### CollapsibleSection

A card whose heading button toggles it by click, tap, Enter or Space. Body clicks, taps and text
selection never toggle it. Header actions keep their own behavior. It has an optional index badge,
`icon` and `headerActions` snippets, and an
`anchor` that emits `data-toc` for the TOC family. By default, every mounted collapsible card participates in
Collapse all / Expand all. Use `<CollapsibleSection independent bind:open={panelOpen}>` for a
filter or control panel that keeps its own toggle and stays out of bulk actions, counts and the
all-closed calculation.
A content mount adopts the origin-wide bulk choice when the control is available; with no choice
stored, content starts expanded. Below the threshold it uses the declared `open` default (true). If a second
section arrives later, untouched mounts adopt the bulk choice; deliberate individual toggles stay
as chosen for that view. Storage changes in another tab affect future mounts without changing
the current view. Static cards always show their body. Closed bodies stay mounted,
inert and hidden from assistive technology; collapsing a focused body returns focus to its header.
`openSignal` opens a card whenever the consumer counter changes. `openSection(anchor, root?)`
opens mounted collapsible cards with that anchor, optionally within a page root, and returns
whether one matched. Registration is removed on unmount and refreshed when the anchor changes. No trigger click or private selector is needed.

Independent panel anchors are navigation targets, not content-section membership. Keep them out
of content TOC entries; an explicit `jump(anchor)` or jump to a nested heading still opens the
panel and its containing disclosures before landing, leaving unrelated content closed. The
collapsible panel's `bind:open` reflects that request and remains caller-owned; nothing is persisted.
When the controller has content entries, observing or jumping to an independent panel or its
nested targets preserves the content TOC's active entry, counter and pill label. With empty
entries, target activity remains available. Ordinary content headings and `options.selector`
targets outside independent panels keep reporting activity, including unlisted targets.
This protection also applies with `independent collapsible={false}`. A static panel stays
visible, and jumps or reveal helpers leave its bound `open` value unchanged. Ordinary static
cards keep their existing behavior and remain outside bulk actions.

The optional `summary` snippet renders between the header and the body. It stays visible in both
states, outside the inert collapsible region, wraps without clamping, and describes the heading
button without becoming part of its name. Use it for the finding, period and material caveat.
Use `subtitle` for a short label; its existing header placement and article-summary closed clamp
are unchanged. `SectionCard` owns these rendered mechanics; `CollapsibleSection` owns registration.

```svelte
<CollapsibleSection title="Service observations" subtitle="Completed week">
  {#snippet summary()}
    <p>Most measured passages met the target from November 4 to 10.</p>
    <p>Missing observations limit this finding to the measured service.</p>
  {/snippet}
  <p>Detailed method and evidence.</p>
</CollapsibleSection>
```

### TocNav, TocPill, and section navigation

TocNav is a desktop contents card; it skips rail entries and keeps its own independent toggle.
TocPill is the mobile contents drawer and retains consumer-owned openAria and closeAria copy.
TocBadge is a stateless rendering adapter for numeric and icon badges. Both navigation views
accept a SectionJump controller through navigation; activeId and onNavigate can still be
explicitly controlled. Without activeId, they read the controller's reactive active id.

createSectionJump() returns one page controller with activeId, register(entries, options), and
jump(id, options). register replaces the previous target scope and returns cleanup. It reconciles
active identity against the previous entry order, then observes marked sections, explicit entry
ids and optional additional selector targets. Cleanup disconnects observers/listeners and cancels
pending work. DetailFrame performs this registration through toc.navigation, or its own controller.

useSectionJump(afterNavigate) is the SvelteKit adapter: call it during page initialization and pass
its result to the frame and TOC views. It handles observer/mount ordering and new URL fragments;
popstate preserves the router's reading position. toc.landFragments opts into same-page fragment
links. Product route, tab/grain and presence policy remains local.

jump resolves section-N, data-toc and ordinary ids, including a nested heading's owning content
section. It opens only that target section through the section interface, waits for Svelte and
layout settlement, and lands the target a quarter down the viewport. The observer reads the same
viewport-height line and refreshes on resize. Reduced motion forces an instant jump. beforeReveal
may mount/select content asynchronously; later requests and cleanup cancel stale jumps. The
boolean result tells the consumer whether it landed, allowing app-owned restoration fallbacks.
See [the breaking migration](../../docs/migrations/deepen-section-jump.md) for removed helpers.

### CornerMarks, StatusDot, MetricDisplay, SectionHeading, and SectionIcon

Stateless atoms. `CornerMarks` draws four corner ticks and needs a positioned parent. `StatusDot`
takes a signal aspect (`orange` to `lunar`) or a data status (`early` to `unknown`), with
optional `pulse` and `ring`. `MetricDisplay` renders `value` and `label`; the `absent` snippet
replaces an empty value and `info` follows the label, so absence text and tooltips stay with the
caller. `SectionHeading` takes `heading` or `overline`, plus `number`, `headingAccent`, and an
`explainer` snippet. `SectionIcon` is the closed `SectionIconName` set that `TocBadge` also uses.

### FilterGroup, FilterSection, FilterSummary, and SearchInput

The listing filter family; every label comes from the caller. `FilterGroup` is a single choice
with an "All" reset (`allLabel`) mapped to `null`; choosing the active item again clears it
unless `allowDeselect={false}`. With `collapsible` it gets a header toggle and starts at `startOpen` (true) on every mount. `FilterSection` wraps one block of a filter
panel with the dashed rule. `FilterSummary` shows `countLabel.singular` or `countLabel.plural`
(each with a `{count}` placeholder) by the plural rule of `locale`, plus a `clearLabel` button.
`SearchInput` is the listing search field; `label` is its accessible name.

### CornerMeta, SegmentedChoice, and ToggleChip

`CornerMeta` puts decorative mono notes in the four corners of its positioned parent (snippets
`topLeft` to `bottomRight`, `crosshair` adds `CornerMarks`); it is `aria-hidden` and hidden below
768px. `SegmentedChoice` is a single choice with radio-group semantics: `label` names the group,
arrow keys move and select, and disabled options are skipped. It is controlled: every pick,
the current option included, calls `onSelect`, and the caller sets `value`. `compactLabel` shows
a short label and keeps `label` as the name, and `variant="joined-grid"` lays options out two per
row. `ToggleChip` is a controlled pill button:
the caller sets `pressed` (rendered as `aria-pressed`) and changes it in `onclick`.

## Listing frame

`@yesid/ui/layout` exports `ListingFrame`, the listing page template. From 1024px it adds a
vertical edge title (`edgeTitle`, default `heading`) and an accent rail beside the page and hides
the `heading` h1 visually. The header renders the `blueprint` snippet behind `heading`,
`subtitle` and an optional `description`, with an optional `aside` beside them on desktop. The
copy rests on the bottom of the band. Every drawing in the header renders at the frame's
`--blueprint-ink`, one value per theme that overrides the opacity `BlueprintShell` and inline styles
give the drawings.
`onHeaderMount(header, frame)` runs once on mount for header motion such as a scroll scrub; return
its cleanup.

The filter column holds the `search` snippet and a panel with the `filters` snippet. From 1024px
the panel is always shown and the column is sticky. Below 1024px a button labelled `filterLabel`
opens it. The panel starts closed on every mount. The panel
never uses `inert`; a closed panel is `visibility: hidden` below 1024px only. So from 1024px the
filters are visible and reachable by keyboard before hydration and without JavaScript, and below
1024px opening them needs JavaScript. Wheel scrolling in the sticky column chains to the page
through `scrollChain`.

The frame reads `--chrome-offset`, the height of the fixed site chrome, to pull the header under
it and to park the sticky column below it. It falls back to `0px`.

## Detail frame and article header

`DetailFrame` is the detail and article page template: the `header` snippet, a hazard rule, an
optional `toolbar` band, then a grid of an optional left rail, the center (`children`, with an
optional `summary` on top) and an optional right rail, then `after`. `left` and `right` render in
frame asides that stick below the chrome at `--detail-rail-top` (default `--chrome-offset`) and
hide below 1024px, unless `leftMobile` keeps the left one. `rail` replaces the left cell with the
caller's own element, such as a rail that becomes a sheet on mobile. `railScroll` caps rails to the
viewport with internal scrolling; `paneOwnedRail` stacks the left rail above the center. With
both rails the grid is `1fr 2fr 1fr`, or uses `measure` as the center maximum. With `toc` the
frame tracks the active entry (bind `activeId`), lands same-page fragments when `landFragments` is
set, and shows `TocPill` below 1024px when both `toc.openAria` and `toc.closeAria` are supplied,
the pill entries are nonempty, and `rail` is absent. Supply both labels or neither; omitting
them keeps active tracking and fragment handling without rendering a pill. Create one controller with
`useSectionJump(afterNavigate)` and pass it as `toc.navigation`, sharing it with `TocNav` where both
appear. The root takes ordinary attributes such as `class`, `style` and `data-testid`.

`ArticleHeader` is the header those pages share: back link, optional `category`, the `title` with
its `highlight` keyword in the accent, `subtitle`, `meta` (pending state included), and `actions`
and `controls` snippets. `watermark`, `edgeLeft`, `edgeRight` and the `decorations` snippet draw
decorative chrome; `--article-deco-opacity` sets how strongly it reads. The subtitle and the meta
row share one mono type, `--article-meta-size`. A `ManifestoCanvas` fills the header; a `canvas`
snippet replaces it (an empty one leaves the header plain) and receives the header element once
bound (undefined before and during SSR). Its circuit grid holds still with the viewport while the
header scrolls, fixed and clipped to the header, so it lines up with a fixed page grid.
Like `ListingFrame`, it expects the page to pad its top by `--chrome-offset` and pulls itself under
the chrome. The back link sits midway between the chrome and the next line; an app whose
`--chrome-offset` leaves a gap under its chrome sets `--chrome-gap` to that gap. The title uses
`--text-title`, so it follows the density mode.

## Site header

`SiteHeader` is the floating pill header with a full-screen metro-line menu on a bits-ui Dialog.
The pill renders inside the dialog, so it stays above the open menu and inside its focus trap.
Call `createNavigationLifecycle` from `@yesid/ui/brand` once during the persistent app layout's
initialization with `beforeNavigate`, `onNavigate` and `afterNavigate` from `$app/navigation`,
plus optional `subscribeNavigation` when the router can publish every accepted start.
Pass its result as `navigation`: the menu closes before a navigation lands, and a language switch
from the open menu keeps it open. The lifecycle interrupts Lenis momentum even without a header.
It reconciles redirect and superseding events in `onNavigate` when `beforeNavigate` was skipped,
and re-closes a menu reopened during loading before waiting for its animation and focus trap.
Without a subscription, direct language switches work through matching native hook events.
An eventless step discards locale intent: a language switch that lands on a redirect closes the
menu without locale refocus. The fallback restores ordinary page focus even when a link disabled
the router reset through `preserveState`. Kit 3 apps omit the subscription and use this fallback; no
bridge/SDK change is required. The example below targets Kit 3.

A supplied subscription must publish every accepted start before loading/redirecting, including
superseding links whose before hook is skipped, with the exact original native `NavigationEvent.event`.
Redirect hops may omit it. Cancelled clicks are never published; null denotes idle and the return
value unsubscribes. Partial or late streams are unsupported: an eventless redirect during an
accepted load cannot be distinguished from a superseding start missing its event. Completed-event
replays are ignored, but unseen late events cannot be identified. Omit the subscription if the
router cannot meet the full contract. See the migration note for both consumer integrations.
Momentum cancellation uses Lenis stop/start in the same callback, preserving an existing external
stop and leaving input available if navigation is canceled.

```svelte
<script lang="ts">
	import { beforeNavigate, onNavigate, afterNavigate } from '$app/navigation';
	import { createNavigationLifecycle } from '@yesid/ui/brand';
	import { SiteHeader } from '@yesid/ui/layout';
	import { page } from '$app/state';
	const navigation = createNavigationLifecycle({
		beforeNavigate, onNavigate, afterNavigate,
	});
</script>

<SiteHeader
	{navigation}
	home="/"
	links={[{ href: '/work', label: 'Work', current: true }, { href: '/blog', label: 'Blog', priority: 2 }]}
	menuItems={[{ href: '/work', label: 'Work', subtitle: 'Selected projects', current: true }]}
	labels={{ openMenu: 'Open menu', closeMenu: 'Close menu', menu: 'Site menu', theme: 'Dark theme', menuFooter: 'Navigation · All routes', skipToContent: 'Skip to content' }}
	language={{ locale, locales: ['en', 'fr'], href: (next) => localizeUrl(page.url, next), label: 'Language', names: { en: 'English', fr: 'Français' } }}
/>
```

Nav text keeps one size at every width: links at `--text-nav-link-*` (16px) and the wordmark at
`--text-nav-brand-*` (18px). Links that don't fit move to the menu instead of shrinking: links show
from 375px of header width (the default `priority: 1`), `priority: 2` from 500px and
`priority: 3` from 1024px, and only while the pill fits its header with 4px to spare. The header
measures its real labels, so a longer language moves its links to the menu on a wider screen than a
shorter one. Before the app script runs, only the width thresholds apply. Keep every header link in
`menuItems` too. The
optional `search` snippet shows from 1024px and folds away with the links while the menu is open;
`actions` render before the theme, language and menu controls. The app marks `current` links and
items; snippets can query the header's width with `@container site-header`. A menu item's `icon`
(any Lucide icon component, such as `@lucide/svelte/icons/map`) replaces its stop and lights up on
the current page. All copy belongs to the app: `labels.menuFooter` and `labels.skipToContent` are
required, with an empty footer string hiding it. The header opens with the named skip link to
`#main`, shown on focus, and the pill is the page's banner. Every product renders the same skeleton: `SiteHeader`, then
`<main id="main">`, then `SiteFooter` outside `main`.
`--site-header-inset-end` narrows the header beside a docked panel, animated over
`--site-header-inset-duration`. The menu starts below the app's `--chrome-offset` (default `--nav-clearance`); page offsets read
`--nav-clearance` from `base.css`.

`menuGroups?: readonly SiteHeaderMenuGroup[]` supplies visible group headings and ordered items.
Each group has `{ label, items }`. When supplied, groups replace `menuItems`, including an empty
array. `menuItems` is now optional and defaults to an empty array; existing flat menus are unchanged.
Keep every header destination in the selected menu source. Headings use the supplied case and copy.

`compactControls` defaults to `false`. When enabled, below 600px of header container width the
pill hides theme and language controls and the open menu shows them with `labels.theme`,
`language.label` and the supplied language names. At 600px and wider the controls stay in the pill.
Only one copy is rendered. The language control retains `preserveState` and lifecycle focus handling.
Use `actions` for a labelled button such as Search in the freed pill space.

`Wordmark` is the name plus accent dot with the `wordmarkHover` effects (`autoPlay` plays one on
mount). `LanguageToggle` is a plain signpost link: one board per locale, linking to `href(next)`.
`LANGUAGE_ORDER`, exported from `@yesid/ui` and `@yesid/ui/brand`, is `['en', 'fr', 'es']`.
The signpost draws and cycles supported languages in that order, then any other locales in their
supplied order. For example, `['fr', 'en', 'es']` draws EN, FR, ES and English links to French.
Products still choose their supported set, default, hrefs and copy. SiteHeader uses the same
order in the pill and compact menu, including the compact menu's language names.
Its required `names` map supplies an autonym for every supported locale; no language names ship
in the component. `preserveState` keeps scroll and page state (`data-sveltekit-reset="false"`);
the lifecycle restores focus after landing. Inside SiteHeader this uses a bound native link ref;
standalone links pass their `bind:ref` to the lifecycle's optional `languageLink` getter.
`reload` asks for a full document load. LanguageToggle registers no router hooks.
`resetFocusAfterNavigation` is the same reset for `goto(url, { reset: false })`.
The [migration note](https://github.com/yesid-dev/yesid.design/blob/v0.41.1/docs/migrations/navigation-lifecycle.md)
records the v0.33.0 copy and integration migration for Transit and yesid.dev.

## Site footer and error page

`SiteFooter` renders the hazard strip, the `brand` snippet with a `tagline`, one labelled
navigation per entry in `groups` (`navLabel` when the accessible name differs from the heading;
`external` links open in a new tab with `rel="noopener noreferrer"`, and `me` adds `rel="me"` for
the owner's own profiles; `after` adds controls inside the group), and a status row with
optional `statusStart`, and, when `statusPrefix` is supplied, a live lamp (`liveLabel` for screen
readers) and today's date. The status props form an all-or-nothing union: supply both
`statusPrefix` and `liveLabel`, or omit both. This keeps every rendered lamp named for screen
readers. `statusStart` is independent; without it or the status pair, the entire row is omitted.
An empty string still opts into the status. Existing callers supplying both props keep their output. `data-in-view`
reports whether it is on screen.

`ErrorPage` is the error route body: hazard rule, `ErrorIllustration`, `label`, `heading`, `body`,
optional `detail`, `suggestions` in a navigation named `suggestionsLabel`, and a terminal line when
`statusNote` is given. For 404 the scene's sign shows the code; other statuses announce the code
with `role="alert"`. The app keeps its copy and `<svelte:head>`.

## Data pages

`@yesid/ui/layout` also exports the parts of a data page. `Surface` is the page column with the
page gutter. `Masthead` heads a surface with a station `kicker`, a dotted `heading`, optional
`lede`, `meta` and body, and a hazard tape (`tape={false}` drops it); its `cornerMeta` snippet
takes a `CornerMeta`. `Breadcrumb` renders `items` (`{ name, href }`) as a navigation named
`label`, with the last item as the current page, and nothing for fewer than two items; build the
trail's JSON-LD with `buildBreadcrumbListJsonLd` from `@yesid/seo-kit/jsonld`. `ControlsRail` is
a card that groups controls under `label`. `DashboardGrid` fits as many `minTile`-wide columns as
the width allows; with `label` (and not `as="ul"` or `as="ol"`) it is a named region.
`SurfaceRail` is a page's controls rail: a landmark that sticks below `--chrome-offset` from 1024px, and below that a pill
(`label`, `summary`, `openAria`, `closeAria`) that opens the same rail in a bottom sheet. The
`rail` snippet receives `closeSheet` and the current `presentation`; pass the rail to
`DetailFrame`'s `rail`.

`@yesid/ui/table` exports `DataTable`. Columns give a `header`, a `cell` snippet and optional
`align`, `numeric` (right-aligned tabular figures), `width` and `rowHeader`. `caption` is
required and names the table. `responsive` stacks each row into label and value pairs below 448px
(`at: 'compact'`) or 1024px (`at: 'tablet'`), or scrolls sideways (`mode: 'scroll'`, with
`minWidth` and `minWidthCompact`); a scrolling table that overflows becomes a focusable region
named by its caption. `frame="card"` draws a rounded card, `headerBand="terminal"` tints the
header, `tableClass` styles the table and other attributes go to the frame.

`@yesid/ui/feedback` exports `StateNotice`, the quiet empty, error and status notice: `title`,
optional `body`, a `glyph` tinted by `tone`, and `meta` and `action` snippets. `presentation` is
`responsive` (default), `silo`, `card`, `pill` or `row`; a pill or row without snippets renders
inline. Pass `role` and `aria-live` when the notice reports a change. With a `role`, the title names it.

## Site root and shared state

`@yesid/ui/layout` exports `SiteRoot`, the app root. The expand-all control remembers one origin-wide choice for content sections. On mount SiteRoot adopts the theme the boot script applied and starts Lenis
through `@yesid/motion`; it cleans up on unmount and renders no element of its own. Every in-house
product shows the yesid dot in its browser tab. On load, `SiteRoot` calls `theme.init()`, which
repaints every `link[rel="icon"]` with that mark in `--primary`, replacing the supplied href even
without a theme change; later theme changes repaint it too. Props:

- `smoothScroll` (default `true`): `false` leaves native scrolling.
- `scroller`: `{ wrapper, content }` selectors for an element scroller. `content` must wrap the
  whole scrolling flow. Omit it to scroll the window.
- `lang`: the page's language. The server fills `<html lang>` (for example by replacing `%lang%`
  in `transformPageChunk`); `SiteRoot` keeps it current after client navigation.

The app keeps its own navigation, scroll-restoration, and analytics handling.

`@yesid/ui/state` exports shared state and page actions:

- `theme`: `current`, `isDark`, `set`, `toggle`, `init`. Dark is the default, system preference
  is ignored, the choice persists under `theme`, `data-theme` is set on `<html>`, `meta[name=
  "theme-color"]` follows `--background`, every `link[rel="icon"]` becomes the brand mark in
  `--primary`, and a `themechange` event fires on `document`.
- `sections`: page actions for mounted content sections. `count` counts registered collapsible
  sections. `allCollapsed` is true only when
  all registered sections are closed; `collapseAll()`, `expandAll()` and `toggle()` reach those
  sections only. Filter groups and listing filter panels keep their own independent toggles.
  On pages with a `SectionsToggle` and at least two content sections, the first visit starts
  expanded with a neutral control. After Collapse all the control is orange, and `activeEffect`
  defaults to `glow`. Bulk actions write
  `collapsed` or `expanded` to the one localStorage key `sections-choice`. That choice applies
  across pages and browser visits on this origin. Individual toggles and section jumps never
  write it. The TOC, filters, listing panels, static cards and `independent` panels stay outside
  this choice. Below the threshold sections use declared defaults. Malformed values use the
  expanded first-visit default; blocked storage uses declared defaults. No cookie, server or
  CMS state is involved.
- `desktop`: a Svelte `MediaQuery` at the `breakpoint.desktop-min` token (1024px). It is false
  during SSR.

It also exports two helpers that `SiteRoot` doesn't initialize:

- `clock`: one shared wall clock for live timestamps. `now` ticks every second while anything
  holds a subscription (`$effect(() => clock.subscribe())`), every 30 s under reduced motion, and
  pauses in hidden tabs. `noteServerEpochMs(ms)` anchors `serverNow` to a server timestamp such as a
  response's `Date` header; `serverNowContinuousMs()` reads it without stepping back by less
  than 2 s, for animation.
- `createLocaleContext<Locale>(fallback)`: `{ provide(read), get() }`. The root layout calls
  `provide(() => data.locale)` once; components call `get()`, which returns `fallback` where
  nothing provides a locale. One per app: the context key is `Symbol.for('@yesid/ui/locale')`, so a
  component test provides a locale with `context: new Map([[Symbol.for('@yesid/ui/locale'), () => 'fr']])`.
  Formatting and copy typing live in `@yesid/i18n-core`.

`persisted(key, initial)` is not initialized by `SiteRoot`. It returns tab-scoped state in
`sessionStorage` under `persisted:<key>`: it survives reloads and navigation within the tab and
resets in a new tab. `bind:value={state.value}` works directly. Values must be `LocaleFree`
(strings, numbers, booleans, null, and arrays of those), so store ids and flags, never translated
text. During SSR it returns the seed.

The generic store remains available for search and selection state. Disclosure components and the
head boot script do not use the generic store. Historical disclosure storage keys are ignored, not deleted.

## Head

`@yesid/ui/head` exports `SeoHead` and `injectThemeBoot`.

`SeoHead` writes a page's head tags from resolved values: `title`, `description`, `siteName`,
`canonical`, `alternates` (`{ hreflang, href }`, x-default included when the app wants one),
`ogLocale` and `ogLocaleAlternates`, `image` (`{ url, alt, width = 1200, height = 630 }`), `type`
(`website`), `noIndex`, `twitter` (`{ site, creator }`), `author`, `themeColor` (the dark
`background` token) and `jsonLd` (one `@graph` script). Without `canonical` it writes no canonical,
`og:url` or hreflang, which suits error pages. The app keeps its locale, URL and copy policy.

`description` also accepts a selected result from `resolveShareCopy` in
`@yesid/seo-kit/share-copy`. Resolve ordered content fields once and pass the selected object to
both `SeoHead.description` and `renderOgPng`'s `title`. Meta, Open Graph and Twitter description
tags use the selection's bounded `description`; the image uses its independent primary `ogLine`.
Handle a `status: 'missing'` result before rendering.
No per-page hard-coded share copy; write it in the content fields. See the
[SEO package examples](../seo-kit/README.md#content-derived-descriptions-and-share-cards).

`injectThemeBoot(html)` replaces `%yesid.themeBoot%` with the boot script. Put the placeholder in
`app.html` before `%sveltekit.head%` and call it from `transformPageChunk`. Before first paint the
script sets `data-theme` from the `theme` key (dark otherwise). It also handles a rejected
cross-document view transition during reload. It also reads `sections-choice` and applies section geometry before paint. Keep this script
in the head before page content and keep the package's component CSS: hydration adopts that
geometry without a flash. The server supplies eligibility on the injected script so the first
section has its initial geometry while later HTML is parsing. The body, header and TOC stay
visible during parsing. Boot exceptions and failed same-origin `/_app/` module scripts or
modulepreloads expose pending content. Optional and cross-origin script load failures preserve
the stored section choice. A five-second recovery also exposes pending content if app startup stalls. Hydration preserves that
readable fallback on those pending cards. Future mounts adopt the stored choice. Startup error
listeners and observations are released when the pending mounts finish. Pending triggers, body
semantics and the bulk accessible name match the visual state. Recovery keeps the control’s
layout space while the inactive control is hidden and disabled.
The server renders complete, open section bodies, including declared-closed
ones, so JavaScript-disabled reading stays available. Interactive closed bodies remain mounted,
clipped, `inert` and `aria-hidden`; browser find-in-page cannot generally search them until opened.
TOC and fragment jumps reveal their targets and enclosing sections. Responsive charts and media
keep their DOM; products must verify their actual measurement/lazy-mount code during adoption.
A hash-based CSP allows it with the source in
`@yesid/ui/boot.json` (`{ "hash": "sha256-…" }`), which Node config files can import. A CSP that
relies on `'unsafe-inline'` must not add the hash, because any hash switches `'unsafe-inline'` off.

## Base stylesheet

`@yesid/ui/base.css` is the base layer both products share: resets, the dark variant, selection,
focus ring, text links (a link without a class is underlined in `--accent-text`; components
style their own), scrollbar, circuit grid, shared keyframes, label styles, `.glass-chrome`, the
`TerminalPanel` and `CodeBlock` classes (`.terminal-*` and `.syn-*`, in the components layer), the
`SiteHeader` geometry (`--nav-top`, `--nav-padding-y`, `--nav-clearance`), a focus outline under
forced colors and the
View Transitions route crossfade (off under reduced motion; pair it with `onNavigate(viewTransition)`
from `@yesid/motion/utils/viewTransition`). It imports
`tw-animate-css` from its own dependency for Sheet motion, plus `@yesid/tokens/theme.css`,
which provides the Tailwind theme and the semantic color utilities
(`bg-primary`, `text-muted-foreground` and the rest). It uses Tailwind v4 directives, so import it
from the app stylesheet after Tailwind:

```css
@import 'tailwindcss';
@import '@yesid/ui/base.css';
```

Like every package stylesheet, it is opt-in; no JavaScript import loads it.

## Develop

```sh
bun run --cwd packages/ui test
bun run --cwd packages/ui check
bun run api:check
```

Package tests and the Gallery's browser suite cover the shared behavior. Each product still runs
its own tests, build and browser checks when it takes a release; a pass here does not replace them.
