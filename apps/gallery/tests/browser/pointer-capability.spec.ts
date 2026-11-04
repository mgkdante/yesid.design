import { expect, test } from '@playwright/test';
import { openGallery } from './gallery.js';

for (const device of ['mouse', 'touchscreen laptop with mouse', 'touch-only'] as const) {
	test.describe(device, () => {
		test.use({ isMobile: false, hasTouch: device === 'touch-only' });
		for (const reducedMotion of ['no-preference', 'reduce'] as const) {
			test(`glow and parallax agree with their motion tiers (${reducedMotion})`, async ({ page }) => {
				if (device === 'touchscreen laptop with mouse') {
					// Synthetic hybrid capability, not a real-hardware claim. Keep the
					// browser's native desktop hover/fine-pointer media queries intact.
					await page.addInitScript(() => {
						Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 10 });
					});
				}
				await page.emulateMedia({ reducedMotion });
				await openGallery(page);
				const glow = page.getByRole('img', { name: 'Pointer-following glow surface' });
				const parallax = page.locator('[data-gallery-family="motion:cardParallax"]');
				const canHover = device !== 'touch-only';
				expect(await page.evaluate(() => matchMedia('(any-hover: hover) and (any-pointer: fine)').matches))
					.toBe(canHover);
				if (device === 'touchscreen laptop with mouse') {
					expect(await page.evaluate(() => navigator.maxTouchPoints)).toBe(10);
				}
				await glow.hover();
				await expect(glow.locator('[data-glow-overlay]')).toHaveCount(canHover ? 1 : 0);
				if (canHover) {
					await expect(glow.locator('[data-glow-overlay]')).toHaveAttribute('aria-hidden', 'true');
					await expect.poll(() => glow.evaluate(node => node.style.getPropertyValue('--glow-x'))).not.toBe('');
				}
				await parallax.hover();
				await expect.poll(() => parallax.evaluate(node => node.style.getPropertyValue('--parallax-x') !== ''))
					.toBe(canHover && reducedMotion === 'no-preference');
				const button = page.getByRole('button', { name: 'Cursor pull', exact: true });
				await button.focus();
				await expect(button).toBeFocused();
				await expect(button).toBeEnabled();
			});
		}
	});
}
