<script lang="ts">
	import ErrorPageFixture from '../ErrorPageFixture.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>yesid.design: error page options</title>
</svelte:head>

<ErrorPageFixture options={data.options} />
