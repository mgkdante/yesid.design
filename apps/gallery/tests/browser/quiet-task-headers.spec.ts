import { expect, test, type Locator, type Page } from '@playwright/test';
import { expectAccessible, expectNoHorizontalOverflow } from '@yesid/config/playwright';

import { copy, ILLUSTRATIONS, type ErrorPageGalleryLang } from '../../src/routes/error-page/options.js';
import { mastheads } from '../../src/routes/masthead/fixture.js';

// Each @theme test runs once in the light project and once in the dark one.
const WIDTHS = [320, 390, 768, 1280, 1920] as const;
const LANGS = ['en', 'fr', 'es'] as const satisfies readonly ErrorPageGalleryLang[];
const SMALL_SCENE_MAX = 14 * 16;

async function open(page: Page, path: string): Promise<void> {
	await page.goto(path);
	await expect(page.locator('html')).toHaveAttribute('data-gallery-ready', 'true');
	await page.evaluate(() => document.fonts.ready);
}

async function box(locator: Locator) {
	const value = await locator.boundingBox();
	expect(value, 'element is laid out').not.toBeNull();
	return value!;
}

async function expectUnclipped(locator: Locator): Promise<void> {
	const clipped = await locator.evaluateAll((elements) =>
		elements
			.filter((element) => element.scrollHeight > element.clientHeight + 1 || element.scrollWidth > element.clientWidth + 1)
			.map((element) => element.textContent?.trim()),
	);
	expect(clipped, 'no clipped heading').toEqual([]);
}

test.describe('error page options', { tag: '@theme' }, () => {
	for (const illustration of ILLUSTRATIONS) {
		test(`illustration=${illustration} keeps its place from 320 to 1920 px in three languages`, async ({ page }) => {
			for (const width of WIDTHS) {
				await page.setViewportSize({ width, height: 800 });
				for (const lang of LANGS) {
					const words = copy[lang];
					await open(page, `/error-page?illustration=${illustration}&lang=${lang}`);
					await expectNoHorizontalOverflow(page);

					const heading = page.getByRole('heading', { level: 1, name: words.heading });
					const nav = page.getByRole('navigation', { name: words.suggestionsLabel });
					const scene = page.getByTestId('construction-scene');
					await expect(heading).toBeVisible();
					await expect(nav).toBeVisible();
					await expectUnclipped(heading);

					if (illustration === 'none') {
						await expect(scene).toHaveCount(0);
						continue;
					}
					const [sceneBox, headingBox, navBox] = [await box(scene), await box(heading), await box(nav)];
					if (illustration === 'large-first') {
						expect(sceneBox.y + sceneBox.height).toBeLessThanOrEqual(headingBox.y);
					} else {
						expect(sceneBox.y).toBeGreaterThanOrEqual(navBox.y + navBox.height);
						expect(sceneBox.width).toBeLessThanOrEqual(SMALL_SCENE_MAX + 0.5);
					}
				}
			}
		});

		test(`illustration=${illustration} is still under both motion settings`, async ({ page }) => {
			for (const reducedMotion of ['reduce', 'no-preference'] as const) {
				await page.emulateMedia({ reducedMotion });
				await open(page, `/error-page?illustration=${illustration}`);
				const animations = await page.evaluate(() =>
					[...document.querySelectorAll('[data-slot="error-page"]')].flatMap((section) =>
						section.getAnimations({ subtree: true }).map((animation) => String(animation.effect?.getTiming().iterations)),
					),
				);
				expect(animations, `no animation under ${reducedMotion}`).toEqual([]);
				if (illustration !== 'none') await expect(page.locator('.light-a').first()).toHaveCSS('animation-name', 'none');
			}
		});
	}

	test('label, tape and the suggestions name are each optional', async ({ page }) => {
		const words = copy.en;
		await open(page, '/error-page');
		await expect(page.getByTestId('hazard-tape')).toHaveCount(1);
		await expect(page.getByTestId('error-label')).toHaveText(words.label);

		await page.setViewportSize({ width: 320, height: 700 });
		await open(page, '/error-page?illustration=small-after&label=0&tape=0&named=0');
		await expectNoHorizontalOverflow(page);
		await expect(page.getByTestId('hazard-tape')).toHaveCount(0);
		await expect(page.getByTestId('error-label')).toHaveCount(0);
		const heading = page.getByRole('heading', { level: 1, name: words.heading });
		await expect(heading).toBeVisible();
		// Without suggestionsLabel the navigation is still named, by the heading.
		await expect(page.getByRole('navigation', { name: words.heading })).toBeVisible();
		const [headingBox, contentBox] = [await box(heading), await box(page.locator('.error-page-content'))];
		expect(headingBox.y).toBeLessThan(contentBox.y + contentBox.height / 2);
		await expectAccessible(page);
	});
});

test.describe('masthead compositions', { tag: '@theme' }, () => {
	test('with and without a kicker, long French and Spanish wrap from 320 to 1920 px', async ({ page }) => {
		for (const width of WIDTHS) {
			await page.setViewportSize({ width, height: 900 });
			await open(page, '/masthead');
			await expectNoHorizontalOverflow(page);

			for (const set of ['today', 'task', 'undotted'] as const) {
				for (const entry of mastheads) {
					const sample = page.locator(`[data-masthead-set="${set}"] [data-masthead-lang="${entry.lang}"]`);
					const head = sample.locator('.masthead-head');
					const heading = sample.getByRole('heading', { level: 3 });
					await expect(heading).toContainText(entry.heading);
					await expectUnclipped(heading);
					const { width: headWidth } = await box(head);
					expect(headWidth).toBeLessThanOrEqual(width);

					const kicker = sample.getByText(entry.kicker, { exact: true });
					const dot = sample.locator('[data-slot="section-heading-dot"]');
					const tape = sample.locator('[data-slot="separator"]');
					if (set === 'today') {
						await expect(kicker).toBeVisible();
						expect((await box(kicker)).y).toBeLessThan((await box(heading)).y);
						await expect(dot).toHaveCount(1);
						await expect(tape).toHaveCount(1);
					} else {
						await expect(kicker).toHaveCount(0);
						await expect(tape).toHaveCount(0);
						expect(await head.evaluate((element) => element.firstElementChild?.querySelector('h3') !== null)).toBe(true);
						await expect(dot).toHaveCount(set === 'task' ? 1 : 0);
					}
				}
			}
		}
	});
});
