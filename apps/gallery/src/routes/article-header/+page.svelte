<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { ArticleHeader } from '@yesid/ui/layout';
	import { caseStudy, essay, longTitles, type HeaderFixture } from './fixture';

	type Case = {
		id: string;
		label: string;
		fixture: HeaderFixture;
		presentation: 'expressive' | 'reading';
		title?: string;
		highlight?: string;
		proof?: boolean;
	};

	const cases: Case[] = [
		{ id: 'brain-word', label: 'Expressive: the essay title, highlight “ai” accents only the word “AI”', fixture: essay.en, presentation: 'expressive' },
		{ id: 'brain-inside', label: 'Expressive: “AI” appears only inside “BRAIN”, so nothing is accented', fixture: essay.en, presentation: 'expressive', title: 'One BRAIN for four tools', highlight: 'AI' },
		{ id: 'essay-en', label: 'Reading: English', fixture: essay.en, presentation: 'reading' },
		{ id: 'essay-fr', label: 'Reading: French', fixture: essay.fr, presentation: 'reading' },
		{ id: 'essay-es', label: 'Reading: Spanish', fixture: essay.es, presentation: 'reading' },
		{ id: 'long-fr-expressive', label: 'Expressive: long French title', fixture: longTitles.fr, presentation: 'expressive' },
		{ id: 'long-fr', label: 'Reading: long French title', fixture: longTitles.fr, presentation: 'reading' },
		{ id: 'long-es-expressive', label: 'Expressive: long Spanish title', fixture: longTitles.es, presentation: 'expressive' },
		{ id: 'long-es', label: 'Reading: long Spanish title', fixture: longTitles.es, presentation: 'reading' },
		{ id: 'case-study', label: 'Reading: a case study with proof links and Collapse all', fixture: caseStudy, presentation: 'reading', proof: true },
	];

	let params = $state(new URLSearchParams());
	onMount(() => (params = new URLSearchParams(page.url.searchParams.toString())));
	const only = $derived(params.get('only'));
	const shown = $derived(only ? cases.filter((item) => item.id === only) : cases);
</script>

<svelte:head>
	<title>yesid.design: article header</title>
</svelte:head>

{#snippet proofLinks()}
	<a class="inline-flex min-h-11 items-center text-small text-primary underline underline-offset-4" href="/detail-frame">Visit the site</a>
	<a class="inline-flex min-h-11 items-center text-small text-primary underline underline-offset-4" href="/listing-frame">How it is built</a>
{/snippet}

{#snippet collapseAll()}
	<button type="button" class="min-h-11 rounded-md border border-border px-3 py-1 text-small">Collapse all</button>
{/snippet}

<div class="ml-[calc(50%-50vw)] w-screen" style="--chrome-offset: 0px">
	{#each shown as item (item.id)}
		<section
			aria-label={item.label}
			lang={item.fixture.lang}
			data-testid="case-{item.id}"
			class="border-b border-border-subtle pt-6"
		>
			<p class="px-[var(--space-page-x)] pb-2 text-caption text-muted-foreground" lang="en">{item.label}</p>
			<ArticleHeader
				presentation={item.presentation}
				title={item.title ?? item.fixture.title}
				highlight={item.highlight ?? item.fixture.highlight}
				category={item.fixture.category}
				subtitle={item.fixture.subtitle}
				meta={item.fixture.meta}
				backHref="/"
				backLabel={item.fixture.back}
				watermark="Notes"
				edgeLeft="VOL. 01 // ISS. 04"
				edgeRight="2026.11.01"
				actions={item.proof ? proofLinks : undefined}
				controls={collapseAll}
			/>
		</section>
	{/each}
</div>
