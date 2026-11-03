import { render } from '@testing-library/svelte';
import type { NavigationLifecycle, NavigationLifecycleOptions } from '../navigation-lifecycle.js';
import type { SiteNavigation } from '../navigation.js';
import Harness from './NavigationLifecycleHarness.svelte';

/** The real factory runs at component initialization, as it does in an app layout. */
export function mountLifecycle(router: SiteNavigation, options?: NavigationLifecycleOptions) {
	let lifecycle: NavigationLifecycle | undefined;
	const view = render(Harness, { router, options, ready: (value) => { lifecycle = value; } });
	if (!lifecycle) throw new Error('The lifecycle harness did not initialize');
	return { lifecycle, unmount: view.unmount };
}
