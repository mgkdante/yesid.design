<script lang="ts">
	import '@yesid/ui/station-tabs.css';
	import * as Tabs from '@yesid/ui/tabs';
	const stations = ['Overview', 'Connections', 'Accessibility'];
</script>

<svelte:head><title>Station tabs</title></svelte:head>

<h1 class="font-heading text-title font-bold">Station tabs</h1>
<p class="mt-2 text-muted-foreground">One signage look with caller-owned state and navigation.</p>

<section class="mt-8" aria-labelledby="station-controls">
	<h2 id="station-controls" class="mb-3 font-bold">Tabs</h2>
	<div class="overflow-x-auto" data-testid="station-scroll">
		<Tabs.Root value="Overview">
			<Tabs.List class="station-tabs" aria-label="Station information">
				{#each stations as station, i}
					<Tabs.Trigger class="station-tab" value={station}>
						<span>{String(i + 1).padStart(2, '0')}</span><span>{station}</span>
					</Tabs.Trigger>
				{/each}
				<Tabs.Trigger class="station-tab" value="Unavailable" disabled>Unavailable</Tabs.Trigger>
			</Tabs.List>
			{#each stations as station}
				<Tabs.Content value={station}><p class="mt-3">{station} information.</p></Tabs.Content>
			{/each}
		</Tabs.Root>
	</div>
</section>

<section class="mt-8" aria-labelledby="station-navigation">
	<h2 id="station-navigation" class="mb-3 font-bold">Plain navigation links</h2>
	<div class="overflow-x-auto">
		<nav class="station-tabs" aria-label="Station pages">
			{#each stations as station, i}
				<a class="station-tab" href={`#station-${i}`} aria-current={i === 0 ? 'page' : undefined}>
					<span>{String(i + 1).padStart(2, '0')}</span><span>{station}</span>
				</a>
			{/each}
		</nav>
	</div>
	{#each stations as station, i}<p id={`station-${i}`} class="mt-3">{station} destination.</p>{/each}
</section>
