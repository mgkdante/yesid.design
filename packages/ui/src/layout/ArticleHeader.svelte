<!--
  Article and project page header: a back link, the title, subtitle, meta row, and actions and
  controls snippets. The expressive presentation (default) draws a circuit-grid band with
  decorative chrome, a category line above the title and one whole-word keyword in the accent. The
  reading presentation is the calm header: left aligned on the reading column, sentence case, no
  canvas or decoration, no highlight, and the category leads the meta row below the title.
  It sits under the fixed site chrome: it cancels the page's top padding of `--chrome-offset` and
  pads itself by the same amount. An app whose offset leaves a gap under its chrome sets
  `--chrome-gap` to it, so the back link sits midway between the chrome and the next line.
-->
<script lang="ts" module>
	import type { Snippet } from 'svelte';

	export type ArticleMetaEntry =
		| string
		| {
				readonly text: string;
				readonly datetime?: string;
				readonly label?: string;
		  };

	export interface ArticleHeaderProps {
		title: string;
		/**
		 * `expressive` (default): the circuit-grid band with its decoration. `reading`: the calm
		 * header, left aligned and undecorated; it ignores `highlight`, `accent`, `watermark`,
		 * `edgeLeft`, `edgeRight`, `decorations` and `canvas`, and shows `category` in the meta row.
		 */
		presentation?: 'expressive' | 'reading';
		/**
		 * The first case-insensitive whole-word match in the title renders in the accent (expressive
		 * only). Words follow `Intl.Segmenter`, so `AI` never matches inside `BRAIN` and `中文`
		 * matches in `我喜欢中文`; titles compare in NFC; `can` never matches inside `can't`, while an
		 * elision such as `l'` or `d’` starts a new word, so `espace` matches in `l'espace`.
		 */
		highlight?: string;
		/** A line above the title (expressive); the first meta entry (reading). */
		category?: string;
		subtitle?: string;
		backHref: string;
		backLabel: string;
		meta?: readonly ArticleMetaEntry[];
		/** Shows a placeholder while meta is still loading. */
		metaPending?: boolean;
		accent?: string;
		/** Large faint text behind the title. */
		watermark?: string;
		edgeLeft?: string;
		edgeRight?: string;
		/** Extra decorative chrome, rendered in the aria-hidden decoration layer. */
		decorations?: Snippet;
		/** Replaces the default ManifestoCanvas; receives the header element once it is bound (undefined before). */
		canvas?: Snippet<[HTMLElement | undefined]>;
		actions?: Snippet;
		controls?: Snippet;
		titleId?: string;
		testId?: string;
	}
</script>

<script lang="ts">
	import { boop } from '@yesid/motion/actions';
	import { findHighlight } from './article-highlight.js';
	import CornerMarks from '../brand/CornerMarks.svelte';
	import ManifestoCanvas from '../brand/ManifestoCanvas.svelte';

	let {
		title,
		presentation = 'expressive',
		highlight,
		category,
		subtitle,
		backHref,
		backLabel,
		meta = [],
		metaPending = false,
		accent = 'var(--primary)',
		watermark,
		edgeLeft,
		edgeRight,
		decorations,
		canvas,
		actions,
		controls,
		titleId,
		testId,
	}: ArticleHeaderProps = $props();

	let headerEl = $state<HTMLElement>();

	const reading = $derived(presentation === 'reading');
	const titleParts = $derived.by(() => {
		const match = reading ? null : findHighlight(title, highlight);
		if (!match) return [{ text: title, highlight: false }];
		return [
			{ text: title.slice(0, match.start), highlight: false },
			{ text: title.slice(match.start, match.end), highlight: true },
			{ text: title.slice(match.end), highlight: false },
		].filter((part) => part.text);
	});
	const metaEntries = $derived<readonly ArticleMetaEntry[]>(
		reading && category ? [category, ...meta] : meta,
	);
</script>

<div
	bind:this={headerEl}
	class="article-header"
	class:article-header--reading={reading}
	style="--article-accent: {accent};"
	data-slot="article-header"
	data-presentation={presentation}
	data-testid={testId}
>
	{#if !reading}
		<div class="header__circuit-grid" aria-hidden="true"></div>
		{#if canvas}
			{@render canvas(headerEl)}
		{:else}
			<ManifestoCanvas containerEl={headerEl} />
		{/if}
	{/if}

	<section class="header-section">
		{#if !reading}
			<div class="header__decoration-layer" aria-hidden="true">
				<CornerMarks size="md" opacity={0.12} />

				<div class="header__chevrons">
					{#each [0, 1, 2] as i (i)}
						<div class="header__chevron"></div>
					{/each}
				</div>

				{#if watermark}
					<div class="header__watermark">{watermark}</div>
				{/if}
				{#if edgeLeft}
					<div class="header__edge header__edge-left">{edgeLeft}</div>
				{/if}
				{#if edgeRight}
					<div class="header__edge header__edge-right">{edgeRight}</div>
				{/if}
				{@render decorations?.()}
			</div>
		{/if}

		<div class="header__content">
			{#if reading}
				<a href={backHref} class="header__back">{backLabel}</a>
			{:else}
				<a href={backHref} class="header__back" use:boop={{ scale: 1.05, timing: 200 }}>
					{backLabel}
				</a>
			{/if}

			{#if category && !reading}
				<div class="header__cat-line">{category}</div>
			{/if}

			<h1 class="header__title" id={titleId}>
				{#each titleParts as part, i (i)}
					{#if part.highlight}<span class="header__title-highlight">{part.text}</span
						>{:else}{part.text}{/if}
				{/each}
			</h1>

			{#if subtitle}
				<p class="header__subtitle">{subtitle}</p>
			{/if}

			{#if metaEntries.length > 0 || metaPending}
				<div class="header__meta" data-pending={metaPending}>
					{#each metaEntries as entry, i (i)}
						<span class="header__meta-item" class:header__meta-item--category={reading && category && i === 0}>
							{#if i > 0}<span class="header__meta-sep" aria-hidden="true"></span>{/if}
							{#if typeof entry === 'string'}
								<span>{entry}</span>
							{:else if entry.label}
								<span class="header__meta-pair">
									<span>{entry.label}</span>
									{#if entry.datetime}
										<time datetime={entry.datetime}>{entry.text}</time>
									{:else}
										<span>{entry.text}</span>
									{/if}
								</span>
							{:else if entry.datetime}
								<time datetime={entry.datetime}>{entry.text}</time>
							{:else}
								<span>{entry.text}</span>
							{/if}
						</span>
					{/each}
					{#if meta.length === 0 && metaPending}
						<span class="header__meta-skeleton" aria-hidden="true"></span>
					{/if}
				</div>
			{/if}

			{#if actions}
				<div class="header__actions" data-slot="article-header-actions">
					{@render actions()}
				</div>
			{/if}

			{#if controls}
				<div class="header__controls" data-slot="article-header-controls">
					{@render controls()}
				</div>
			{/if}
		</div>
	</section>
</div>

<style>
	.article-header {
		--article-deco-opacity: 0.25;
		--article-meta-size: clamp(0.75rem, 0.6875rem + 0.3vw, 0.875rem);
		position: relative;
		margin-top: calc(-1 * var(--chrome-offset, 0px));
		padding-top: var(--chrome-offset, 0px);
		overflow: hidden;
		/* Clips the fixed circuit grid, so it holds still with the page while the header scrolls. */
		clip-path: inset(0);
		background: var(--manifesto);
		cursor: crosshair;
	}

	.header-section {
		position: relative;
		display: grid;
	}

	.header__circuit-grid {
		position: fixed;
		inset: 0 0 auto;
		height: 100lvh;
		z-index: var(--z-base);
		background-image:
			linear-gradient(90deg, color-mix(in srgb, var(--article-accent) 3.5%, transparent) 1px, transparent 1px),
			linear-gradient(180deg, color-mix(in srgb, var(--article-accent) 3.5%, transparent) 1px, transparent 1px);
		background-size: 80px 80px;
	}

	.header__circuit-grid::after {
		content: '';
		position: absolute;
		inset: 0;
		background-image:
			radial-gradient(circle 2.5px at 80px 80px, color-mix(in srgb, var(--article-accent) 12%, transparent) 0%, transparent 4px),
			radial-gradient(circle 2px at 160px 160px, color-mix(in srgb, var(--article-accent) 8%, transparent) 0%, transparent 3px),
			radial-gradient(circle 2.5px at 240px 80px, color-mix(in srgb, var(--article-accent) 10%, transparent) 0%, transparent 4px),
			radial-gradient(circle 2px at 80px 240px, color-mix(in srgb, var(--article-accent) 6%, transparent) 0%, transparent 3px);
		background-size: 320px 320px;
	}

	.header__decoration-layer {
		position: absolute;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
		z-index: calc(var(--z-content) + 1);
	}

	.header__chevrons {
		position: absolute;
		top: 70px;
		right: 55px;
		display: none;
		align-items: center;
		gap: 0.375rem;
	}

	.header__chevron {
		width: 0.875rem;
		height: 0.875rem;
		rotate: -45deg;
		border-right: 2px solid var(--article-accent);
		border-bottom: 2px solid var(--article-accent);
	}

	.header__watermark {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		font-size: clamp(100px, 14vw, 180px);
		font-weight: 900;
		color: color-mix(in srgb, var(--article-accent) 2%, transparent);
		text-transform: uppercase;
		letter-spacing: -0.06em;
		white-space: nowrap;
	}

	.header__edge {
		position: absolute;
		top: 50%;
		display: none;
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 2px;
		color: var(--article-accent);
		opacity: var(--article-deco-opacity);
		text-transform: uppercase;
		white-space: nowrap;
	}

	.header__edge-left {
		left: 24px;
		transform: translateY(-50%) rotate(-90deg);
	}

	.header__edge-right {
		right: 24px;
		transform: translateY(-50%) rotate(90deg);
	}

	.header__content {
		position: relative;
		z-index: calc(var(--z-content) + 9);
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 100%;
		min-width: 0;
		margin-inline: auto;
		padding: max(0px, calc(0.5rem - var(--chrome-gap, 0px))) 1.25rem 1.5rem;
		text-align: center;
	}

	.header__back {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		margin-bottom: 0.5rem;
		font-family: var(--font-mono);
		font-size: var(--text-back-link);
		letter-spacing: 0;
		color: color-mix(in srgb, var(--article-accent) 60%, var(--foreground));
		text-decoration: none;
		transition: color var(--duration-normal) ease;
	}

	.header__back:hover {
		color: var(--foreground);
	}

	.header__cat-line {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		max-width: calc(100% - 2rem);
		margin-bottom: 0.75rem;
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 3px;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--article-accent) 60%, var(--foreground));
	}

	.header__cat-line::before,
	.header__cat-line::after {
		content: '';
		width: 40px;
		height: 1px;
		background: color-mix(in srgb, var(--article-accent) 30%, transparent);
	}

	/* Long titles wrap inside the column, between words; a word wider than the column breaks inside
	   instead of overflowing (as base.css does for body text). Soft hyphens (U+00AD) in the title
	   choose where a long word breaks. */
	.header__title {
		max-width: 100%;
		margin: 0 0 0.75rem;
		font-family: var(--font-heading);
		font-size: var(--article-title-size, var(--text-title));
		font-weight: 900;
		overflow-wrap: anywhere;
		text-transform: uppercase;
		letter-spacing: -0.04em;
		line-height: 0.95;
		color: var(--foreground);
		text-shadow: 0 0 60px color-mix(in srgb, var(--article-accent) 12%, transparent);
	}

	.header__title-highlight {
		color: var(--article-accent);
	}

	.header__subtitle,
	.header__meta {
		font-family: var(--font-mono);
		font-size: var(--article-meta-size);
		color: color-mix(in srgb, var(--article-accent) 60%, var(--foreground));
	}

	.header__subtitle {
		max-width: 720px;
		margin: 0 auto 0.75rem;
		line-height: 1.6;
	}

	.header__meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		min-height: 1rem;
	}

	.header__meta-item {
		display: inline-flex;
		align-items: center;
		gap: 1rem;
		min-width: 0;
	}

	.header__meta-pair {
		display: inline-flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.5em;
		min-width: 0;
	}

	.header__meta-skeleton {
		display: block;
		width: clamp(8rem, 18vw, 14rem);
		height: 0.625rem;
		border-radius: var(--radius-pill);
		background: color-mix(in srgb, var(--article-accent) 12%, transparent);
	}

	.header__meta-sep {
		width: 3px;
		height: 3px;
		border-radius: 50%;
		background: var(--article-accent);
		opacity: 0.4;
	}

	.header__actions,
	.header__controls {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		width: 100%;
		margin-top: 0.75rem;
	}

	@media (max-width: 390px) {
		.header__cat-line {
			gap: 0.5rem;
			font-size: 9px;
			letter-spacing: 1.5px;
			line-height: 1.4;
		}

		.header__cat-line::before,
		.header__cat-line::after {
			width: 20px;
		}
	}

	@media (min-width: 1024px) {
		.header__chevrons {
			display: flex;
		}

		.header__edge {
			display: block;
		}

		.header__content {
			padding-inline: 2rem;
			padding-bottom: 2rem;
		}

		.header__cat-line {
			margin-bottom: 1rem;
		}

		.header__title {
			text-shadow: 0 0 80px color-mix(in srgb, var(--article-accent) 12%, transparent);
		}

		.header__subtitle {
			margin-bottom: 1rem;
		}
	}

	/* Reading presentation: the calm header. It sits on the page colour, starts at the left edge of
	   the reading column (`--article-measure`, else DetailFrame's `--detail-center-width`, else
	   46rem, centred like the column) and sets everything in Inter at reading sizes. */
	.article-header--reading {
		--article-meta-size: var(--text-small);
		overflow: visible;
		clip-path: none;
		background: transparent;
		cursor: auto;
	}

	.article-header--reading .header__content {
		align-items: flex-start;
		max-width: calc(var(--article-measure, var(--detail-center-width, 46rem)) + 2 * var(--space-page-x));
		padding: max(0px, calc(0.5rem - var(--chrome-gap, 0px))) var(--space-page-x) clamp(1.5rem, 1rem + 2vw, 2.5rem);
		text-align: start;
	}

	.article-header--reading .header__back {
		margin-bottom: 0.25rem;
		font-family: var(--font-body);
		font-size: var(--text-back-link);
		color: var(--primary);
		text-decoration: underline;
		text-decoration-thickness: 1px;
		text-underline-offset: 0.2em;
		text-decoration-color: color-mix(in srgb, var(--primary) 45%, transparent);
		transition: text-decoration-color var(--duration-normal) ease;
	}

	.article-header--reading .header__back:hover {
		color: var(--primary);
		text-decoration-color: currentColor;
	}

	.article-header--reading .header__title {
		max-width: 24em;
		margin-bottom: 0;
		font-size: var(--article-title-size, var(--text-title));
		font-weight: 750;
		text-transform: none;
		letter-spacing: var(--tracking-tight);
		line-height: 1.15;
		text-shadow: none;
		text-wrap: balance;
	}

	.article-header--reading .header__subtitle {
		max-width: 38em;
		margin: 0.75rem 0 0;
		font-family: var(--font-body);
		font-size: var(--text-reading-support);
		line-height: 1.5;
		color: color-mix(in srgb, var(--muted-foreground) 35%, var(--foreground));
	}

	/* Each entry after the first starts with its separator. The row reaches one separator's width
	   past the column's start and clips it, so a wrapped line never begins with a separator. */
	.article-header--reading .header__meta {
		--meta-sep-space: calc(3px + 0.625rem);
		justify-content: flex-start;
		column-gap: 0.625rem;
		row-gap: 0.25rem;
		margin-top: 1rem;
		margin-inline-start: calc(-1 * var(--meta-sep-space));
		clip-path: inset(0 0 0 var(--meta-sep-space));
		font-family: var(--font-body);
		font-variant-numeric: tabular-nums;
		line-height: 1.5;
		color: var(--muted-foreground);
	}

	.article-header--reading .header__meta-item {
		gap: 0.625rem;
	}

	.article-header--reading .header__meta > :first-child {
		padding-inline-start: var(--meta-sep-space);
	}

	/* A label and its value wrap as words, like the sentence they read as. */
	.article-header--reading .header__meta-pair {
		display: inline;
	}

	.article-header--reading .header__meta-pair > :first-child::after {
		content: ' ';
	}

	.article-header--reading .header__meta-item--category {
		font-weight: 600;
		color: color-mix(in srgb, var(--muted-foreground) 35%, var(--foreground));
	}

	.article-header--reading .header__meta-sep {
		background: currentColor;
		opacity: 0.6;
	}

	.article-header--reading .header__meta-skeleton {
		background: color-mix(in srgb, var(--foreground) 10%, transparent);
	}

	.article-header--reading .header__actions,
	.article-header--reading .header__controls {
		justify-content: flex-start;
		margin-top: 1.25rem;
	}

	.article-header--reading .header__actions {
		column-gap: 1.25rem;
	}

	.article-header--reading .header__actions + .header__controls {
		margin-top: 0.75rem;
	}

	@media (prefers-reduced-motion: reduce) {
		.header__back {
			transition: none;
		}
	}
</style>
