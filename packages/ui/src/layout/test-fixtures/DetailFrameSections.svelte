<script lang="ts">
	import DetailFrame from '../DetailFrame.svelte';
	import CollapsibleSection from '../../brand/CollapsibleSection.svelte';
	import type { TocEntry } from '../../brand/toc.js';
	let { landFragments = true }: { landFragments?: boolean } = $props();
	const entries: TocEntry[] = ['a', 'b'].map((id) => ({ id: 'sec-' + id, title: 'Section ' + id.toUpperCase(), level: 2, children: [] }));
</script>
<DetailFrame toc={{ entries, landFragments, openAria: 'Open contents', closeAria: 'Close contents' }}>
	<a href="#sec-b">Jump to B</a>
	<CollapsibleSection title="Section A" anchor="sec-a" open={false}><p>A body</p></CollapsibleSection>
	<CollapsibleSection title="Section B" anchor="sec-b" open={false}><p>B body</p></CollapsibleSection>
</DetailFrame>
