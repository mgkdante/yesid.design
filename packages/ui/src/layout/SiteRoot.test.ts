import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const lenis = vi.hoisted(() => ({ initLenis: vi.fn(), destroyLenis: vi.fn() }));
vi.mock('@yesid/motion/utils/lenis', () => lenis);

import SiteRoot from './SiteRoot.svelte';
import { theme } from '../state/theme.svelte.js';

const page = createRawSnippet(() => ({
	render: () => '<div id="main"><div id="flow">page</div></div>',
}));

describe('SiteRoot', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
	});

	it('renders its children without a wrapper element', () => {
		const { container } = render(SiteRoot, { props: { children: page } });
		expect(container.firstElementChild?.id).toBe('main');
	});

	it('adopts the document theme', () => {
  document.documentElement.dataset.theme = 'light';
  render(SiteRoot, { props: { children: page } });
  expect(theme.current).toBe('light');
 });

	it('keeps <html lang> on the page language', async () => {
		const view = render(SiteRoot, { props: { children: page, lang: 'fr' } });
		expect(document.documentElement.lang).toBe('fr');
		await view.rerender({ children: page, lang: 'en' });
		expect(document.documentElement.lang).toBe('en');
	});

	it('starts Lenis on the window by default and destroys it on unmount', () => {
		const { unmount } = render(SiteRoot, { props: { children: page } });
		expect(lenis.initLenis).toHaveBeenCalledWith(undefined);
		unmount();
		expect(lenis.destroyLenis).toHaveBeenCalledOnce();
	});

	it('passes an element scroller resolved from selectors', () => {
		render(SiteRoot, {
			props: { children: page, scroller: { wrapper: '#main', content: '#flow' } },
		});
		expect(lenis.initLenis).toHaveBeenCalledWith({
			wrapper: document.getElementById('main'),
			content: document.getElementById('flow'),
		});
	});

	it('leaves Lenis off when smooth scroll is disabled', () => {
		render(SiteRoot, { props: { children: page, smoothScroll: false } });
		expect(lenis.initLenis).not.toHaveBeenCalled();
	});
});
