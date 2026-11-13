<script lang="ts">
	import SiteFooter from '../SiteFooter.svelte';
	let { statusPrefix, liveLabel }: { statusPrefix?: string; liveLabel?: string } = $props();
</script>
<SiteFooter tagline="Tagline" groups={[]} {statusPrefix} {liveLabel}>
	{#snippet brand()}<span>Brand</span>{/snippet}
</SiteFooter>
