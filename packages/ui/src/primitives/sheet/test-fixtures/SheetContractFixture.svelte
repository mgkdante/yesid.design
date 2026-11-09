<script lang="ts">
	import { Sheet, SheetContent, SheetDescription, SheetTitle } from '../index.js';

	type Props = { modal?: boolean } & (
		| { closeLabel: string; showCloseButton?: boolean }
		| { closeLabel?: string; showCloseButton: false });

	let props: Props = $props();
	let open = $state(true);
</script>

<Sheet bind:open>
	<SheetContent portalProps={{ disabled: true }} {...props}>
		<SheetTitle>Fixture title</SheetTitle>
		<SheetDescription>Fixture description</SheetDescription>
		<p>Fixture body</p>
	</SheetContent>
</Sheet>

