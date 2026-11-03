<script lang="ts">
	import { createNavigationLifecycle, type NavigationLifecycle, type NavigationLifecycleOptions } from '../navigation-lifecycle.js';
	import type { SiteNavigation } from '../navigation.js';
	let { router, options, ready }: {
		router: SiteNavigation;
		options?: NavigationLifecycleOptions;
		ready: (lifecycle: NavigationLifecycle) => void;
	} = $props();
	// svelte-ignore state_referenced_locally
	ready(createNavigationLifecycle(router, options));
</script>
