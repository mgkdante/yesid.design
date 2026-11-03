<script lang="ts">
	import CollapsibleSection from '../CollapsibleSection.svelte';

	let { open = $bindable(true) }: { open?: boolean } = $props();
</script>
<CollapsibleSection title="Bound" bind:open />
<output data-testid="bound">{open}</output>
