<!--
  SliderButton: the previous/next control for every slider, carousel and lightbox.
  The chevron is drawn centred in its viewBox and the button centres it on a grid,
  so the arrow sits on the optical centre of the round target.
-->
<script lang="ts">
	import { cn } from '../cn/index.js';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	export type SliderButtonProps = Omit<HTMLButtonAttributes, 'children' | 'class' | 'type'> & {
		direction: 'previous' | 'next';
		/** Accessible name, e.g. "Previous photo". */
		'aria-label': string;
		class?: string;
	};

	let { direction, class: className, ...restProps }: SliderButtonProps = $props();
</script>

<button
	{...restProps}
	type="button"
	class={cn('slider-button tap-press', className)}
	data-slot="slider-button"
	data-direction={direction}
>
	<svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
		<path
			d={direction === 'previous' ? 'M10.5 3 5.5 8l5 5' : 'M5.5 3l5 5-5 5'}
			stroke="currentColor"
			stroke-width="1.75"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	</svg>
</button>

<style>
	.slider-button {
		display: inline-grid;
		place-items: center;
		flex: none;
		width: var(--size-tap-min);
		height: var(--size-tap-min);
		padding: 0;
		border: 1px solid color-mix(in srgb, var(--primary) 35%, transparent);
		border-radius: var(--radius-pill);
		background: transparent;
		color: var(--primary);
		cursor: pointer;
		transition:
			background var(--duration-normal) var(--ease-default),
			border-color var(--duration-normal) var(--ease-default);
	}

	.slider-button svg {
		display: block;
		width: 1rem;
		height: 1rem;
	}

	.slider-button:hover:not(:disabled) {
		background: color-mix(in srgb, var(--primary) 10%, transparent);
		border-color: color-mix(in srgb, var(--primary) 55%, transparent);
	}

	.slider-button:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 2px;
	}

	.slider-button:disabled {
		opacity: 0.4;
		cursor: default;
	}

	@media (prefers-reduced-motion: reduce) {
		.slider-button {
			transition: none;
		}
	}
</style>
