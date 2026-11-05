<!-- A content section owns registration for page actions; SectionCard owns its rendered mechanics. -->
<script lang="ts" module>
	import type { Snippet } from 'svelte';

	export interface CollapsibleSectionProps {
		title: string;
		subtitle?: string;
		/** `article-summary`: a heading row with optional actions and a clamped subtitle. */
		headerVariant?: 'default' | 'article-summary';
		open?: boolean;
		/** Zero-based; renders the 01, 02 badge. */
		index?: number | null;
		accentColor?: string;
		collapsible?: boolean;
		/** Excludes a control panel from page bulk actions and counts; explicit jumps can still open it. */
		independent?: boolean;
		/** Emits `data-toc` so TocNav and TocPill can target this section. */
		anchor?: string;
		/** A product signal that opens the section whenever it changes, like a reader click. */
		openSignal?: number | null;
		icon?: Snippet;
		headerActions?: Snippet;
		children?: Snippet;
	}
</script>

<script lang="ts">
	import SectionCard from './SectionCard.svelte';
	import { registerSection } from './sections-registry.js';
	import { initialSectionOpen } from './sections-preference.js';

	let { open = $bindable(true), independent = false, ...props }: CollapsibleSectionProps = $props();
	let element = $state<HTMLDivElement | null>(null);
	let initialized = $state(false);
	$effect.pre(() => {
		if (initialized || !element) return;
		if (props.collapsible !== false) open = initialSectionOpen(element, open, independent);
		initialized = true;
	});

	$effect(() => {
		if (props.collapsible === false && !independent) return;
		return registerSection({
			independent,
			id: props.anchor,
			element: () => element,
			isOpen: () => props.collapsible === false || open,
			setOpen: (next) => {
				if (props.collapsible !== false) open = next;
			},
		});
	});
</script>

<SectionCard {...props} bulk={!independent && props.collapsible !== false} {initialized} bind:open bind:ref={element} />
