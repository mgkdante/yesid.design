<script lang="ts">
	import TerminalPanel, { type TerminalPanelProps } from '../TerminalPanel.svelte';
	let props: Omit<TerminalPanelProps, 'children'> = $props();
</script>
<TerminalPanel {...props}><p>Archived results</p></TerminalPanel>
