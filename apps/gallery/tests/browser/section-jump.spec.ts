import { expect, test } from '@playwright/test';

for (const motion of ['reduce', 'no-preference'] as const) {
	test('reopening the mobile TOC during settlement still lands and sets the active item (' + motion + ')', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.emulateMedia({ reducedMotion: motion });
		await page.goto('/detail-frame?sections=1');
		await page.getByRole('button', { name: 'Signals', exact: true }).click();
		await page.evaluate(() => window.scrollTo(0, 300));
		const pill = page.getByTestId('toc-pill');
		await pill.getByRole('button', { expanded: false }).click();
		// One frame lets jump() open its real section and enter settlement. Reopen before
		// the required stable frames complete, without relying on automation click delays.
		await pill.getByRole('button', { name: 'Platforms', exact: true }).evaluate(async (item) => {
			(item as HTMLButtonElement).click();
			await new Promise(requestAnimationFrame);
			document.querySelector<HTMLButtonElement>('[data-testid="toc-pill"] > button')!.click();
		});
		await expect(pill.getByRole('button', { expanded: true })).toBeVisible();
		await expect(page.locator('[data-toc="platforms"] button').first()).toHaveAttribute('aria-expanded', 'true');
		await expect.poll(async () => Math.abs((await page.locator('[data-toc="platforms"]').boundingBox())!.y - 844 * 0.25)).toBeLessThanOrEqual(2);
		await expect(pill.getByRole('button', { name: 'Platforms', exact: true })).toHaveAttribute('aria-current', 'location');
	});
}

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
