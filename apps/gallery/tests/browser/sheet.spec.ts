import { expect, test } from '@playwright/test';
import { openGallery } from './gallery.js';

test('Sheet owns its motion styles and respects reduced motion', async ({ page }) => {
	for (const reducedMotion of ['no-preference', 'reduce'] as const) {
		await page.emulateMedia({ reducedMotion });
		await openGallery(page);
		await page.getByRole('button', { name: 'Open details' }).click();
		const dialog = page.getByRole('dialog', { name: 'Operational detail' });
		await expect(dialog).toBeVisible();
		const animation = await dialog.evaluate(node => getComputedStyle(node).animationName);
		expect(animation).toBe(reducedMotion === 'reduce' ? 'none' : 'enter');
		await dialog.getByRole('button', { name: 'Fermer le panneau' }).click();
		await expect(dialog).toBeHidden();
	}
});
