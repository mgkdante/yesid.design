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
						if (!infinite && (!afterRest || animation.playState !== 'running')) return [];
						return [{
							name: animation instanceof CSSAnimation ? animation.animationName : animation.id,
							target: target instanceof Element ? target.outerHTML.slice(0, 200) : null,
							state: animation.playState,
						}];
					});
				}, settled);
				expect.soft(await unexpected(false), 'no infinite decoration after load').toEqual([]);
				await page.waitForTimeout(6000);
				expect(await unexpected(true), 'no decoration running after six seconds').toEqual([]);
			});
		}
	});
}
