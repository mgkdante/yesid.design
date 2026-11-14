<script lang="ts">
	import { CollapsibleSection, SectionsToggle } from '@yesid/ui/brand';
	const copy = { collapse: 'Collapse all', expand: 'Expand all', collapseTitle: 'Collapse sections', expandTitle: 'Expand sections' };
</script>
<svelte:head><title>Selective first-visit sections</title></svelte:head>
<main class="grid gap-5" data-register="reading">
	<h1>Selective first-visit sections</h1>
	<p>The first visit keeps optional depth closed. Collapse all and Expand all remember the visitor's choice.</p>
	<SectionsToggle {copy} />
	<CollapsibleSection title="Service finding" anchor="finding">
		{#snippet summary()}<p>The finding stays visible when the details close.</p>{/snippet}
		<p>Complete observations and their limits.</p>
	</CollapsibleSection>
	<CollapsibleSection title="Technical details" anchor="technical" firstVisitClosed>
		{#snippet summary()}
			<p lang="fr">Les détails techniques restent disponibles sur demande, avec les limites des observations et la méthode de calcul pendant toute la période étudiée.</p>
			<p lang="es">Los detalles técnicos están disponibles al abrir la sección, con los límites de las observaciones y el método de cálculo durante todo el período estudiado.</p>
		{/snippet}
		<p>Optional methodology remains readable without JavaScript.</p>
	</CollapsibleSection>
	<div data-testid="after-selective">End of sections</div>
</main>
