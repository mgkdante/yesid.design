<script lang="ts">
	import SiteFooter, { type SiteFooterProps } from '../SiteFooter.svelte';
	let status: Pick<SiteFooterProps, 'statusPrefix' | 'liveLabel'> = $props();
</script>
{#snippet brand()}<span>Brand</span>{/snippet}
{#if status.statusPrefix !== undefined && status.liveLabel !== undefined}
	<SiteFooter tagline="Tagline" groups={[]} {brand} statusPrefix={status.statusPrefix} liveLabel={status.liveLabel} />
{:else}
	<SiteFooter tagline="Tagline" groups={[]} {brand} />
{/if}
