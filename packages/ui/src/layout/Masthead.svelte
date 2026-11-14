<!--
  A surface masthead: optional station kicker, dotted heading, optional lede and meta row, then the
  body and a hazard tape. Task pages start with the heading: omit `kicker`, and set `tape={false}`.
  `cornerMeta` renders inside the header (pair it with `CornerMeta`). No fixed heights: long French
  and Spanish headings wrap.
-->
<script lang="ts" module>
	import type { Snippet } from 'svelte';

	export interface MastheadProps {
		/** Station label above the heading; omit it to start with the heading. */
		kicker?: string;
		heading: string;
		subheading?: string;
		lede?: string;
		level?: 1 | 2 | 3 | 4 | 5 | 6;
		headingId?: string;
		explainer?: Snippet;
		cornerMeta?: Snippet;
		meta?: Snippet;
		children?: Snippet;
		/** Hazard tape under the masthead. Defaults to `true`. */
		tape?: boolean;
		/** The brand dot after the heading. Defaults to `true`. */
		dot?: boolean;
		class?: string;
	}
</script>

<script lang="ts">
	import { cn } from '../cn/index.js';
	import SectionHeading from '../brand/SectionHeading.svelte';
	import SectionLabel from '../brand/SectionLabel.svelte';
	import { Separator } from '../primitives/separator/index.js';

	let {
		kicker,
		heading,
		subheading,
		lede,
		level = 1,
		headingId,
		explainer,
		cornerMeta,
		meta,
		children,
		tape = true,
		dot = true,
		class: className,
	}: MastheadProps = $props();
</script>

<div class={cn('masthead', className)} data-slot="masthead">
	<header class="masthead-head" class:masthead-head--cornered={cornerMeta}>
		{@render cornerMeta?.()}
		{#if kicker !== undefined}
			<SectionLabel text={kicker} variant="station" />
		{/if}
		<SectionHeading {heading} {subheading} {level} id={headingId} {dot} {explainer} />
		{#if lede}
			<p class="masthead-lede">{lede}</p>
		{/if}
		{#if meta}
			<div class="masthead-meta" data-slot="masthead-meta">{@render meta()}</div>
		{/if}
	</header>

	{#if children}
		<div class="masthead-body" data-slot="masthead-body">{@render children()}</div>
	{/if}

	{#if tape}
		<Separator variant="hazard" />
	{/if}
</div>

<style>
	.masthead {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}
	.masthead-head {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.masthead-head--cornered {
		position: relative;
	}
	@media (min-width: 768px) {
		.masthead-head--cornered {
			padding-block: 1.75rem;
		}
	}
	.masthead-lede {
		color: var(--muted-foreground);
		font-size: var(--text-subheading);
		line-height: 1.6;
		max-width: var(--measure-lede);
	}
	.masthead-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 1rem;
		font-family: var(--font-mono);
		font-size: var(--text-micro);
		letter-spacing: var(--tracking-eyebrow);
		color: var(--muted-foreground);
	}
	.masthead-body {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}
</style>
