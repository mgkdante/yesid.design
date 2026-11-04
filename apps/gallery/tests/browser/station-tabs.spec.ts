import { expect, test } from '@playwright/test';

test('station signage shares native and Tabs styling while preserving selection and focus', async ({ page }) => {
	await page.goto('/station-tabs');
	const tabs = page.getByRole('tablist', { name: 'Station information' });
	const links = page.getByRole('navigation', { name: 'Station pages' });
	const overview = tabs.getByRole('tab', { name: '01 Overview' });
	const connections = tabs.getByRole('tab', { name: '02 Connections' });
	await expect(overview).toHaveCSS('font-weight', '700');
	await expect(links.getByRole('link').first()).toHaveCSS('font-weight', '700');
	await overview.focus();
	await overview.press('ArrowRight');
	await expect(connections).toBeFocused();
	await expect(connections).toHaveAttribute('aria-selected', 'true');
	await expect(connections).toHaveCSS('font-weight', '700');
	await expect(connections).toHaveCSS('outline-style', 'solid');
	await expect(tabs.getByRole('tab', { name: 'Unavailable' })).toBeDisabled();
	await expect(links.getByRole('tab')).toHaveCount(0);
	await expect(links.getByRole('link').first()).toHaveAttribute('href', '#station-0');
	const sizing = await overview.evaluate((element) => ({
		height: element.getBoundingClientRect().height,
		minimum: parseFloat(getComputedStyle(element).getPropertyValue('--size-tap-min')),
	}));
	expect(sizing.height).toBeGreaterThanOrEqual(sizing.minimum);
	const viewportWidth = page.viewportSize()!.width;
	expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewportWidth);
});

test('station signage respects theme, independent overrides and reduced motion @theme', async ({ page }) => {
	await page.goto('/station-tabs');
	const rail = page.getByRole('navigation', { name: 'Station pages' });
	const active = rail.getByRole('link').first();
	const inactive = rail.getByRole('link').nth(1);
	const colors = await active.evaluate((element) => {
		const style = getComputedStyle(element);
		return { background: style.backgroundColor, ink: style.color };
	});
	await expect(page.getByRole('tab', { name: '01 Overview' })).toHaveCSS('color', colors.ink);
	await expect(page.getByRole('tab', { name: '01 Overview' })).toHaveCSS('background-color', colors.background);
	await inactive.hover();
	await expect(inactive).toHaveCSS('opacity', '0.7');
	await expect(active).toHaveCSS('opacity', '1');
	await rail.evaluate((element) => {
		element.style.setProperty('--station-tab-active-weight', '800');
		element.style.setProperty('--station-tab-ink', 'rgb(25, 25, 25)');
		element.style.setProperty('--station-tab-hover-opacity', '0.9');
		element.style.setProperty('--size-tap-min', '52px');
	});
	await expect(active).toHaveCSS('font-weight', '800');
	await expect(inactive).toHaveCSS('color', 'rgb(25, 25, 25)');
	await expect(inactive).toHaveCSS('opacity', '0.9');
	await expect(active).toHaveCSS('min-height', '52px');
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await expect(inactive).toHaveCSS('transition-duration', '0s');
});
