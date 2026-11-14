<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import ErrorPageFixture from './ErrorPageFixture.svelte';
	import { DEFAULT_OPTIONS } from './options';

	// Today's page. ?long=1 wraps the copy after hydration for the long-link fit test.
	let long = $state(false);
	onMount(() => (long = page.url.searchParams.get('long') === '1'));
</script>

<svelte:head>
	<title>yesid.design — error page</title>
</svelte:head>

<ErrorPageFixture options={DEFAULT_OPTIONS} {long} />
