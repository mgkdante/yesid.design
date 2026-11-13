<script lang="ts">
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { CollapsibleSection, FilterGroup, SectionsToggle, TocNav, useSectionJump } from '@yesid/ui/brand';
	import { DataTable } from '@yesid/ui/table';
	let { single = false, late = false }: { single?: boolean; late?: boolean } = $props();
	let loaded = $state(false);
	const navigation = useSectionJump(afterNavigate);
	const copy = { collapse: 'Collapse all', expand: 'Expand all', collapseTitle: 'Collapse sections', expandTitle: 'Expand sections' };
	const entries = [{ id: 'chart-heading', title: 'Chart target', level: 2, children: [] }];
	let root: HTMLDivElement;
	let chart: HTMLDivElement;
	let width = $state(0);
	let updates = $state(0);
	let inspections = $state(0);
	onMount(() => {
		const unregister = navigation.register(entries, { root, landFragments: true });
		const resize = new ResizeObserver(([entry]) => { width = Math.round(entry.contentRect.width); });
		resize.observe(chart);
		const timer = setInterval(() => { updates += 1; }, 100);
		return () => { unregister(); resize.disconnect(); clearInterval(timer); };
	});
</script>

<svelte:head>
	<title>Remembered sections</title>
	<meta name="description" content="Complete chart, table and live-panel content remains in server HTML." />
	<meta property="og:title" content="Remembered sections" />
</svelte:head>

<div bind:this={root} class="grid gap-5" data-testid="remembered-fixture">
	<h1>Remembered sections</h1>
	<nav aria-label="Fixture pages" class="flex flex-wrap gap-2 [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center [&_a]:px-2"><a href="/sections">First page</a> <a href="/sections/next">Next page</a> <a href="/sections/single">Single section</a></nav>
	<SectionsToggle {copy} activeEffect="glow" />
	{#if late}<button type="button" class="min-h-11" onclick={() => { loaded = true; }}>Load sections</button>{/if}
	<TocNav heading="Contents" {entries} {navigation} />
	<FilterGroup label="Filters" items={[]} allLabel="All" collapsible onSelect={() => {}} />
	<CollapsibleSection title="Map tools" independent anchor="tools"><p>Independent map control</p></CollapsibleSection>
	<CollapsibleSection title="Chart" anchor="chart" headerVariant="article-summary" subtitle="Completed observations">
		{#snippet headerActions()}<button type="button" class="min-h-11 px-2" onclick={() => { inspections += 1; }}>Inspect chart</button>{/snippet}
		{#snippet summary()}
			<p data-testid="chart-finding">Most observations met the target during the complete week of November 4 to 10.</p>
			<p>Missing observations limit this finding to the measured service.</p>
		{/snippet}
		<output data-testid="inspections">{inspections}</output>
		<h2 id="chart-heading">Chart target</h2>
		<p>Searchable chart methodology unique phrase</p>
		<div bind:this={chart} data-testid="chart" class="h-32 w-full" data-card-interactive>
			<svg role="img" aria-label="Responsive chart" viewBox={`0 0 ${Math.max(width, 1)} 128`} width="100%" height="128"><rect width={width} height="128" fill="var(--primary)" /></svg>
			<output data-testid="chart-width">{width}</output>
		</div>
	</CollapsibleSection>
	{#if !single && (!late || loaded)}
		<CollapsibleSection title="Live table" anchor="live">
			{#snippet summary()}
				<p lang="fr" data-testid="french-finding">Les observations disponibles pendant la semaine complète du 4 au 10 novembre indiquent que la plupart des passages respectaient la cible annoncée. Ce résultat porte uniquement sur les observations reçues pendant cette période et ne permet pas de conclure que tous les véhicules ou tous les déplacements ont été mesurés. Les périodes sans données restent exclues du calcul et cette limite doit rester lisible même lorsque les détails sont fermés.</p>
			{/snippet}
			<DataTable caption="Live measurements" key={(row) => row} columns={[{ key: 'measure', header: 'Measure', cell }]} rows={['Live source']} />
			<output data-testid="live-updates">{updates}</output>
			<CollapsibleSection title="Nested media" anchor="media">
				<h3 id="media-heading">Media target</h3>
				<video aria-label="Responsive media" width="640" height="360" style="width: 100%; height: auto" controls><track kind="captions" /></video>
			</CollapsibleSection>
		</CollapsibleSection>
	{/if}
	<div data-testid="after-sections">End of content</div>
</div>

{#snippet cell(row: string)}{row}{/snippet}
