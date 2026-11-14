import { cleanup, render } from '@testing-library/svelte';
import { afterEach, expect, it, vi } from 'vitest';
import SiteHeader from './SiteHeader.svelte';
import { mountLifecycle } from '../brand/test-fixtures/mount-lifecycle.js';
import { fakeRouter } from '../brand/test-fixtures/fake-router.js';
const calls = vi.hoisted(() => vi.fn(() => ({ destroy() {} })));
vi.mock('@yesid/motion/actions', async original => ({ ...await original<object>(), wordmarkHover: calls }));
afterEach(() => { cleanup(); calls.mockClear(); });
const labels = { openMenu: 'Open menu', closeMenu: 'Close menu', menu: 'Menu', theme: 'Theme', menuFooter: '', skipToContent: 'Skip' };
it.each([undefined, [], [{ label: 'Empty', items: [] }]])('omits an empty menu and keeps compact controls reachable: %j', menuGroups => {
 const navigation = mountLifecycle(fakeRouter().router).lifecycle;
 const view = render(SiteHeader, { navigation, home: '/', links: [], menuItems: menuGroups ? [{ href: '/old', label: 'Old' }] : [], menuGroups, compactControls: true, labels });
 expect(view.queryByRole('button', { name: 'Open menu' })).toBeNull();
 expect(view.getByRole('switch', { name: 'Theme' })).toBeInTheDocument();
});
it.each([true, false])('forwards wordmark autoplay %s', wordmarkAutoPlay => {
 const navigation = mountLifecycle(fakeRouter().router).lifecycle;
 render(SiteHeader, { navigation, home: '/', links: [], labels, wordmarkAutoPlay });
 expect(calls).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ autoPlay: wordmarkAutoPlay }));
});
it('retains wordmark autoplay by default', () => {
 const navigation = mountLifecycle(fakeRouter().router).lifecycle;
 render(SiteHeader, { navigation, home: '/', links: [], labels });
 expect(calls).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ autoPlay: true }));
});
