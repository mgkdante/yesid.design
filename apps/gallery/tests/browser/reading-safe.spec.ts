import { expect, test } from '@playwright/test';
import { expectAccessible } from '@yesid/config/playwright';
import { openGallery } from './gallery.js';

for (const reducedMotion of ['reduce', 'no-preference'] as const) {
	test(`terminal signals are explicit and motion gated (${reducedMotion})`, async ({ page }) => {
		await page.emulateMedia({ reducedMotion });
		await openGallery(page);
		const family = page.locator('[data-gallery-family="brand:TerminalPanel"]');
		const panels = family.locator('[data-slot="terminal-panel"]');
		await expect(panels).toHaveCount(2);
		await expect(panels.first().locator('[data-slot="status-dot"]')).toHaveCount(0);
		await expect(panels.last().getByText('Live sample feed')).toHaveCount(1);
		const lamp = panels.last().locator('[data-slot="status-dot"]');
		await expect(lamp).toHaveCSS('animation-name', reducedMotion === 'reduce' ? 'none' : 'pulse-glow');
		await expectAccessible(page, { include: '[data-gallery-family="brand:TerminalPanel"]' });
	});
}

for (const reducedMotion of ['reduce', 'no-preference'] as const) {
	test(`a held section press has no scale effect (${reducedMotion})`, async ({ page }) => {
		await page.emulateMedia({ reducedMotion });
		await openGallery(page);
		const card = page.locator('[data-gallery-family="brand:CollapsibleSection"] .section-card').first();
		await card.scrollIntoViewIfNeeded();
		const body = card.locator('[data-slot="collapsible-content"]');
		await body.hover();
		await page.mouse.down();
		try {
			expect(await card.evaluate(node => node.matches(':active'))).toBe(true);
			await expect(card).toHaveCSS('scale', 'none');
			await expect(card).toHaveCSS('transform', 'none');
		} finally { await page.mouse.up(); }
	});
}

test('overscroll follows primary pointer capability', async ({ page }) => {
	await openGallery(page);
	const fine = await page.evaluate(() => matchMedia('(pointer: fine)').matches);
	await expect(page.locator('html')).toHaveCSS('overscroll-behavior-y', fine ? 'none' : 'auto');
});
