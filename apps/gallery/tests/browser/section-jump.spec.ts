import { expect, test } from '@playwright/test';

for (const motion of ['reduce', 'no-preference'] as const) {
	test('a TOC action opens only its target and lands on the active 25% line (' + motion + ')', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: motion });
		await page.goto('/detail-frame?sections=1');
		await expect(page.getByRole('button', { name: 'Expand all', exact: true })).toBeVisible();
		if (page.viewportSize()!.width < 1024) {
			await page.getByTestId('toc-pill').getByRole('button', { expanded: false }).click();
			await page.getByTestId('toc-pill').getByRole('button', { name: 'Platforms', exact: true }).click();
		} else {
			await page.getByRole('link', { name: 'Platforms', exact: true }).click();
		}
		await expect(page.getByRole('button', { name: 'Platforms', exact: true })).toHaveAttribute('aria-expanded', 'true');
		for (const title of ['Signals', 'Timetables', 'Handover']) {
			await expect(page.getByRole('button', { name: title, exact: true })).toHaveAttribute('aria-expanded', 'false');
		}
		await expect(page.getByRole('button', { name: 'Collapse all', exact: true })).toBeVisible();
		const target = page.locator('[data-toc="platforms"]');
		await expect.poll(async () => Math.abs((await target.boundingBox())!.y - page.viewportSize()!.height * 0.25)).toBeLessThanOrEqual(2);
		await expect(page.getByTestId('toc-pill').locator('.toc-pill-name')).toHaveText('Platforms');
	});
}

test('the router helper reveals an initial fragment after the real sections register', async ({ page }) => {
	await page.goto('/detail-frame?sections=1#platforms');
	await expect(page.getByRole('button', { name: 'Platforms', exact: true })).toHaveAttribute('aria-expanded', 'true');
	await expect(page.getByRole('button', { name: 'Signals', exact: true })).toHaveAttribute('aria-expanded', 'false');
	await expect.poll(async () => Math.abs((await page.locator('[data-toc="platforms"]').boundingBox())!.y - page.viewportSize()!.height * 0.25)).toBeLessThanOrEqual(2);
});
