<script lang="ts">
	import CollapsibleSection from '../CollapsibleSection.svelte';
	import SectionsToggle from '../SectionsToggle.svelte';
	let { firstVisitClosed = false }: { firstVisitClosed?: boolean } = $props();
	const copy = { collapse: 'Collapse all', expand: 'Expand all', collapseTitle: 'Collapse sections', expandTitle: 'Expand sections' };
</script>
<SectionsToggle {copy} />
<CollapsibleSection title="First" />
<CollapsibleSection title="Second" {firstVisitClosed} />
