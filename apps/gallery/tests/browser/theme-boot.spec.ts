import { expect, test } from '@playwright/test';

// Blocking app scripts proves the theme and content geometry are applied before hydration.
for (const colorScheme of ['dark', 'light'] as const) {
	test(`a reload paints the stored theme and first-visit collapsed section before the app runs (system ${colorScheme})`, async ({ page }) => {
		await page.emulateMedia({ colorScheme });
		await page.goto('/');
		const html = page.locator('html');
		const themeSwitch = page.getByRole('switch', { name: 'Dark theme' });
		const section = page.getByRole('button', { name: 'Service notes' });
		await expect(html).toHaveAttribute('data-theme', 'dark');

		// Server markup shows the controls before hydration wires them; retry until they respond.
		await expect(async () => {
			if ((await html.getAttribute('data-theme')) !== 'light') await themeSwitch.click();
			await expect(html).toHaveAttribute('data-theme', 'light', { timeout: 1000 });
		}).toPass();
		await expect(async () => {
			if ((await section.getAttribute('aria-expanded')) !== 'false') await section.click();
			await expect(section).toHaveAttribute('aria-expanded', 'false', { timeout: 1000 });
		}).toPass();

		await page.route('**/_app/**/*.js', (route) => route.abort());
		await page.reload();
		await expect(html).toHaveAttribute('data-theme', 'light');
		await expect(section).toHaveAttribute('aria-expanded', 'true');
		const body = page.locator(`[id="${await section.getAttribute('aria-controls')}"]`);
		await expect(body).toBeHidden();

		// Hydration takes over the boot script's markup: once the theme switch responds, the section is
		// collapsed by default and its individual toggle still opens it.
		await page.unroute('**/_app/**/*.js');
		await page.reload();
		await expect(async () => {
			if ((await html.getAttribute('data-theme')) !== 'dark') await themeSwitch.click();
			await expect(html).toHaveAttribute('data-theme', 'dark', { timeout: 1000 });
		}).toPass();
		await expect(section).toHaveAttribute('aria-expanded', 'false');
		await section.click();
		await expect(section).toHaveAttribute('aria-expanded', 'true');
		await expect(body).toBeVisible();
	});
}

test('bulk control reaches the real sections and reload ignores old quiet mode', async ({ page }) => {
 await page.goto('/');
 const section = page.getByRole('button', { name: 'Service notes' });
 await expect(page.locator('html')).toHaveAttribute('data-gallery-ready', 'true');
 await expect(section).toHaveAttribute('aria-expanded', 'false');
 await page.getByRole('button', { name: 'Expand all' }).click();
 await expect(section).toHaveAttribute('aria-expanded', 'true');
 await page.evaluate(() => localStorage.setItem('quiet-mode', 'true'));
 await page.reload();
 await expect(section).toHaveAttribute('aria-expanded', 'true');
 await expect(page.getByRole('button', { name: 'Collapse all' })).toBeVisible();
 await expect(page.getByTestId('sections-remember')).toHaveCount(0);
});
