<script lang="ts">
	import { getContext } from 'svelte';
	import type { NavigationLifecycle } from '@yesid/ui/brand';
	import { browser } from '$app/env';
	import { page } from '$app/state';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import FileText from '@lucide/svelte/icons/file-text';
	import LayoutList from '@lucide/svelte/icons/layout-list';
	import PanelTop from '@lucide/svelte/icons/panel-top';
	import { SiteHeader, SiteFooter } from '@yesid/ui/layout';
	import {
		HOME,
		LABELS,
		LANGUAGE_LABEL,
		LANGUAGE_NAMES,
		LINKS,
		LOCALES,
		MENU_ITEMS,
		SEARCH_LABEL,
		languageHref,
	} from '#lib/gallery/site-header-fixture.ts';

	const navigation = getContext<NavigationLifecycle>('gallery-navigation');
	const ICONS: Record<string, typeof PanelTop> = {
		[HOME]: PanelTop,
		'/listing-frame': LayoutList,
		'/detail-frame': FileText,
		'https://example.com': ExternalLink,
	};
	const compact = $derived(browser && page.url.searchParams.has('compact'));
	const groupedItems = MENU_ITEMS.map(item => ({ ...item, icon: ICONS[item.href] }));
	const locale = $derived((browser && page.url.searchParams.get('lang')) || LOCALES[0]);
</script>

<svelte:head>
	<title>yesid.design — site header</title>
</svelte:head>

{#snippet search()}
	<input
		type="search"
		aria-label={SEARCH_LABEL}
		placeholder={SEARCH_LABEL}
		class="h-11 w-56 rounded-full border border-border-subtle bg-muted px-4 text-small"
	/>
{/snippet}

{#snippet action()}
	<button type="button" class="min-h-11 px-3 text-small" onclick={() => document.querySelector<HTMLInputElement>('#fixture-search')?.focus()}>Search</button>
{/snippet}

<SiteHeader
	{navigation}
	home={HOME}
	links={LINKS}
	menuItems={MENU_ITEMS.map((item) => ({ ...item, icon: ICONS[item.href] }))}
	menuGroups={compact ? [{ label: 'Explore routes', items: groupedItems.slice(0, 2) }, { label: 'More destinations', items: groupedItems.slice(2) }] : undefined}
	compactControls={compact}
	actions={compact ? action : undefined}
	labels={LABELS}
	language={{ locale, locales: LOCALES, href: languageHref, label: LANGUAGE_LABEL, names: LANGUAGE_NAMES, preserveState: true }}
	{search}
/>

<main id="main" class="mx-auto max-w-5xl px-6 pb-10" style="padding-top: var(--nav-clearance);">
	<h1 class="font-heading text-display font-bold">Site header</h1>
	<p class="mt-4 max-w-prose text-reading lg:text-reading-desktop leading-[1.7] text-muted-foreground">
		Priority 2 links show from 500px of header width, priority 3 links and search from 1024px. The
		menu holds every destination, like the <a href="/listing-frame">listing frame</a>; a language
		switch from the open menu keeps it open.
	</p>
	{#if compact}<input id="fixture-search" type="search" aria-label="Search destinations" class="mt-6 h-11 border border-border-subtle px-4" />{/if}
</main>
{#if compact}
	<SiteFooter tagline="Shared shell fixture" groups={[]}>
		{#snippet brand()}<a href="/site-header">Gallery</a>{/snippet}
	</SiteFooter>
{/if}
