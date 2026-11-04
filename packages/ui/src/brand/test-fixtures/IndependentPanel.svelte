<script lang="ts">
	import { untrack } from 'svelte';
	import CollapsibleSection from '../CollapsibleSection.svelte';

	let { open = true, collapsible = true, independent = true }: { open?: boolean; collapsible?: boolean; independent?: boolean } = $props();
	let panelOpen = $state(untrack(() => open));
</script>

<CollapsibleSection title="Filters" anchor="filters" {independent} {collapsible} bind:open={panelOpen}>
	<p id="filter-help">Choose the visible routes.</p>
	<button type="button">Apply filters</button>
</CollapsibleSection>
<output data-testid="panel-open">{panelOpen}</output>
<button type="button" onclick={() => { panelOpen = !panelOpen; }}>Caller toggle</button>
