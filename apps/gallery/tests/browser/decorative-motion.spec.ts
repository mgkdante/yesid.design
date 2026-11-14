import { expect, test } from '@playwright/test';

// Cover every Gallery route, including indirect callers through page frames.
const routes = [
	'/', '/error-page', '/station-tabs', '/site-header', '/site-header-compact',
	'/detail-frame', '/data-page', '/button-focus', '/sections', '/sections/late',
	'/sections/next', '/sections/single', '/navigation-lifecycle-fixture',
	'/density', '/listing-frame',
];

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
	test.describe(reducedMotion, () => {
		test.use({ contextOptions: { reducedMotion } });
		for (const route of routes) {
			test(`decoration settles on ${route}`, async ({ page }) => {
				const response = await page.goto(route);
				expect(response?.ok(), 'Gallery route must load successfully').toBe(true);
				await page.evaluate(() => document.fonts.ready);
				await expect(page.locator('body')).toBeVisible();
				expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches))
					.toBe(reducedMotion === 'reduce');
				const unexpected = (settled: boolean) => page.evaluate((afterRest) => {
					return document.getAnimations().flatMap((animation) => {
						const effect = animation.effect;
						const target = effect instanceof KeyframeEffect ? effect.target : null;
						// Skeleton is the only loading animation supplied by this package.
						// Both its identity and the caller's current busy state are required.
						if (target instanceof Element &&
							target.matches('[data-slot="skeleton"]') &&
							target.closest('[aria-busy="true"]')) return [];
						const infinite = effect?.getTiming().iterations === Infinity;
						const statusLamp = target instanceof Element &&
							target.matches('[data-slot="status-dot"], .led-pulse');
						if (!infinite && !statusLamp && (!afterRest || animation.playState !== 'running')) return [];
						return [{
							name: animation instanceof CSSAnimation ? animation.animationName : animation.id,
							target: target instanceof Element ? target.outerHTML.slice(0, 200) : null,
							state: animation.playState,
						}];
					});
				}, settled);
				expect.soft(await unexpected(false), 'no infinite decoration or pulsing lamps after load').toEqual([]);
				await page.waitForTimeout(6000);
				expect(await unexpected(true), 'no decoration running after six seconds').toEqual([]);
				if (route === '/') {
					const loading = page.locator('[data-gallery-state="loading"][aria-busy="true"]');
					const animations = await loading.evaluate((region) => region.getAnimations({ subtree: true }).length);
					if (reducedMotion === 'reduce') expect(animations).toBe(0);
					else expect(animations).toBeGreaterThan(0);
					await loading.evaluate((region) => region.setAttribute('aria-busy', 'false'));
					await expect.poll(() => page.locator('[data-gallery-state="loading"]')
						.evaluate((region) => region.getAnimations({ subtree: true }).length)).toBe(0);
				}
			});
		}
	});
}
