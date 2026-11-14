<!--
  The Gallery error page: ErrorPage with the given options, then a sample footer. /error-page renders
  today's page; /error-page/[options] renders an option set in its first markup.
-->
<script lang="ts">
	import { ErrorPage, SiteFooter } from '@yesid/ui/layout';
	import { copy, type ErrorPageGalleryOptions } from './options';

	let { options, long = false }: { options: ErrorPageGalleryOptions; long?: boolean } = $props();

	const words = $derived(copy[options.lang]);
	const longSuggestions = $derived(
		words.suggestions.map(({ href, label }) => ({
			href,
			label: `${label} with a deliberately long destination label`,
		})),
	);
</script>

{#snippet brand()}
	<span class="font-heading font-bold">yesid.dev</span>
{/snippet}

{#snippet statusStart()}
	<span>Sample station, Montreal</span>
{/snippet}

{#snippet themeButton()}
	<button type="button" class="mt-2 min-h-11 rounded-md border border-border px-3 py-1 text-small">Toggle theme</button>
{/snippet}

<div lang={options.lang} class="contents">
	<ErrorPage
		status={404}
		label={options.label ? words.label : undefined}
		tape={options.tape}
		illustration={options.illustration}
		heading={long
			? 'Wrong platform, and a heading long enough to wrap across several lines on a narrow screen'
			: words.heading}
		body={long
			? 'The page you asked for is not on this line. This longer explanation keeps going so the body wraps onto several lines as well and the whole error page grows taller than a short viewport.'
			: words.body}
		suggestions={long ? longSuggestions : words.suggestions}
		suggestionsLabel={options.named ? words.suggestionsLabel : undefined}
		statusNote={words.statusNote}
		signLabel="STATION"
	/>
</div>

<SiteFooter
	{brand}
	tagline="Sample footer copy"
	groups={[
		{ label: 'Pages', links: [{ href: '/', label: 'Home' }, { href: '/listing-frame', label: 'Listing' }] },
		{ label: 'Elsewhere', links: [{ href: 'https://example.com', label: 'Source', external: true }], after: themeButton },
		{ label: 'Contact', links: [{ href: 'mailto:hello@example.com', label: 'Email' }] },
	]}
	{statusStart}
	statusPrefix="System date"
	liveLabel="Live"
/>
