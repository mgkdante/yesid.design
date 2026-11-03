import { redirect } from '@sveltejs/kit';
import { browser } from '$app/environment';
import { HOME, LOCALES } from '$lib/gallery/site-header-fixture';
import type { PageLoad } from './$types';

/** Private router fixture: browser tests control the delay response and real Kit redirect. */
export const load: PageLoad = async ({ url, fetch }) => {
	if (!browser) return {};
	const delay = url.searchParams.get('delay');
	if (delay) await fetch(`/navigation-lifecycle-gate.json?delay=${encodeURIComponent(delay)}`);
	const destination = url.searchParams.get('redirect');
	if (destination === 'ordinary') redirect(307, `${HOME}?landed=ordinary`);
	if (destination === 'locale') redirect(307, `${HOME}?lang=${LOCALES[1]}&landed=locale`);
	return {};
};
