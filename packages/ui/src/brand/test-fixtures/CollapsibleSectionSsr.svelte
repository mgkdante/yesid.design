<script lang="ts">
	import CollapsibleSection from '../CollapsibleSection.svelte';

	let { open }: { open?: boolean } = $props();
</script>
<CollapsibleSection title="Server section" {open}>
	{#snippet summary()}<p>Finding over the complete period, with a caveat.</p>{/snippet}
	<p>Complete methodology source</p>
</CollapsibleSection>
