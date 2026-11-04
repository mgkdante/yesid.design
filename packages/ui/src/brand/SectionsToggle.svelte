<script lang="ts" module>
	export interface SectionsToggleCopy {
		readonly collapse: string;
		readonly expand: string;
		readonly collapseTitle: string;
		readonly expandTitle: string;
	}

	export type SectionsToggleActiveEffect = 'none' | 'glow';

	/** State and actions default to the shared `sections` state. */
	export interface SectionsToggleProps {
		copy: SectionsToggleCopy;
		collapsed?: boolean;
		onToggle?: () => void;
		activeEffect?: SectionsToggleActiveEffect;
		class?: string;
	}
</script>

<script lang="ts">
	import { cn } from '../cn/index.js';
	import { sections } from '../state/sections.svelte.js';

	let {
		copy,
		collapsed: collapsedProp,
		onToggle = () => sections.toggle(),
		activeEffect = 'none',
		class: className,
	}: SectionsToggleProps = $props();

	const collapsed = $derived(collapsedProp ?? sections.allCollapsed);
	const label = $derived(collapsed ? copy.expand : copy.collapse);
	const title = $derived(collapsed ? copy.expandTitle : copy.collapseTitle);
</script>

{#if sections.count >= 2}
<div
	class={cn(
		'sections-controls',
		activeEffect === 'glow' && 'sections-controls--glow',
		className,
	)}
	data-testid="sections-controls"
>
	<button
		type="button"
		class="sections-toggle sections-toggle--switch tap-press"
		data-collapsed={collapsed}
		{title}
		data-testid="sections-toggle"
		onclick={onToggle}
	>
		<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
			<path class="wave" d="M8.4 8.4a5 5 0 0 0 0 7.2" />
			<path class="wave" d="M15.6 8.4a5 5 0 0 1 0 7.2" />
			<path class="wave wave--far" d="M5.7 5.7a8.9 8.9 0 0 0 0 12.6" />
			<path class="wave wave--far" d="M18.3 5.7a8.9 8.9 0 0 1 0 12.6" />
			<circle class="core" cx="12" cy="12" r="2.3" />
		</svg>
		<span>{label}</span>
	</button>

</div>

{/if}

<style>
	.sections-controls {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}

	.sections-toggle {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		min-width: 44px;
		min-height: 44px;
		border: 2px solid var(--border-brand);
		border-radius: var(--radius-md);
		background: var(--background);
		color: var(--secondary-foreground);
		box-shadow: inset 0 1px 0 var(--edge-highlight);
		cursor: pointer;
		transition:
			border-color var(--duration-normal) var(--ease-default),
			color var(--duration-normal) var(--ease-default),
			background var(--duration-normal) var(--ease-default);
	}

	.sections-toggle--switch {
		padding-inline: 0.875rem 1rem;
		font-family: var(--font-mono);
		font-size: var(--text-control);
		letter-spacing: 0;
	}

	.sections-toggle:hover,
	.sections-toggle:focus-visible,
	.sections-toggle[data-collapsed='true'] {
		border-color: var(--primary);
		color: var(--primary);
		background: color-mix(in srgb, var(--primary) 7%, var(--background));
	}

	.sections-toggle:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 3px;
	}

	.wave,
	.core {
		fill: none;
		stroke: currentColor;
		stroke-width: 1.5;
		stroke-linecap: round;
		stroke-linejoin: round;
		transition:
			opacity var(--duration-normal) var(--ease-default),
			fill var(--duration-normal) var(--ease-default),
			stroke var(--duration-normal) var(--ease-default),
			filter var(--duration-normal) var(--ease-default);
	}

	.wave--far {
		opacity: 0.5;
	}

	.sections-toggle[data-collapsed='true'] .wave {
		opacity: 0;
	}

	.sections-toggle[data-collapsed='true'] .core {
		fill: var(--primary);
		stroke: var(--primary);
	}

	.sections-controls--glow .sections-toggle[data-collapsed='true'] .core {
		filter: drop-shadow(0 0 4px color-mix(in srgb, var(--glow) 60%, transparent));
	}

	@media (prefers-reduced-motion: reduce) {
		.sections-toggle,
		.wave,
		.core {
			transition: none;
		}
	}
</style>
