import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import LanguageToggle from './LanguageToggle.svelte';

const href = (locale: string) => `/${locale}/page?q=1#h`;
const names = { en: 'English', fr: 'Français', es: 'Español' };

describe('LanguageToggle', () => {
	it('renders nothing with fewer than two locales', () => {
		const { queryByRole } = render(LanguageToggle, { props: { locale: 'en', locales: ['en'], href, names, label: 'Language' } });
		expect(queryByRole('link')).toBeNull();
	});

	it('links to the next locale and names the current one', () => {
		const { getByRole } = render(LanguageToggle, {
			props: { locale: 'fr', locales: ['en', 'fr', 'es'], href, names, label: 'Langue' },
		});
		const link = getByRole('link', { name: 'Langue: Français (EN FR ES)' });
		expect(link.getAttribute('href')).toBe('/es/page?q=1#h');
		expect(link.textContent).toContain('EN');
		expect(link.textContent).toContain('ES');
		expect(link.hasAttribute('data-sveltekit-reset')).toBe(false);
		expect(link.hasAttribute('data-sveltekit-reload')).toBe(false);
	});

	it('asks for a full load or a state-preserving switch', () => {
		const reload = render(LanguageToggle, {
			props: { locale: 'en', locales: ['en', 'fr'], href, names, label: 'Language', reload: true },
		});
		expect(reload.getByRole('link', { name: 'Language: English (EN FR)' }).hasAttribute('data-sveltekit-reload')).toBe(true);
		reload.unmount();

		const kept = render(LanguageToggle, {
			props: { locale: 'en', locales: ['en', 'fr'], href, names, label: 'Language', preserveState: true },
		});
		expect(kept.getByRole('link', { name: 'Language: English (EN FR)' }).getAttribute('data-sveltekit-reset')).toBe('false');
	});

});
