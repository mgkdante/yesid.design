<!--
  Detail and article page frame: header, a rule (hazard tape by default, a neutral line, or none),
  optional toolbar band, then a grid of an optional left rail, the center and an optional right
  rail, then `after`. `header` renders before the grid, so an opening placed there precedes both
  rails in the DOM and on phones; `summary` is the top of the center column, after the left rail.
  With both rails the frame sets `--detail-center-width` from 1024px, the center track's width,
  which the reading ArticleHeader uses to line up with the center column. Frame rails stick
  below the site chrome (`--detail-rail-top`, default `--chrome-offset`) and hide below 1024px
  unless `leftMobile`. `rail` replaces the left cell with the caller's own element, such as a rail
  that turns into a sheet on mobile. With `toc`, the frame tracks the active entry and shows
  TocPill below 1024px when both pill labels are supplied and `rail` is absent.
-->
<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import type { TocEntry } from '../brand/toc.js';
	import type { SectionJump } from '../brand/section-jump.js';

	export type DetailFrameToc = {
		entries: TocEntry[];
		/** Entries for the mobile pill, when they differ. */
		pillEntries?: TocEntry[];
		onNavigate?: (id: string) => void;
		/** Share a routed page controller with TocNav and other section views. */
		navigation?: SectionJump;
		/** Additional targets; marked sections and registered ids are always observed. */
		selector?: string;
		/** Let the controller correct same-page fragment landings. */
		landFragments?: boolean;
	} & ({ openAria: string; closeAria: string } | { openAria?: never; closeAria?: never });

	export interface DetailFrameProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
		/**
		 * Rendered first, before the rule and the grid: the place for the page header and for an
		 * opening that must come before both rails in the DOM and on phones.
		 */
		header?: Snippet;
		/** Below the header: `hazard` tape (default), a neutral `line`, or `none`. */
		rule?: 'hazard' | 'line' | 'none';
		toolbar?: Snippet;
		/**
		 * Top of the center column, inside the grid: after the left rail in the DOM, and below it on
		 * phones when `leftMobile` or `paneOwnedRail` shows it. Use `header` for an opening.
		 */
		summary?: Snippet;
		/** Below the toolbar, below 1024px only. */
		mobileSummary?: Snippet;
		left?: Snippet;
		rail?: Snippet;
		children: Snippet;
		right?: Snippet;
		after?: Snippet;
		leftMobile?: boolean;
		/** Stacks the left rail above the center at every width. */
		paneOwnedRail?: boolean;
		/** Center track maximum in the three-column layout, such as `46rem` for reading. */
		measure?: string;
		/** Caps rails to the viewport and scrolls them internally. */
		railScroll?: boolean;
		toc?: DetailFrameToc;
		activeId?: string;
	}
</script>

<script lang="ts">
	import { untrack } from 'svelte';
	import { scrollChain } from '@yesid/motion/actions';
	import { cn } from '../cn/index.js';
	import { Separator } from '../primitives/separator/index.js';
	import TocPill from '../brand/TocPill.svelte';
	import { createSectionJump } from '../brand/section-jump.js';

	let {
		header,
		rule = 'hazard',
		toolbar,
		summary,
		mobileSummary,
		left,
		rail,
		children,
		right,
		after,
		leftMobile = false,
		paneOwnedRail = false,
		measure,
		railScroll = false,
		toc,
		activeId = $bindable(''),
		class: className,
		style,
		...rest
	}: DetailFrameProps = $props();

	const ownNavigation = createSectionJump();
	let frame = $state<HTMLElement>();
	$effect(() => {
		if (!toc || !frame) return;
		const config = toc;
		const navigation = config.navigation ?? ownNavigation;
		const options = {
			root: frame,
			selector: config.selector,
			landFragments: config.landFragments,
			activeId: untrack(() => activeId) || undefined,
			onActiveChange: (id: string) => { activeId = id; },
		};
		return navigation.register(config.entries, options);
	});

	const hasLeft = $derived(Boolean(left || rail));
	const pillEntries = $derived(toc ? (toc.pillEntries ?? toc.entries) : []);
	const frameStyle = $derived(
		[measure ? `--detail-measure: ${measure}` : '', style ?? ''].filter(Boolean).join('; ') ||
			undefined,
	);
</script>

<article
	bind:this={frame}
	{...rest}
	data-slot="detail-shell"
	class={cn('detail-shell', className)}
	style={frameStyle}
>
	{@render header?.()}

	{#if rule === 'hazard'}
		<Separator variant="hazard" class="detail-shell-tape" />
	{:else if rule === 'line'}
		<div class="detail-shell-line" data-slot="detail-shell-line" aria-hidden="true"></div>
	{/if}

	{#if toolbar}
		<div class="detail-shell-toolbar" data-slot="detail-shell-toolbar">
			{@render toolbar()}
		</div>
	{/if}

	{#if mobileSummary}
		<div class="detail-shell-mobile-summary" data-slot="detail-shell-mobile-summary">
			{@render mobileSummary()}
		</div>
	{/if}

	<div
		class="detail-shell-grid"
		class:detail-shell-grid--three={hasLeft && Boolean(right)}
		class:detail-shell-grid--two={hasLeft && !right}
		class:detail-shell-grid--right={!hasLeft && Boolean(right)}
		class:detail-shell-grid--pane-owned={paneOwnedRail}
		class:detail-shell-grid--measured={Boolean(measure)}
		class:detail-shell-grid--scroll={railScroll}
	>
		{#if rail}
			{@render rail()}
		{:else if left}
			<aside
				use:scrollChain
				class="detail-shell-rail detail-shell-rail--left"
				class:detail-shell-rail--mobile={leftMobile}
				data-slot="detail-shell-left"
			>
				{@render left()}
			</aside>
		{/if}

		<div class="detail-shell-center" data-slot="detail-shell-center">
			{#if summary}
				<div data-slot="detail-shell-summary">{@render summary()}</div>
			{/if}
			{@render children()}
		</div>

		{#if right}
			<aside
				use:scrollChain
				class="detail-shell-rail detail-shell-rail--right"
				data-slot="detail-shell-right"
			>
				{@render right()}
			</aside>
		{/if}
	</div>

	{@render after?.()}
</article>

{#if toc && toc.openAria !== undefined && toc.closeAria !== undefined && !rail && pillEntries.length > 0}
	<TocPill
		entries={pillEntries}
		{activeId}
		openAria={toc.openAria}
		closeAria={toc.closeAria}
		onNavigate={toc.onNavigate}
		navigation={toc.navigation ?? ownNavigation}
	/>
{/if}

<style>
	.detail-shell {
		--detail-grid-gap: 2rem;
		--detail-rail-width: clamp(16rem, 24vw, 22rem);
		--detail-center-max: var(--container-content);
		--detail-rail-sticky-top: var(--detail-rail-top, var(--chrome-offset, 0px));
		display: block;
	}

	.detail-shell-line {
		height: 1px;
		margin-inline: var(--space-page-x);
		background: var(--border);
	}

	.detail-shell-toolbar {
		width: 100%;
		background: var(--primary);
	}

	.detail-shell-mobile-summary {
		margin-block-start: 1.5rem;
		padding-inline: var(--space-page-x);
	}

	.detail-shell-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-card-gap);
		min-width: 0;
		padding: var(--space-card-gap) var(--space-page-x);
		overflow-x: clip;
	}

	.detail-shell-center {
		width: 100%;
		min-width: 0;
		max-width: var(--detail-center-max);
	}

	.detail-shell-rail {
		display: none;
	}

	.detail-shell-rail--mobile {
		display: block;
		min-width: 0;
	}

	/* Phones: top-level section cards reach into the page gutter to give their text more room. */
	@media (max-width: 767px) {
		.detail-shell-center :global([data-slot='card'].section-card:not([data-slot='card'] *)) {
			margin-inline: calc(0.5rem - var(--space-page-x));
		}
	}

	@media (min-width: 1024px) {
		/* The center track's width for headers outside the grid, in the two symmetric layouts. */
		.detail-shell:has(> .detail-shell-grid--three) {
			--detail-center-width: calc((100% - 2 * var(--space-page-x) - 2 * var(--detail-grid-gap)) / 2);
		}

		.detail-shell:has(> .detail-shell-grid--three.detail-shell-grid--measured) {
			--detail-center-width: min(
				var(--detail-measure),
				100% - 2 * var(--space-page-x) - 2 * var(--detail-grid-gap) - 24rem
			);
		}

		.detail-shell-mobile-summary {
			display: none;
		}

		.detail-shell-grid {
			gap: var(--detail-grid-gap);
			align-items: stretch;
			justify-content: center;
		}

		.detail-shell-grid--two {
			grid-template-columns: var(--detail-rail-width) minmax(0, var(--detail-center-max));
		}

		.detail-shell-grid--three {
			grid-template-columns: 1fr 2fr 1fr;
			padding-block: 2.5rem;
		}

		.detail-shell-grid--three.detail-shell-grid--measured {
			grid-template-columns: minmax(12rem, 1fr) minmax(0, var(--detail-measure)) minmax(12rem, 1fr);
		}

		.detail-shell-grid--right {
			grid-template-columns: minmax(0, 2fr) minmax(12rem, 1fr);
			padding-block: 2.5rem;
		}

		.detail-shell-grid--three .detail-shell-center,
		.detail-shell-grid--right .detail-shell-center {
			max-width: none;
		}

		.detail-shell-rail {
			display: block;
			position: sticky;
			top: var(--detail-rail-sticky-top);
			align-self: start;
			min-width: 0;
		}

		.detail-shell-grid--scroll .detail-shell-rail {
			max-height: calc(100dvh - var(--detail-rail-sticky-top));
			overflow-y: auto;
		}

		.detail-shell-grid--pane-owned {
			grid-template-columns: minmax(0, 1fr);
		}

		.detail-shell-grid--pane-owned .detail-shell-rail--left {
			position: static;
			max-height: none;
			overflow: visible;
		}

		.detail-shell-grid--pane-owned .detail-shell-center {
			max-width: none;
		}
	}

	@media (min-width: 1024px) and (max-width: 1279.98px) {
		.detail-shell-grid--three {
			gap: 1.25rem;
		}

		.detail-shell:has(> .detail-shell-grid--three) {
			--detail-grid-gap: 1.25rem;
		}
	}
</style>
