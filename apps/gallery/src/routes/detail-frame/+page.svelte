<script lang="ts">
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { CollapsibleSection, SectionsToggle, useSectionJump, type TocEntry } from '@yesid/ui/brand';
	import { ArticleHeader, DetailFrame } from '@yesid/ui/layout';

	const sections = [
		{ id: 'signals', title: 'Signals' },
		{ id: 'timetables', title: 'Timetables' },
		{ id: 'platforms', title: 'Platforms' },
		{ id: 'handover', title: 'Handover' },
	];
	const entries: TocEntry[] = sections.map(({ id, title }) => ({ id, title, level: 2, children: [] }));
	const navigation = useSectionJump(afterNavigate);
	const sectionCopy = { collapse: 'Collapse all', expand: 'Expand all', collapseTitle: 'Collapse sections', expandTitle: 'Expand sections' };
	const filler =
		'Sample copy for a long section, repeated so the page scrolls far enough to keep the side rails stuck below the navigation bar while the center column moves.';

	let params = $state(new URLSearchParams());
	onMount(() => (params = new URLSearchParams(page.url.searchParams.toString())));
	const layout = $derived(params.get('layout'));
	const sectionFixture = $derived(params.get('sections') === '1');
	const railTop = $derived(Number(params.get('railTop')));
	// Space an app leaves under its chrome inside --chrome-offset.
	const chromeGap = $derived(Number(params.get('chromeGap')));
	let releaseJump: (() => void) | undefined;
	let jumpResult = $state('idle');
	function holdJump() {
		jumpResult = 'pending';
		void navigation.jump('platforms', {
			beforeReveal: () => new Promise<void>((resolve) => { releaseJump = resolve; }),
			behavior: 'auto',
		}).then((result) => { jumpResult = String(result); });
	}
</script>

<svelte:head>
	<title>yesid.design — detail frame</title>
</svelte:head>

<div data-testid="fixture-nav" class="fixed inset-x-0 top-0 z-[60] h-[88px] border-b border-border bg-background"></div>

{#if params.get('links') === '1'}
	<div class="fixed top-24 left-4 z-[70] bg-background p-2" data-testid="jump-link-probe">
		<button onclick={holdJump}>Begin held jump</button>
		<button onclick={() => releaseJump?.()}>Release held jump</button>
		<output data-testid="jump-result">{jumpResult}</output>
	</div>
{/if}

<div class="ml-[calc(50%-50vw)] w-screen pt-[var(--chrome-offset)]" style="--chrome-offset: {88 + chromeGap}px; --chrome-gap: {chromeGap}px">
	<DetailFrame
		left={layout === 'right' ? undefined : leftRail}
		right={layout === 'two' ? undefined : rightRail}
		paneOwnedRail={layout === 'pane'}
		measure={layout === 'measured' ? '46rem' : undefined}
		railScroll={params.get('railScroll') === '1'}
		style={railTop ? `--detail-rail-top: ${railTop}px` : undefined}
		toc={{ entries, navigation, landFragments: true, selector: sectionFixture ? undefined : 'section[id]', openAria: 'Open contents', closeAria: 'Close contents' }}
	>
		{#snippet header()}
			<ArticleHeader
				title="Reading the line"
				highlight="line"
				category="Field notes"
				backHref="/"
				backLabel="All notes"
				meta={['12 min read', { text: 'May 2026', datetime: '2026-05', label: 'Published' }]}
				edgeLeft="REV 04"
				edgeRight="GRID 02"
				watermark="NOTES"
			>
				{#snippet controls()}
					<button type="button" class="min-h-11 rounded-md border border-border px-3 py-1 text-small">Share</button>
				{/snippet}
			</ArticleHeader>
		{/snippet}

		{#if sectionFixture}<SectionsToggle copy={sectionCopy} />{/if}
		{#each sections as { id, title } (id)}
			<section {id} class="mb-10">
				{#if sectionFixture}
					<CollapsibleSection {title} anchor={id} open={false}>
						{#each [1, 2, 3, 4, 5, 6] as n (n)}
							<p class="mb-4 text-reading lg:text-reading-desktop leading-[1.7]">{filler}</p>
						{/each}
					</CollapsibleSection>
				{:else}
				<h2 class="mb-3 text-heading font-bold">{title}</h2>
				{#each [1, 2, 3, 4, 5, 6] as n (n)}
					<p class="mb-4 text-reading lg:text-reading-desktop leading-[1.7]">{filler}</p>
				{/each}
				{/if}
			</section>
		{/each}

		{#snippet after()}
			<div class="border-t border-border p-6 text-small">More notes follow this article.</div>
		{/snippet}
	</DetailFrame>
</div>

{#snippet leftRail()}
	<nav aria-label="Sections">
		<ul class="grid gap-2 text-small [&_a]:inline-block [&_a]:min-h-6">
			{#each sections as { id, title } (id)}
				<li><a href="#{id}">{title}</a></li>
			{/each}
			{#each Array.from({ length: 40 }, (_, n) => n + 1) as n (n)}
				<li class="text-muted-foreground">Reference {n}</li>
			{/each}
		</ul>
	</nav>
{/snippet}

{#snippet rightRail()}
	<p class="font-mono text-caption text-muted-foreground">Related: line 4 timetable, platform plan.</p>
{/snippet}
