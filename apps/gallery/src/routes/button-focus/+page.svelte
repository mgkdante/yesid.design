<script lang="ts">
	import { Button } from '@yesid/ui/button';
	import { Card } from '@yesid/ui/card';
	const variants = ['default', 'conversion', 'outline', 'ghost'] as const;
</script>

<svelte:head><title>Button focus</title></svelte:head>
<h1 id="main" class="font-heading text-title">Button focus</h1>
{#snippet buttons(surface: string)}
	<div class="flex flex-wrap gap-6 p-6" data-focus-surface={surface}>
		{#each variants as variant}
			<Button {variant} size="cta">{surface} {variant}</Button>
			<Button {variant} size="cta" href="#main">{surface} {variant} link</Button>
		{/each}
	</div>
{/snippet}
{@render buttons('page')}
<Card>{@render buttons('card')}</Card>
