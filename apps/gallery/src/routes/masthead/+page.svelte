<script lang="ts">
	import { Masthead, Surface } from '@yesid/ui/layout';
	import { mastheads } from './fixture';
</script>

<svelte:head>
	<title>yesid.design: masthead</title>
</svelte:head>

<Surface>
	<h1 class="sr-only">Masthead compositions</h1>
	<section aria-labelledby="masthead-today" class="grid gap-8" data-masthead-set="today">
		<h2 id="masthead-today" class="font-heading text-heading font-bold">Today: kicker, dotted heading, tape</h2>
		{#each mastheads as entry (entry.lang)}
			<div lang={entry.lang} data-masthead-lang={entry.lang}>
				<Masthead kicker={entry.kicker} heading={entry.heading} lede={entry.lede} level={3} />
			</div>
		{/each}
	</section>

	<section aria-labelledby="masthead-task" class="grid gap-8" data-masthead-set="task">
		<h2 id="masthead-task" class="font-heading text-heading font-bold">Task: heading first, no kicker, no tape</h2>
		{#each mastheads as entry (entry.lang)}
			<div lang={entry.lang} data-masthead-lang={entry.lang}>
				<Masthead heading={entry.heading} lede={entry.lede} level={3} tape={false} />
			</div>
		{/each}
	</section>

	<section aria-labelledby="masthead-undotted" class="grid gap-8" data-masthead-set="undotted">
		<h2 id="masthead-undotted" class="font-heading text-heading font-bold">Task without the dot (dot=false)</h2>
		{#each mastheads as entry (entry.lang)}
			<div lang={entry.lang} data-masthead-lang={entry.lang}>
				<Masthead heading={entry.heading} lede={entry.lede} level={3} tape={false} dot={false} />
			</div>
		{/each}
	</section>
</Surface>
