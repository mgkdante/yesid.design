// @vitest-environment node
import { render } from 'svelte/server';
import { expect, it } from 'vitest';
import LanguageToggle from './LanguageToggle.svelte';

it.each([
    { locale: 'en', locales: ['fr', 'en', 'es'], next: 'fr', codes: ['EN', 'FR', 'ES'] },
    { locale: 'es', locales: ['fr', 'en', 'es'], next: 'en', codes: ['EN', 'FR', 'ES'] },
    { locale: 'fr', locales: ['en', 'fr'], next: 'en', codes: ['EN', 'FR'] },
    { locale: 'es', locales: ['de', 'fr', 'es', 'en'], next: 'de', codes: ['EN', 'FR', 'ES', 'DE'] },
])('server renders the brand order from $locale', ({ locale, locales, next, codes }) => {
    const { body } = render(LanguageToggle, { props: {
        locale, locales, href: value => `/${value}`, label: 'Language',
        names: { en: 'English', fr: 'Français', es: 'Español', de: 'Deutsch' },
    } });
    expect(body).toContain(`href="/${next}"`);
    expect([...body.matchAll(/<text[^>]*>(.*?)<\/text>/g)].map(match => match[1])).toEqual(codes);
});
