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

for (const device of ['desktop', 'hybrid'] as const) {
	test.describe(`exclusive hover feedback on ${device}`, () => {
		test.use({ isMobile: false, hasTouch: false });
		for (const reducedMotion of ['no-preference', 'reduce'] as const) {
			test(`hover and held press keep the desktop CSS baseline (${reducedMotion})`, async ({ page }) => {
				if (device === 'hybrid') {
					await page.addInitScript(() => {
						Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 10 });
					});
				}
				await page.emulateMedia({ reducedMotion });
				await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
				await openGallery(page);
				// Loading may use RAF; freeze only after hydration, before interaction.
				await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
				const start = await page.evaluate(() => Date.now());
				const segment = page.getByRole('radiogroup', { name: 'Grain', exact: true }).getByRole('radio').first();
				await segment.hover();
				expect(await page.evaluate(() => matchMedia('(any-hover: hover) and (any-pointer: fine)').matches)).toBe(true);
				expect.soft(await segment.evaluate(node => node.style.transform), 'boop uses its original transform channel').toBe('scale(1.04)');
				expect.soft(await segment.evaluate(node => node.style.scale), 'boop must not override the CSS active scale').toBe('');
				await page.mouse.down();
				try {
					await page.clock.runFor(150);
					expect(await page.evaluate(() => Date.now()) - start).toBe(150);
					await expect.soft(segment).toHaveCSS('scale', '0.97');
					// An active pressBounce would replace this with a GSAP transform.
					expect.soft(await segment.evaluate(node => node.style.transform)).toBe('scale(1.04)');
					await page.clock.runFor(500);
					expect(await page.evaluate(() => Date.now()) - start).toBe(650);
					await expect(segment).toHaveCSS('scale', '0.97');
					await expect.soft(segment).toHaveCSS('transform', 'none');
					const transitions = await segment.evaluate(node => getComputedStyle(node).transitionProperty);
					expect.soft(transitions.split(',').map(value => value.trim())).not.toContain('scale');
				} finally {
					await page.mouse.up();
				}
				// The finished boop must not leave a scale transition over future presses.
				await expect(segment).toHaveCSS('scale', 'none');
				await page.mouse.down();
				await expect(segment).toHaveCSS('scale', '0.97');
				await page.mouse.up();
				await expect(segment).toHaveCSS('scale', 'none');
				await expect(segment).toHaveCSS('transform', 'none');
				await expect(segment).toBeFocused();
				await expect(segment).toBeEnabled();

				// A pressBounce-only surface can acquire a consumer hover transform
				// after mount. An inert action must preserve it through the press.
				const surface = page.getByRole('button', { name: 'Touch response', exact: true });
				await surface.evaluate(node => { node.style.transform = 'translateY(-2px)'; });
				await surface.hover();
				await page.mouse.down();
				await page.clock.runFor(150);
				await expect(surface).toHaveCSS('scale', '0.97');
				await expect(surface).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, -2)');
				await page.mouse.up();
				await page.clock.runFor(150);
				await expect(surface).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, -2)');
			});
		}
	});
}
