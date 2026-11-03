<script lang="ts">
	import DetailFrame from '../DetailFrame.svelte';
	import CollapsibleSection from '../../brand/CollapsibleSection.svelte';
	import type { TocEntry } from '../../brand/toc.js';
	import type { SectionJump } from '../../brand/section-jump.js';
	let {
		landFragments = true,
		navigation,
		entries = ['a', 'b'].map((id) => ({ id: 'sec-' + id, title: 'Section ' + id.toUpperCase(), level: 2, children: [] })),
	}: { landFragments?: boolean; navigation?: SectionJump; entries?: TocEntry[] } = $props();
</script>
<DetailFrame toc={{ entries, navigation, landFragments, openAria: 'Open contents', closeAria: 'Close contents' }}>
	<a href="#sec-b">Jump to B</a>
	{#each entries as entry (entry.id)}
		<CollapsibleSection title={entry.title} anchor={entry.id} open={false}><p>{entry.title} body</p></CollapsibleSection>
	{/each}
</DetailFrame>
