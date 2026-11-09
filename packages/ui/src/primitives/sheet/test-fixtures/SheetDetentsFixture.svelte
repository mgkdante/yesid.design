<script lang="ts">
	import * as Sheet from '../index.js';
	let { ondetentchange, detent = $bindable<string | undefined>(), modal = false }: {
		ondetentchange?: (id: string) => void; detent?: string; modal?: boolean;
	} = $props();
	const detents = [{ id: 'peek', size: '120px', label: 'Aperçu' }, { id: 'full', size: '90%', label: 'Complet' }] as const;
</script>
<Sheet.Root open>
	<Sheet.Content {detents} bind:detent {ondetentchange} {modal} handleLabel="Hauteur" showCloseButton={false} portalProps={{ disabled: true }}>
		<Sheet.Title>Detail</Sheet.Title><Sheet.Description>Notes</Sheet.Description>
	</Sheet.Content>
</Sheet.Root>
