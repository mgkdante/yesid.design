<script lang="ts">
	import CollapsibleSection from '../CollapsibleSection.svelte';
	import SectionsToggle from '../SectionsToggle.svelte';
	const copy = { collapse: 'Collapse all', expand: 'Expand all', collapseTitle: 'Collapse sections', expandTitle: 'Expand sections' };
</script>
<SectionsToggle {copy} />
<CollapsibleSection title="First" />
<CollapsibleSection title="Second" />
