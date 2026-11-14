import { expect, test, type Page } from '@playwright/test';
import { expectAccessible } from '@yesid/config/playwright';

const WIDTHS = [320, 390, 768, 1024, 1440, 1920];
const THEMES = ['dark', 'light'] as const;
const READING_CASES = ['essay-en', 'essay-fr', 'essay-es', 'long-fr', 'long-es', 'case-study'];
const READING_DETAIL = '/detail-frame?presentation=reading&layout=measured&rule=line&opening=1';

async function open(page: Page, path: string): Promise<void> {
	await page.goto(path);
	await expect(page.locator('html')).toHaveAttribute('data-gallery-ready', 'true');
	await page.evaluate(() => document.fonts.ready);
}

async function setTheme(page: Page, theme: (typeof THEMES)[number]): Promise<void> {
	await page.evaluate((value) => (document.documentElement.dataset.theme = value), theme);
}

async function resize(page: Page, width: number, height = 900): Promise<void> {
	await page.setViewportSize({ width, height });
	await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
}

/** Every width from phone to wide desktop, in both themes, runs once, at the desktop project. */
function sweep(name: string): void {
	test.skip(name !== 'desktop', 'the sweep sets its own widths');
	test.setTimeout(120_000);
}

test('the highlight accents whole words only', async ({ page }) => {
	await open(page, '/article-header');
	const title = (id: string) => page.getByTestId(`case-${id}`).locator('h1');

	// The essay's first tag, "ai", sits inside "brain" before the word "AI".
	await expect(title('brain-word')).toHaveText('One brain for four AI tools: T3 Code and Notion');
	await expect(title('brain-word').locator('span')).toHaveText(['AI']);
	// "AI" only inside "BRAIN": no part of a word is accented.
	await expect(title('brain-inside')).toHaveText('One BRAIN for four tools');
	await expect(title('brain-inside').locator('span')).toHaveCount(0);
	const colours = await title('brain-word').evaluate((heading) => ({
		heading: getComputedStyle(heading).color,
		accent: getComputedStyle(heading.querySelector('span')!).color,
	}));
	expect(colours.accent).not.toBe(colours.heading);
});

test('long titles and dated meta wrap inside the header in both presentations', async ({ page }, { project }) => {
	sweep(project.name);
	await open(page, '/article-header');
	for (const width of [320, 390]) {
		await resize(page, width);
		for (const id of ['long-fr-expressive', 'long-es-expressive', 'long-fr', 'long-es']) {
			const fit = await page.getByTestId(`case-${id}`).evaluate((section) => {
				const header = section.querySelector('[data-slot="article-header"]')!;
				const heading = header.querySelector('h1')!;
				const parts = [heading, ...header.querySelectorAll('[data-pending] > *, [data-pending] time')];
				return {
					overflow: heading.scrollWidth - heading.clientWidth,
					right: Math.max(...parts.map((part) => part.getBoundingClientRect().right)),
				};
			});
			expect(fit.overflow, `${id} at ${width}px`).toBeLessThanOrEqual(1);
			expect(fit.right, `${id} at ${width}px`).toBeLessThanOrEqual(width);
		}
	}
});

test('a wrapped expressive meta pair keeps its 0.5em gap between rows', async ({ page }, { project }) => {
	sweep(project.name);
	await open(page, '/article-header?only=long-es-expressive');
	await resize(page, 320);
	const pair = await page.locator('[data-slot="article-header"] .header__meta-pair').first().evaluate((node) => {
		const [label, value] = [...node.children].map((child) => child.getBoundingClientRect());
		const style = getComputedStyle(node);
		return {
			fontSize: parseFloat(style.fontSize),
			rowGap: parseFloat(style.rowGap),
			columnGap: parseFloat(style.columnGap),
			wrapped: value.top >= label.bottom,
			space: value.top - label.bottom,
		};
	});
	expect(pair.wrapped).toBe(true);
	expect(pair.rowGap).toBeCloseTo(pair.fontSize / 2, 1);
	expect(pair.columnGap).toBeCloseTo(pair.fontSize / 2, 1);
	expect(pair.space).toBeGreaterThanOrEqual(pair.rowGap - 0.5);
});

test('--article-title-size sets the title size in both presentations', async ({ page }) => {
	await open(page, '/article-header');
	for (const id of ['brain-word', 'essay-en']) {
		const size = await page.getByTestId(`case-${id}`).evaluate((section) => {
			section.style.setProperty('--article-title-size', '3.25rem');
			return getComputedStyle(section.querySelector('h1')!).fontSize;
		});
		expect(size, id).toBe('52px');
	}
});

test('the reading header is calm at every width, in both themes and three languages', async ({ page }, { project }) => {
	sweep(project.name);
	await open(page, '/article-header');
	for (const width of WIDTHS) {
		await resize(page, width);
		for (const theme of THEMES) {
			await setTheme(page, theme);
			for (const id of READING_CASES) {
				const facts = await page.getByTestId(`case-${id}`).evaluate((section) => {
					const header = section.querySelector<HTMLElement>('[data-slot="article-header"]')!;
					const heading = header.querySelector('h1')!;
					const meta = header.querySelector<HTMLElement>('[data-pending]');
					const style = (node: Element) => getComputedStyle(node);
					const metaSizes = meta ? [...meta.querySelectorAll('span, time')].map((node) => parseFloat(style(node).fontSize)) : [];
					const box = heading.getBoundingClientRect();
					return {
						presentation: header.dataset.presentation,
						decorations: header.querySelectorAll('canvas, [aria-hidden="true"]:not(.header__meta-sep)').length,
						highlights: heading.querySelectorAll('span').length,
						beforeTitle: heading.previousElementSibling?.localName,
						category: meta?.firstElementChild?.textContent?.trim(),
						categoryBeforeTitle: heading.compareDocumentPosition(meta!) === Node.DOCUMENT_POSITION_FOLLOWING,
						smallestMeta: Math.min(...metaSizes),
						transform: style(heading).textTransform,
						align: style(heading).textAlign,
						cursor: style(header).cursor,
						background: style(header).backgroundColor,
						titleSize: parseFloat(style(heading).fontSize),
						overflow: heading.scrollWidth - heading.clientWidth,
						right: box.right,
						pageOverflow: document.documentElement.scrollWidth - window.innerWidth,
					};
				});
				const where = `${id} at ${width}px, ${theme}`;
				expect(facts.presentation, where).toBe('reading');
				expect(facts.decorations, where).toBe(0);
				expect(facts.highlights, where).toBe(0);
				expect(facts.beforeTitle, where).toBe('a');
				expect(facts.categoryBeforeTitle, where).toBe(true);
				expect(facts.category, where).toBeTruthy();
				expect(facts.smallestMeta, where).toBeGreaterThanOrEqual(12);
				expect(facts.transform, where).toBe('none');
				expect(['left', 'start'], where).toContain(facts.align);
				expect(facts.cursor, where).toBe('auto');
				expect(facts.background, where).toBe('rgba(0, 0, 0, 0)');
				expect(facts.titleSize, where).toBeGreaterThanOrEqual(24);
				expect(facts.overflow, where).toBeLessThanOrEqual(1);
				expect(facts.right, where).toBeLessThanOrEqual(width);
				expect(facts.pageOverflow, where).toBeLessThanOrEqual(0);
			}
		}
	}
});

test('a wrapped reading meta row never starts a line with a separator', async ({ page }, { project }) => {
	sweep(project.name);
	await open(page, '/article-header?only=long-es');
	await resize(page, 320);
	const lines = await page.locator('[data-slot="article-header"] [data-pending]').evaluate((row) => {
		const start = row.parentElement!.querySelector('h1')!.getBoundingClientRect().left;
		const visibleSeps = [...row.querySelectorAll('.header__meta-sep')].filter(
			(sep) => sep.getBoundingClientRect().right > start,
		);
		const tops = new Set([...row.children].map((item) => Math.round(item.getBoundingClientRect().top)));
		return { lines: tops.size, separators: row.querySelectorAll('.header__meta-sep').length, visible: visibleSeps.length };
	});
	expect(lines.lines).toBeGreaterThan(1);
	expect(lines.visible).toBe(lines.separators - (lines.lines - 1));
});

test('an opening in the DetailFrame header precedes both rails and lines up with the center column', async ({ page }, { project }) => {
	sweep(project.name);
	await open(page, READING_DETAIL);
	const order = await page.evaluate(() => {
		const opening = document.querySelector('[data-testid="article-opening"]')!;
		const rails = [...document.querySelectorAll('[data-slot="detail-shell-left"], [data-slot="detail-shell-right"]')];
		return rails.map((rail) => opening.compareDocumentPosition(rail) === Node.DOCUMENT_POSITION_FOLLOWING);
	});
	expect(order).toEqual([true, true]);
	await expect(page.locator('[data-slot="separator"]')).toHaveCount(0);
	await expect(page.locator('[data-slot="detail-shell-line"]')).toHaveCount(1);

	for (const width of [1024, 1100, 1280, 1440, 1920]) {
		await resize(page, width);
		const lefts = await page.evaluate(() => {
			const left = (selector: string) => document.querySelector(selector)!.getBoundingClientRect().left;
			return {
				center: left('[data-slot="detail-shell-center"]'),
				title: left('[data-slot="article-header"] h1'),
				back: left('[data-slot="article-header"] a'),
				opening: left('[data-testid="article-opening"] p'),
			};
		});
		for (const edge of ['title', 'back', 'opening'] as const) {
			expect(Math.abs(lefts[edge] - lefts.center), `${edge} at ${width}px`).toBeLessThanOrEqual(1);
		}
	}

	// On a phone the opening is on the first screen, before the contents pill opens anything.
	await resize(page, 390, 844);
	for (const lang of ['', '&lang=fr', '&lang=es']) {
		await open(page, `${READING_DETAIL}${lang}`);
		const top = await page.getByTestId('article-opening').evaluate((node) => node.getBoundingClientRect().top);
		expect(top, `opening ${lang || 'en'}`).toBeLessThan(844);
	}
});

test('the expressive DetailFrame keeps its hazard rule by default', async ({ page }) => {
	await open(page, '/detail-frame');
	await expect(page.locator('[data-slot="article-header"]')).toHaveAttribute('data-presentation', 'expressive');
	await expect(page.locator('[data-slot="separator"]')).toHaveCount(1);
	await expect(page.locator('[data-slot="detail-shell-line"]')).toHaveCount(0);
});

test('the reading ListingFrame shows its title horizontally at every width', async ({ page }, { project }) => {
	sweep(project.name);
	for (const lang of ['', '&lang=es']) {
		await open(page, `/listing-frame?presentation=reading${lang}`);
		for (const width of WIDTHS) {
			await resize(page, width);
			const facts = await page.evaluate(() => {
				const heading = document.querySelector('[data-slot="listing-frame"] h1')!;
				const box = heading.getBoundingClientRect();
				const search = document.querySelector('[data-slot="listing-filter-search"], [data-slot="listing-filter-toggle"]')!;
				return {
					width: box.width,
					height: box.height,
					mode: getComputedStyle(heading).writingMode,
					overflow: heading.scrollWidth - heading.clientWidth,
					headingLeft: box.left,
					searchLeft: search.getBoundingClientRect().left,
					edge: document.querySelectorAll('[data-slot="listing-edge-title"], [data-slot="listing-accent-rail"], [data-slot="blueprint-listing-art"]').length,
					pageOverflow: document.documentElement.scrollWidth - window.innerWidth,
				};
			});
			const where = `${lang || 'fr'} at ${width}px`;
			expect(facts.width, where).toBeGreaterThan(100);
			expect(facts.height, where).toBeGreaterThan(20);
			expect(facts.mode, where).toBe('horizontal-tb');
			expect(facts.overflow, where).toBeLessThanOrEqual(1);
			expect(facts.edge, where).toBe(0);
			expect(Math.abs(facts.headingLeft - facts.searchLeft), where).toBeLessThanOrEqual(1);
			expect(facts.pageOverflow, where).toBeLessThanOrEqual(0);
		}
	}
});

test('reading presentations pass the accessibility check @theme', async ({ page }) => {
	test.setTimeout(90_000);
	for (const path of ['/article-header', READING_DETAIL, `${READING_DETAIL}&lang=es`, '/listing-frame?presentation=reading&lang=es']) {
		await open(page, path);
		await expectAccessible(page);
	}
});
