<script lang="ts">
	import CollapsibleSection from '../CollapsibleSection.svelte';
</script>

<CollapsibleSection title="Outer" anchor="outer">
	<section data-section-index="2">
		<CollapsibleSection title="Inner" anchor="inner">
			<h3 id="nested-heading">Nested heading</h3>
		</CollapsibleSection>
	</section>
	<CollapsibleSection title="Nested sibling" anchor="nested-sibling"><p>Sibling body</p></CollapsibleSection>
</CollapsibleSection>
<CollapsibleSection title="Unrelated" anchor="unrelated"><p>Unrelated body</p></CollapsibleSection>
