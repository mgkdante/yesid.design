import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { injectThemeBoot, themeBootScript } from '../../../../packages/ui/src/head/boot.js';

const key = 'sections-choice';
const trigger = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const ready = (page: Page) => expect(page.locator('html')).toHaveAttribute('data-gallery-ready', 'true');
const stored = (page: Page) => page.evaluate(key => localStorage.getItem(key), key);
// Seeds a remembered Collapse all for tests of collapsed mechanics; a later bulk choice still wins.
const startCollapsed = (page: Page) => page.addInitScript(key => {
	if (localStorage.getItem(key) === null) localStorage.setItem(key, 'collapsed');
}, key);

test('a parser stall leaves already delivered content visible', async ({ page }) => {
	await startCollapsed(page);
	let release!: () => void;
	const gate = new Promise<void>(resolve => { release = resolve; });
	await page.route('**/sections', async route => {
		const response = await route.fetch();
		const html = await response.text();
		const card = html.lastIndexOf('<div', html.indexOf('data-toc="live"'));
		expect(card).toBeGreaterThan(0);
		await route.fulfill({ response, body: html.slice(0, card) + '<script src="/parser-hold.js"></script>' + html.slice(card) });
	});
	await page.route('**/parser-hold.js', async route => { await gate; await route.fulfill({ body: 'document.currentScript.remove();', contentType: 'text/javascript' }); });
	try {
		await page.goto('/sections', { waitUntil: 'commit' });
		await page.waitForFunction(() => [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')].every(link => link.sheet));
		await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
		await expect(page.getByRole('heading', { name: 'Remembered sections', exact: true })).toBeVisible();
		await expect.poll(() => page.evaluate(() => performance.getEntriesByType('paint').some(entry => entry.name === 'first-contentful-paint'))).toBe(true);
		expect((await page.locator('[data-toc="chart"] > [data-slot="collapsible"] > .section-body').boundingBox())!.height).toBe(0);
		expect(await page.evaluate(() => document.readyState)).toBe('loading');
	} finally { release(); }
	await ready(page);
	await expect(trigger(page, 'Chart')).toHaveAttribute('aria-expanded', 'false');
});

for (const comment of ['<!-->', '<!--->']) {
	test(`the ${comment} comment keeps collapsed geometry during a parser stall`, async ({ page }) => {
		await startCollapsed(page);
		const errors: string[] = [];
		page.on('pageerror', error => errors.push(error.message));
		page.on('console', message => { if (/hydration/i.test(message.text())) errors.push(message.text()); });
		let release!: () => void;
		const gate = new Promise<void>(resolve => { release = resolve; });
		await page.route('**/sections', async route => {
			const response = await route.fetch();
			let html = await response.text();
			const boot = `<script data-sections-available>${themeBootScript}</script>`;
			expect(html).toContain(boot);
			html = html.replace(boot, '%yesid.themeBoot%');
			const control = html.lastIndexOf('<div', html.indexOf('data-sections-control'));
			expect(control).toBeGreaterThan(0);
			html = html.slice(0, control) + comment + html.slice(control);
			const card = html.lastIndexOf('<div', html.indexOf('data-toc="live"'));
			html = html.slice(0, card) + '<script src="/parser-hold.js"></script>' + html.slice(card);
			await route.fulfill({ response, body: injectThemeBoot(html) });
		});
		await page.route('**/parser-hold.js', async route => {
			await gate;
			// The probe removes its added nodes before Svelte hydrates the original server tree.
			await route.fulfill({ body: `const comment = document.querySelector('[data-sections-control]').previousSibling; if (comment?.nodeType === 8) comment.remove(); document.currentScript.remove();`, contentType: 'text/javascript' });
		});
		try {
			await page.goto('/sections', { waitUntil: 'commit' });
			await page.waitForFunction(() => [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')].every(link => link.sheet));
			await page.evaluate(() => document.fonts.ready);
			await expect(page.getByTestId('sections-toggle')).toBeVisible();
			expect((await page.locator('[data-toc="chart"] > [data-slot="collapsible"] > .section-body').boundingBox())!.height).toBe(0);
			expect(await page.evaluate(() => document.readyState)).toBe('loading');
		} finally { release(); }
		await ready(page);
		await expect(trigger(page, 'Chart')).toHaveAttribute('aria-expanded', 'false');
		expect(errors).toEqual([]);
	});
}

test('a blocked third-party script preserves collapsed sections through hydration', async ({ page }) => {
	await startCollapsed(page);
	let release!: () => void;
	const gate = new Promise<void>(resolve => { release = resolve; });
	await page.route('**/_app/**/*.js', async route => { await gate; await route.continue(); });
	await page.route('https://metrics.example/beacon.js', route => route.abort('blockedbyclient'));
	try {
		await page.goto('/sections', { waitUntil: 'commit' });
		await expect(page.locator('[data-toc="chart"]')).toHaveAttribute('data-section-initial', 'closed');
		await page.evaluate(() => new Promise<void>(resolve => {
			const script = document.createElement('script');
			script.src = 'https://metrics.example/beacon.js';
			script.onerror = () => resolve();
			document.head.append(script);
		}));
		await expect(trigger(page, 'Chart')).toHaveAttribute('aria-expanded', 'false');
		await expect(page.locator('[data-section-fallback]')).toHaveCount(0);
	} finally { release(); }
	await ready(page);
	await expect(trigger(page, 'Chart')).toHaveAttribute('aria-expanded', 'false');
	await expect(trigger(page, 'Live table')).toHaveAttribute('aria-expanded', 'false');
	expect(await stored(page)).toBe('collapsed');
});

test('a failed app bundle leaves all section content readable', async ({ page }) => {
	await startCollapsed(page);
	await page.route('**/_app/**/*.js', route => route.abort());
	await page.goto('/sections');
	await expect.poll(() => page.locator('[data-toc="chart"] > [data-slot="collapsible"] > .section-body').evaluate(node => node.getBoundingClientRect().height)).toBeGreaterThan(128);
	await expect(page.getByTestId('sections-controls')).toBeHidden();
});

test('a stalled app bundle has a bounded readable fallback that hydration preserves', async ({ page }) => {
	await startCollapsed(page);
	await page.clock.install();
	let release!: () => void;
	const gate = new Promise<void>(resolve => { release = resolve; });
	await page.route('**/_app/**/*.js', async route => { await gate; await route.continue(); });
	try {
		await page.goto('/sections', { waitUntil: 'commit' });
		await expect(page.locator('[data-toc="chart"]')).toHaveAttribute('data-section-initial', 'closed');
		await page.clock.fastForward(5_001);
		await expect.poll(() => page.locator('[data-toc="chart"] > [data-slot="collapsible"] > .section-body').evaluate(node => node.getBoundingClientRect().height)).toBeGreaterThan(128);
	} finally { release(); }
	await ready(page);
	await expect(trigger(page, 'Chart')).toHaveAttribute('aria-expanded', 'true');
});

test('startup recovery stays on its pending mounts and keeps the control space', async ({ page }) => {
	await page.clock.install();
	await page.addInitScript(() => localStorage.setItem('sections-choice', 'collapsed'));
	let release!: () => void;
	const gate = new Promise<void>(resolve => { release = resolve; });
	await page.route('**/_app/**/*.js', async route => { await gate; await route.continue(); });
	let before = 0;
	try {
		await page.goto('/sections', { waitUntil: 'commit' });
		await expect(page.locator('[data-toc="chart"]')).toHaveAttribute('data-section-initial', 'closed');
		await page.waitForFunction(() => [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')].every(link => link.sheet));
		await page.evaluate(() => document.fonts.ready);
		before = await page.locator('[data-toc="chart"]').evaluate(node => node.getBoundingClientRect().top + scrollY);
		await page.clock.fastForward(6_000);
		expect(await page.locator('[data-toc="chart"]').evaluate(node => node.getBoundingClientRect().top + scrollY)).toBe(before);
		expect(await page.getByTestId('sections-controls').evaluate(node => node.getBoundingClientRect().height)).toBe(44);
	} finally { release(); }
	await ready(page);
	expect(await page.locator('[data-toc="chart"]').evaluate(node => node.getBoundingClientRect().top + scrollY)).toBe(before);
	await page.getByRole('link', { name: 'Next page', exact: true }).click();
	await expect(trigger(page, 'Chart')).toHaveAttribute('aria-expanded', 'false');
	expect(await stored(page)).toBe('collapsed');
});

test('a widget error after hydration does not change future mount preferences', async ({ page }) => {
	await startCollapsed(page);
	await page.goto('/sections'); await ready(page);
	const error = page.waitForEvent('pageerror');
	await page.evaluate(() => { setTimeout(() => { throw new Error('Unrelated widget failure'); }, 0); });
	await error;
	await page.getByRole('link', { name: 'Next page', exact: true }).click();
	await expect(trigger(page, 'Chart')).toHaveAttribute('aria-expanded', 'false');
});

test('pending disclosure and bulk semantics match their visual state', async ({ page }) => {
	await startCollapsed(page);
	let release!: () => void;
	const gate = new Promise<void>(resolve => { release = resolve; });
	await page.route('**/_app/**/*.js', async route => { await gate; await route.continue(); });
	try {
		await page.goto('/sections', { waitUntil: 'commit' });
		await expect(page.locator('[data-toc="chart"]')).toHaveAttribute('data-section-initial', 'closed');
		await expect(trigger(page, 'Chart')).toHaveAttribute('aria-expanded', 'false');
		const body = page.locator('[data-toc="chart"] > [data-slot="collapsible"] > .section-body');
		await expect(body).toHaveAttribute('inert', '');
		await expect(body).toHaveAttribute('aria-hidden', 'true');
		await expect(page.getByTestId('sections-toggle')).toHaveAccessibleName('Expand all');
	} finally { release(); }
	await ready(page);
});

test('a boot exception leaves all section content readable', async ({ page }) => {
	await page.route('**/sections', async route => {
		const response = await route.fetch();
		await route.fulfill({ response, body: (await response.text()).replace('const prepare = () => {', 'const prepare = () => { throw new Error("Injected boot failure");') });
	});
	await page.goto('/sections'); await ready(page);
	await expect(trigger(page, 'Chart')).toHaveAttribute('aria-expanded', 'true');
	await expect(page.locator('body')).toBeVisible();
});

test('a choice made in another tab applies on the next client page without changing the current view', async ({ page, context }) => {
	await page.goto('/sections'); await ready(page);
	const second = await context.newPage();
	try {
		await second.goto('/sections'); await ready(second);
		await second.getByTestId('sections-toggle').click();
		await expect.poll(() => stored(page)).toBe('collapsed');
		await expect(trigger(page, 'Chart')).toHaveAttribute('aria-expanded', 'true');
		await page.getByRole('link', { name: 'Next page', exact: true }).click();
		await expect(trigger(page, 'Chart')).toHaveAttribute('aria-expanded', 'false');
	} finally { await second.close(); }
});

test('late content applies the remembered choice when the bulk control becomes available', async ({ page }) => {
	await startCollapsed(page);
	await page.goto('/sections/late'); await ready(page);
	await expect(trigger(page, 'Chart')).toHaveAttribute('aria-expanded', 'true');
	await expect(page.getByTestId('sections-controls')).toBeHidden();
	await page.getByRole('button', { name: 'Load sections' }).click();
	await expect(trigger(page, 'Chart')).toHaveAttribute('aria-expanded', 'false');
	await expect(trigger(page, 'Live table')).toHaveAttribute('aria-expanded', 'false');
	expect(await stored(page)).toBe('collapsed');
});

test('late content preserves a deliberate individual choice', async ({ page }) => {
	await startCollapsed(page);
	await page.goto('/sections/late'); await ready(page);
	await trigger(page, 'Chart').click();
	await trigger(page, 'Chart').click();
	await page.getByRole('button', { name: 'Load sections' }).click();
	await expect(trigger(page, 'Chart')).toHaveAttribute('aria-expanded', 'true');
	await expect(trigger(page, 'Live table')).toHaveAttribute('aria-expanded', 'false');
	expect(await stored(page)).toBe('collapsed');
});

test('first visit opens content with a neutral control, keeps exclusions open, and remembers only bulk choices', async ({ page }) => {
	await page.goto('/sections'); await ready(page);
	await expect(trigger(page, 'Chart')).toHaveAttribute('aria-expanded', 'true');
	await expect(trigger(page, 'Live table')).toHaveAttribute('aria-expanded', 'true');
	await expect(trigger(page, 'Contents')).toHaveAttribute('aria-expanded', 'true');
	await expect(trigger(page, 'Map tools')).toHaveAttribute('aria-expanded', 'true');
	await expect(trigger(page, 'Filters')).toHaveAttribute('aria-expanded', 'true');
	const bulk = page.getByTestId('sections-toggle');
	await expect(bulk).toHaveAccessibleName('Collapse all');
	await expect(bulk).toHaveAttribute('data-collapsed', 'false');
	const neutralColor = await bulk.evaluate(node => getComputedStyle(node).color);
	expect(await bulk.evaluate(node => getComputedStyle(node.querySelector('.core')!).filter)).toBe('none');
	expect(await stored(page)).toBeNull();
	await trigger(page, 'Chart').click();
	expect(await stored(page)).toBeNull();
	await bulk.click(); // Mixed state chooses Collapse all.
	expect(await stored(page)).toBe('collapsed');
	await expect(bulk).toHaveAttribute('data-collapsed', 'true');
	expect(await bulk.evaluate(node => getComputedStyle(node).color)).not.toBe(neutralColor);
	expect(await bulk.evaluate(node => getComputedStyle(node.querySelector('.core')!).filter)).not.toBe('none');
	await page.reload(); await ready(page);
	await expect(trigger(page, 'Chart')).toHaveAttribute('aria-expanded', 'false');
	await page.getByRole('link', { name: 'Next page', exact: true }).click();
	await expect(page).toHaveURL(/\/sections\/next$/);
	await expect(trigger(page, 'Chart')).toHaveAttribute('aria-expanded', 'false');
	await page.getByTestId('sections-toggle').click();
	expect(await stored(page)).toBe('expanded');
	await page.getByRole('link', { name: 'First page', exact: true }).click();
	await expect(trigger(page, 'Chart')).toHaveAttribute('aria-expanded', 'true');
});

test('a new context restores the origin choice and a lone section stays open', async ({ browser, baseURL }) => {
	const context = await browser.newContext({ baseURL, storageState: { cookies: [], origins: [{ origin: baseURL!, localStorage: [{ name: key, value: 'expanded' }] }] } });
	try {
		const page = await context.newPage();
		await page.goto('/sections'); await ready(page);
		await expect(trigger(page, 'Chart')).toHaveAttribute('aria-expanded', 'true');
		await page.getByTestId('sections-toggle').click();
		await page.goto('/sections/single'); await ready(page);
		await expect(page.getByTestId('sections-controls')).toBeHidden();
		await expect(trigger(page, 'Chart')).toHaveAttribute('aria-expanded', 'true');
	} finally { await context.close(); }
});

test('blocked storage uses declared defaults and still allows bulk interaction', async ({ page }) => {
	const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
	await page.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } }); });
	await page.goto('/sections'); await ready(page);
	await expect(trigger(page, 'Chart')).toHaveAttribute('aria-expanded', 'true');
	await page.getByTestId('sections-toggle').click();
	await expect(trigger(page, 'Chart')).toHaveAttribute('aria-expanded', 'false');
	await page.reload(); await ready(page);
	await expect(trigger(page, 'Chart')).toHaveAttribute('aria-expanded', 'true');
	expect(errors).toEqual([]);
});

test('malformed choice and historical keys use the expanded first-visit default', async ({ page }) => {
	await page.addInitScript(() => {
		localStorage.setItem('sections-choice', '{bad'); localStorage.setItem('quiet-mode', 'true');
		sessionStorage.setItem('persisted:chart', 'false');
	});
	await page.goto('/sections'); await ready(page);
	await expect(trigger(page, 'Chart')).toHaveAttribute('aria-expanded', 'true');
	expect(await stored(page)).toBe('{bad');
});

test('SSR and JavaScript-disabled reading preserve all content and head metadata', async ({ browser, request, baseURL }) => {
	const html = await (await request.get('/sections')).text();
	expect(html).toContain('Searchable chart methodology unique phrase');
	expect(html).toContain('Live source');
	expect(html).toContain('og:title');
	const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
	try {
		const page = await context.newPage(); await page.goto('/sections');
		await expect(page.getByText('Searchable chart methodology unique phrase')).toBeVisible();
		await expect(page.getByText('Live source')).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Media target' })).toBeVisible();
		await expect(page.getByTestId('sections-controls')).toBeHidden();
		expect(await page.locator('[data-section-bulk] [inert]').count()).toBe(0);
	} finally { await context.close(); }
});

test('direct fragments and TOC jumps open targets and enclosing sections without changing the choice', async ({ page }) => {
	await startCollapsed(page);
	await page.goto('/sections#media-heading'); await ready(page);
	await expect(trigger(page, 'Live table')).toHaveAttribute('aria-expanded', 'true');
	await expect(trigger(page, 'Nested media')).toHaveAttribute('aria-expanded', 'true');
	await expect(trigger(page, 'Chart')).toHaveAttribute('aria-expanded', 'false');
	await trigger(page, 'Chart target').click();
	await expect(trigger(page, 'Chart')).toHaveAttribute('aria-expanded', 'true');
	expect(await stored(page)).toBe('collapsed');
});

test('responsive chart, table, live content and media measure when opened under both motion policies', async ({ page }) => {
	await startCollapsed(page);
	for (const reducedMotion of ['reduce', 'no-preference'] as const) {
		await page.emulateMedia({ reducedMotion });
		await page.goto('/sections'); await ready(page);
		await trigger(page, 'Chart').click();
		await expect.poll(() => page.locator('[data-toc="chart"] > [data-slot="collapsible"] > .section-body').evaluate(node => node.getBoundingClientRect().height)).toBeGreaterThan(128);
		await expect(page.getByTestId('chart')).toBeVisible();
		const box = await page.getByTestId('chart').boundingBox();
		expect(box!.height).toBe(128);
		await expect.poll(async () => Number(await page.getByTestId('chart-width').textContent())).toBe(Math.round(box!.width));
		await expect.poll(async () => Number(await page.getByTestId('live-updates').textContent())).toBeGreaterThan(0);
		const closedUpdates = Number(await page.getByTestId('live-updates').textContent());
		await trigger(page, 'Live table').click();
		await expect(page.getByRole('table', { name: 'Live measurements' })).toBeVisible();
		await expect.poll(async () => Number(await page.getByTestId('live-updates').textContent())).toBeGreaterThan(closedUpdates);
		await trigger(page, 'Nested media').click();
		expect((await page.getByLabel('Responsive media').boundingBox())!.width).toBeGreaterThan(100);
	}
});

for (const initial of ['first-visit', 'collapsed', 'expanded', 'blocked', 'fragment'] as const) {
	test(`pre-paint ${initial} geometry is stable through delayed hydration, with no hydration errors or layout shift`, async ({ page }) => {
		if (initial === 'collapsed' || initial === 'expanded' || initial === 'fragment') await page.addInitScript(value => localStorage.setItem('sections-choice', value), initial === 'fragment' ? 'collapsed' : initial);
		if (initial === 'blocked') await page.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } }); });
		const errors: string[] = [];
		page.on('pageerror', error => errors.push(error.message));
		page.on('console', message => { if (/hydration/i.test(message.text())) errors.push(message.text()); });
		await page.addInitScript(() => {
			(window as unknown as { shifts: unknown[] }).shifts = [];
			new PerformanceObserver(list => {
				type Shift = PerformanceEntry & {
					hadRecentInput: boolean;
					value: number;
					sources: { node: Node; previousRect: DOMRect; currentRect: DOMRect }[];
				};
				for (const entry of list.getEntries() as Shift[]) {
					if (entry.hadRecentInput) continue;
					(window as unknown as { shifts: unknown[] }).shifts.push({
						value: entry.value,
						sources: entry.sources.map(source => ({
							node: source.node?.nodeName,
							previous: source.previousRect.toJSON(),
							current: source.currentRect.toJSON(),
						})),
					});
				}
			}).observe({ type: 'layout-shift', buffered: true });
		});
		let release!: () => void;
		const gate = new Promise<void>(resolve => { release = resolve; });
		await page.route('**/*.js', async route => { await gate; await route.continue(); });
		await page.goto(initial === 'fragment' ? '/sections#media-heading' : '/sections', { waitUntil: 'commit' });
		await expect(page.locator('html')).toHaveAttribute('data-sections-available', '');
		await expect(page.locator('html')).not.toHaveAttribute('data-sections-parsing', '');
		await page.evaluate(() => document.fonts.ready);
		const before = await page.getByTestId('after-sections').evaluate(node => node.getBoundingClientRect().top + scrollY);
		const buttonBefore = await page.getByTestId('sections-toggle').boundingBox();
		const body = page.locator('[data-section-bulk]').first().locator('.section-body').first();
		if (initial !== 'collapsed' && initial !== 'fragment') expect((await body.boundingBox())!.height).toBeGreaterThan(0);
		else expect((await body.boundingBox())!.height).toBe(0);
		await expect(page.getByTestId('sections-toggle')).toBeVisible();
		release(); await ready(page);
		const after = await page.getByTestId('after-sections').evaluate(node => node.getBoundingClientRect().top + scrollY);
		expect(after).toBe(before);
		expect((await page.getByTestId('sections-toggle').boundingBox())!.width).toBe(buttonBefore!.width);
		expect(await page.evaluate(() => (window as unknown as { shifts: unknown[] }).shifts)).toEqual([]);
		expect(errors).toEqual([]);
	});

}

test('find-in-page can search mounted prose after expansion and Back restores the reading position', async ({ page }) => {
	await startCollapsed(page);
	await page.goto('/sections'); await ready(page);
	const find = () => page.evaluate(() => {
		if (!('find' in window) || typeof window.find !== 'function') throw new Error('Chromium find-in-page API is required');
		return window.find('Searchable chart methodology unique phrase');
	});
	expect(await find()).toBe(false);
	await page.getByTestId('sections-toggle').click();
	expect(await find()).toBe(true);
	await page.getByTestId('after-sections').scrollIntoViewIfNeeded();
	const before = await page.evaluate(() => scrollY);
	await page.goto('/sections/next'); await ready(page);
	await page.goBack(); await ready(page);
	await expect(trigger(page, 'Chart')).toHaveAttribute('aria-expanded', 'true');
	await expect.poll(() => page.evaluate(() => scrollY)).toBe(before);
});

test.describe('reading-safe sections', () => {
	test.use({ hasTouch: true });
	for (const width of [390, 1440]) {
		for (const reducedMotion of ['reduce', 'no-preference'] as const) {
			test(`heading-only toggle and persistent summaries at ${width}px with ${reducedMotion} motion`, async ({ page }) => {
				await page.setViewportSize({ width, height: 900 });
				await page.emulateMedia({ reducedMotion });
				await page.goto('/sections'); await ready(page);
				const heading = trigger(page, 'Chart');
				const prose = page.getByText('Searchable chart methodology unique phrase');
				await prose.click();
				await expect(heading).toHaveAttribute('aria-expanded', 'true');
				await prose.tap();
				await expect(heading).toHaveAttribute('aria-expanded', 'true');
				await prose.evaluate(node => {
					const range = document.createRange();
					range.selectNodeContents(node);
					getSelection()?.addRange(range);
				});
				await prose.click();
				await expect(heading).toHaveAttribute('aria-expanded', 'true');
				await page.evaluate(() => getSelection()?.removeAllRanges());
				await trigger(page, 'Inspect chart').click();
				await expect(page.getByTestId('inspections')).toHaveText('1');
				await expect(heading).toHaveAttribute('aria-expanded', 'true');
				await heading.focus();
				await page.keyboard.press('Enter');
				await expect(heading).toHaveAttribute('aria-expanded', 'false');
				await page.keyboard.press('Space');
				await expect(heading).toHaveAttribute('aria-expanded', 'true');
				await page.getByTestId('sections-toggle').click();
				await page.reload(); await ready(page);
				await expect(heading).toHaveAttribute('aria-expanded', 'false');
				for (const id of ['chart-finding', 'french-finding']) {
					const finding = page.getByTestId(id);
					await expect(finding).toBeVisible();
					expect(await finding.evaluate(node => {
						const summary = node.closest('[data-slot="section-summary"]')!;
						return [...summary.querySelectorAll('*'), summary].every(element => {
							const style = getComputedStyle(element);
							return ['none', ''].includes(style.webkitLineClamp) && element.scrollHeight <= element.clientHeight + 1;
						});
					})).toBe(true);
				}
				await expect(heading).toHaveAccessibleName('Chart');
				await expect(heading).toHaveAccessibleDescription(/Most observations met the target/);
				const french = await page.getByTestId('french-finding').boundingBox();
				expect(french!.x + french!.width).toBeLessThanOrEqual(width);
				const closed = await new AxeBuilder({ page }).include('[data-toc="chart"]').include('[data-toc="live"]').analyze();
				expect(closed.violations).toEqual([]);
				await page.goto('/sections/next#media-heading'); await ready(page);
				await expect(trigger(page, 'Live table')).toHaveAttribute('aria-expanded', 'true');
				await expect(trigger(page, 'Nested media')).toHaveAttribute('aria-expanded', 'true');
				await heading.click();
				const opened = await new AxeBuilder({ page }).include('[data-toc="chart"]').include('[data-toc="live"]').analyze();
				expect(opened.violations).toEqual([]);
				expect(await stored(page)).toBe('collapsed');
			});
		}
	}
});


test.describe('summary and heading presentation', () => {
	for (const width of [390, 1440]) {
		for (const theme of ['dark', 'light']) {
			test(`heading target and summary spacing at ${width}px in ${theme}`, async ({ page }) => {
				await page.setViewportSize({ width, height: 900 });
				await page.addInitScript(value => localStorage.setItem('theme', value), theme);
				await page.goto('/sections'); await ready(page);
				await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
				await page.evaluate(() => document.fonts.ready);
				const heading = trigger(page, 'Chart');
				await expect(heading).toHaveAccessibleName('Chart');
				await expect(heading.locator('[data-slot="chevron-toggle"]')).toHaveAttribute('aria-hidden', 'true');
				const row = await heading.boundingBox();
				expect(row!.height).toBeGreaterThanOrEqual(44);
				const container = await heading.locator('..').boundingBox();
				expect(row!.width).toBe(container!.width);
				await heading.focus();
				await page.keyboard.press('Tab');
				await page.keyboard.press('Shift+Tab');
				await expect(heading).toBeFocused();
				expect(await heading.evaluate(node => node.matches(':focus-visible'))).toBe(true);
				await expect(heading).toHaveCSS('outline-style', 'solid');
				await expect(heading).toHaveCSS('outline-width', '2px');
				await expect(heading).toHaveCSS('outline-offset', '-4px');
				for (const anchor of ['chart', 'live']) {
					const card = page.locator(`[data-toc="${anchor}"]`);
					const summary = card.locator(':scope > [data-slot="collapsible"] > [data-slot="section-summary"]');
					const bounds = await summary.boundingBox();
					const inset = await card.evaluate(node => getComputedStyle(node.querySelector('.section-header')!).paddingLeft);
					await expect(summary).toHaveCSS('padding-left', inset);
					await expect(summary).toHaveCSS('padding-right', inset);
					const body = card.locator(':scope > [data-slot="collapsible"] > .section-body');
					const bodyBounds = await body.boundingBox();
					expect(bodyBounds!.y).toBeGreaterThanOrEqual(bounds!.y + bounds!.height);
					await card.locator('[data-section-trigger]').first().click();
					const closed = await summary.boundingBox();
					expect(closed!.width).toBe(bounds!.width);
					expect(closed!.height).toBe(bounds!.height);
					await expect(summary).toBeVisible();
				}
			});
		}
	}
});


test.describe('heading hover feedback', () => {
	for (const width of [390, 1440]) {
		for (const theme of ['dark', 'light']) {
			test(`only heading hover emphasizes the section at ${width}px in ${theme}`, async ({ page }) => {
				await page.setViewportSize({ width, height: 900 });
				await page.addInitScript(value => localStorage.setItem('theme', value), theme);
				await page.goto('/sections'); await ready(page);
				for (const [anchor, bodyText] of [['chart', 'Searchable chart methodology unique phrase'], ['live', 'Live source']]) {
					const card = page.locator(`[data-toc="${anchor}"]`);
					const title = card.locator('.section-title').first();
					await page.mouse.move(0, 0);
					const normalColor = await title.evaluate(node => getComputedStyle(node).color);
					const normalBorder = await card.evaluate(node => getComputedStyle(node).borderTopColor);
					const normalShadow = await card.evaluate(node => getComputedStyle(node).boxShadow);
					await card.getByText(bodyText, { exact: true }).hover();
					await title.evaluate(async node => {
						await Promise.all(node.getAnimations().map(animation => animation.finished));
					});
					await expect(title).toHaveCSS('color', normalColor);
					await expect(card).toHaveCSS('border-top-color', normalBorder);
					await expect(card).toHaveCSS('box-shadow', normalShadow);
					await card.locator('[data-section-trigger]').first().hover();
					await expect(title).not.toHaveCSS('color', normalColor);
					await expect(card).not.toHaveCSS('border-top-color', normalBorder);
					await expect(card).not.toHaveCSS('box-shadow', normalShadow);
					await card.getByText(bodyText, { exact: true }).hover();
					await title.evaluate(async node => {
						await Promise.all(node.getAnimations().map(animation => animation.finished));
					});
					await expect(title).toHaveCSS('color', normalColor);
					await expect(card).toHaveCSS('border-top-color', normalBorder);
					await expect(card).toHaveCSS('box-shadow', normalShadow);
				}
			});
		}
	}
});
