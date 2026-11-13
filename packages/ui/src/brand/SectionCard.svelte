<!--
  Collapsible section card. Only the heading button toggles it; summaries stay readable.
  Closed bodies stay mounted (inert) so server markup and anchors are complete.
-->

<script lang="ts">
	import { untrack } from 'svelte';
	import { Badge } from '../primitives/badge/index.js';
	import { Card } from '../primitives/card/index.js';
	import type { CollapsibleSectionProps } from './CollapsibleSection.svelte';
	import ChevronToggle from './ChevronToggle.svelte';
	import { noteSectionReady } from './sections-preference.js';

	let {
		ref = $bindable(null),
		title,
		subtitle,
		summary,
		headerVariant = 'default',
		open = $bindable(true),
		index = null,
		accentColor = 'var(--primary)',
		collapsible = true,
		anchor,
		openSignal = null,
		icon,
		headerActions,
		children,
		bulk = false,
		initialized: initializedProp,
		onChoose,
	}: CollapsibleSectionProps & { ref?: HTMLDivElement | null; bulk?: boolean; initialized?: boolean; onChoose?: () => void } = $props();
	let mounted = $state(false);
	$effect.pre(() => {
		if (mounted || !ref) return;
		if (collapsible && ref.hasAttribute('data-section-fallback')) open = true;
		mounted = true;
	});
	const initialized = $derived(initializedProp ?? mounted);
	$effect(() => { if (initialized) noteSectionReady(); });

	const headerUid = $props.id();
	const subtitleId = `${headerUid}-summary`;
	const summaryId = `${headerUid}-finding`;
	const contentId = `${headerUid}-content`;
	const usesArticleSummary = $derived(collapsible && headerVariant === 'article-summary');
	const descriptionIds = $derived(
		[usesArticleSummary && subtitle ? subtitleId : undefined, summary ? summaryId : undefined]
			.filter(Boolean).join(' ') || undefined,
	);
	const hasHeaderMark = $derived(index !== null || icon !== undefined);

	// Server HTML is complete and readable even for a declared-closed section without JavaScript.
	const isOpen = $derived(!collapsible || !initialized || open);
	function choose(next: boolean): void {
		onChoose?.();
		open = next;
	}

	let lastOpenSignal = untrack(() => openSignal);
	$effect(() => {
		const signal = openSignal;
		if (signal === lastOpenSignal) return;
		lastOpenSignal = signal;
		if (collapsible && signal !== null) choose(true);
	});

	let trigger = $state<HTMLButtonElement>();
	let content = $state<HTMLElement>();
	// A collapse that hides the focused element hands focus back to the trigger.
	$effect.pre(() => {
		if (!isOpen && content?.contains(document.activeElement)) trigger?.focus();
	});

	// Interactive children keep their own clicks, nested cards own theirs, and text
	// selection is reading, not toggling. Only the heading button chooses the state.
	const triggerProps = $derived({
		type: 'button' as const,
		'data-section-trigger': '',
		'data-slot': 'collapsible-trigger',
		'data-state': isOpen ? 'open' : 'closed',
		'aria-controls': contentId,
		'aria-expanded': isOpen,
		'aria-describedby': descriptionIds,
		onclick: (event: MouseEvent) => {
			if (event.button !== 0) event.preventDefault();
			else choose(!isOpen);
		},
	});
</script>

{#snippet headerMark()}
	{#if index !== null}
		<Badge
			variant="number"
			class="text-[0.75rem]"
			aria-hidden="true"
			style={accentColor ? `background-color: ${accentColor}` : ''}
			>{String(index + 1).padStart(2, '0')}</Badge
		>
	{:else if icon}
		{@render icon()}
	{/if}
{/snippet}

{#snippet legacyHeaderContent()}
	{@render headerMark()}
	<span class="section-title-group flex flex-1 flex-col gap-0.5">
		<h2 class="section-title font-heading text-lg font-bold text-[var(--foreground)]">
			{title}
		</h2>
		{#if subtitle}
			<span class="section-subtitle">{subtitle}</span>
		{/if}
	</span>
{/snippet}

<Card
	bind:ref
	class="section-card {collapsible ? 'section-card--toggleable' : ''} {usesArticleSummary
		? 'section-card--article-summary'
		: ''}"
	style="--accent: {accentColor};"
	data-toc={anchor}
	data-section-bulk={bulk ? '' : undefined}
	data-section-ready={initialized ? '' : undefined}
	data-section-default={!collapsible || open ? 'open' : 'closed'}
	data-header-variant={usesArticleSummary ? 'article-summary' : undefined}
>
	<div
		data-slot="collapsible"
		data-state={isOpen ? 'open' : 'closed'}
	>
		{#if collapsible}
			{#if usesArticleSummary}
				<div
					class="section-heading-row"
					class:section-heading-row--actions={headerActions !== undefined}
				>
					<h2 class="section-heading">
						<button
							{...triggerProps}
							bind:this={trigger}
							class="section-header section-header--article-summary {hasHeaderMark
								? 'section-header--with-mark'
								: ''} {subtitle ? '' : 'section-header--title-only'}"
						>
							{#if hasHeaderMark}
								<span class="section-header__mark" aria-hidden="true">
									{@render headerMark()}
								</span>
							{/if}
							<span
								class="section-title section-title--article-summary font-heading text-lg font-bold text-[var(--foreground)]"
							>
								{title}
							</span>
							<span class="section-header__chevron" aria-hidden="true">
								<ChevronToggle open={isOpen} direction="right" />
							</span>
						</button>
					</h2>
					{#if headerActions}
						<div class="section-header-actions" data-card-interactive>
							{@render headerActions()}
						</div>
					{/if}
				</div>
				{#if subtitle}
					<p
						id={subtitleId}
						class="section-subtitle section-subtitle--article-summary {hasHeaderMark
							? 'section-subtitle--with-mark'
							: ''}"
						data-state={isOpen ? 'open' : 'closed'}
					>
						<span class="section-subtitle__text">{subtitle}</span>
					</p>
				{/if}
			{:else}
				<button
					{...triggerProps}
					bind:this={trigger}
					class="section-header section-pad-x flex w-full items-center gap-2.5 py-4 text-left"
				>
					{@render legacyHeaderContent()}
					<ChevronToggle open={isOpen} direction="right" />
				</button>
			{/if}
		{:else}
			<div class="section-pad-x flex items-center gap-2.5 py-4">
				{@render legacyHeaderContent()}
			</div>
		{/if}

		{#if summary}
			<div id={summaryId} data-slot="section-summary" class="section-summary section-pad-x">
				{@render summary()}
			</div>
		{/if}

		<div
			bind:this={content}
			id={contentId}
			class="collapsible-content section-body"
			data-slot="collapsible-content"
			data-state={isOpen ? 'open' : 'closed'}
			inert={!isOpen}
			aria-hidden={isOpen ? undefined : 'true'}
		>
			<div class="collapsible-content__inner">
				<div class="section-pad-x pb-6 pt-3">
					{@render children?.()}
				</div>
			</div>
		</div>
	</div>
</Card>

<style>
	/* One side inset for header and body; phones give the text more room. */
	:global([data-slot='card'].section-card) {
		--collapsible-pad-x: 1.5rem;
		border-width: 3px;
	}

	@media (max-width: 767px) {
		:global([data-slot='card'].section-card) {
			--collapsible-pad-x: 1rem;
		}
	}

	.section-pad-x {
		padding-inline: var(--collapsible-pad-x);
	}

	:global([data-slot='card'].section-card.section-card--article-summary) {
		padding-block: 0;
	}

	/* The shared Card hover stays neutral while readers interact with section content. */
	:global([data-slot='card'].section-card:hover) {
		border-color: var(--border-brand);
		box-shadow: inset 0 1px 0 var(--edge-highlight);
	}

	:global([data-slot='card'].section-card):has(
		> [data-slot='collapsible'] > .section-header:hover,
		> [data-slot='collapsible'] > .section-heading-row > .section-heading > .section-header:hover
	) {
		border-color: var(--accent);
		box-shadow:
			var(--shadow-section),
			inset 0 1px 0 var(--edge-highlight);
	}

	.section-header {
		cursor: pointer;
	}

	.section-header:focus-visible {
		outline-offset: -4px;
	}

	.section-heading {
		margin: 0;
		min-width: 0;
	}

	.section-heading-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		align-items: center;
		column-gap: 0.625rem;
		padding-inline-end: var(--collapsible-pad-x);
	}

	.section-heading-row--actions {
		grid-template-columns: minmax(0, 1fr) auto;
	}

	.section-header-actions {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		min-height: 44px;
		padding: 0.875rem 0 0.5rem;
	}

	.section-header--article-summary {
		display: grid;
		width: 100%;
		grid-template-columns: minmax(0, 1fr) 1.25rem;
		align-items: center;
		column-gap: 0.625rem;
		min-height: 44px;
		padding: 1rem 0 0.375rem var(--collapsible-pad-x);
		text-align: left;
	}

	.section-header--article-summary.section-header--with-mark {
		grid-template-columns: 1.75rem minmax(0, 1fr) 1.25rem;
	}

	.section-header--article-summary.section-header--title-only {
		padding-block: 1rem;
	}

	.section-header__mark {
		display: inline-flex;
		width: 1.75rem;
		min-height: 1.75rem;
		align-items: center;
		justify-content: center;
	}

	.section-header__chevron {
		display: inline-flex;
		width: 1.25rem;
		align-items: center;
		justify-content: center;
		align-self: center;
	}

	.section-title--article-summary {
		min-width: 0;
		line-height: 1.4;
		text-wrap: balance;
	}

	.section-header:hover .section-title {
		color: var(--accent-text);
	}

	:global(.section-title) {
		transition: color var(--duration-normal) var(--ease-default);
	}

	.section-summary {
		font-family: var(--font-body);
		font-size: var(--text-body);
		line-height: 1.6;
		color: var(--foreground);
		overflow-wrap: anywhere;
		padding-block-end: 1rem;
	}

	.section-subtitle {
		font-size: var(--text-caption);
		line-height: 1.5;
		color: var(--muted-foreground);
	}

	.section-subtitle--article-summary {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 1.25rem;
		column-gap: 0.625rem;
		margin: 0;
		padding: 0 var(--collapsible-pad-x) 1rem;
		color: var(--foreground);
		font-family: var(--font-body);
		font-size: var(--text-small);
		line-height: 1.6;
	}

	.section-subtitle--article-summary.section-subtitle--with-mark {
		grid-template-columns: 1.75rem minmax(0, 1fr) 1.25rem;
	}

	.section-subtitle__text {
		grid-column: 1;
		min-width: 0;
		overflow-wrap: anywhere;
		text-wrap: pretty;
	}

	.section-subtitle--with-mark .section-subtitle__text {
		grid-column: 2;
	}

	.section-subtitle--article-summary[data-state='closed'] .section-subtitle__text {
		display: -webkit-box;
		overflow: hidden;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
	}

	.collapsible-content {
		display: grid;
		grid-template-rows: 0fr;
		transition: grid-template-rows var(--duration-slow) var(--ease-default);
	}

	.collapsible-content[data-state='open'] {
		grid-template-rows: 1fr;
	}

	.collapsible-content__inner {
		min-height: 0;
		overflow: hidden;
	}

	/* Boot sets private geometry marks while parsing. Hydration adopts the same geometry
	   before removing the override; server markup and children remain untouched. */
	:global(.section-card:not([data-section-ready])) .collapsible-content {
		transition: none;
	}
	:global(.section-card[data-section-initial='closed']:not([data-section-ready])) > [data-slot='collapsible'] > .collapsible-content {
		grid-template-rows: 0fr;
	}
	:global(.section-card[data-section-initial='open']:not([data-section-ready])) > [data-slot='collapsible'] > .collapsible-content {
		grid-template-rows: 1fr;
	}
	:global(html[data-sections-recovering]) :global(.section-card:not([data-section-ready])) > [data-slot='collapsible'] > .collapsible-content {
		grid-template-rows: 1fr;
	}
	:global(.section-card[data-section-initial='closed']:not([data-section-ready])) > [data-slot='collapsible'] > .section-subtitle--article-summary .section-subtitle__text {
		display: -webkit-box;
		overflow: hidden;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
	}
	:global(.section-card[data-section-initial='closed']:not([data-section-ready]) > [data-slot='collapsible'] > .section-header .chevron),
	:global(.section-card[data-section-initial='closed']:not([data-section-ready]) > [data-slot='collapsible'] > .section-heading-row .chevron) {
		transform: none;
		transition: none;
	}

	@media (prefers-reduced-motion: reduce) {
		.collapsible-content {
			transition: none;
		}
	}
</style>
