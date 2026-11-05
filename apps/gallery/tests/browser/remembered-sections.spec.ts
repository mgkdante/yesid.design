import { expect, test, type Page } from '@playwright/test';

const key = 'sections-choice';
const trigger = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const ready = (page: Page) => expect(page.locator('html')).toHaveAttribute('data-gallery-ready', 'true');
const stored = (page: Page) => page.evaluate(key => localStorage.getItem(key), key);

test('first visit collapses content with the orange glow, keeps exclusions open, and remembers only bulk choices', async ({ page }) => {
	await page.goto('/sections'); await ready(page);
	await expect(trigger(page, 'Chart')).toHaveAttribute('aria-expanded', 'false');
	await expect(trigger(page, 'Contents')).toHaveAttribute('aria-expanded', 'true');
	await expect(trigger(page, 'Map tools')).toHaveAttribute('aria-expanded', 'true');
	await expect(trigger(page, 'Filters')).toHaveAttribute('aria-expanded', 'true');
	const bulk = page.getByTestId('sections-toggle');
	await expect(bulk).toHaveAttribute('data-collapsed', 'true');
	const activeColor = await bulk.evaluate(node => getComputedStyle(node).color);
	expect(await bulk.evaluate(node => getComputedStyle(node.querySelector('.core')!).filter)).not.toBe('none');
	expect(await stored(page)).toBeNull();
	await trigger(page, 'Chart').click();
	expect(await stored(page)).toBeNull();
	await bulk.click(); // Mixed state chooses Collapse all.
	expect(await stored(page)).toBe('collapsed');
	await bulk.click();
	expect(await stored(page)).toBe('expanded');
	await expect(bulk).toHaveAttribute('data-collapsed', 'false');
	expect(await bulk.evaluate(node => getComputedStyle(node).color)).not.toBe(activeColor);
	expect(await bulk.evaluate(node => getComputedStyle(node.querySelector('.core')!).filter)).toBe('none');
	await page.reload(); await ready(page);
	await expect(trigger(page, 'Chart')).toHaveAttribute('aria-expanded', 'true');
	await page.getByRole('link', { name: 'Next page', exact: true }).click();
	await expect(page).toHaveURL(/\/sections\/next$/);
	await expect(trigger(page, 'Chart')).toHaveAttribute('aria-expanded', 'true');
	await page.getByTestId('sections-toggle').click();
	await page.getByRole('link', { name: 'First page', exact: true }).click();
	await expect(trigger(page, 'Chart')).toHaveAttribute('aria-expanded', 'false');
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

test('malformed choice and historical keys use the collapsed first-visit default', async ({ page }) => {
	await page.addInitScript(() => {
		localStorage.setItem('sections-choice', '{bad'); localStorage.setItem('quiet-mode', 'false');
		sessionStorage.setItem('persisted:chart', 'true');
	});
	await page.goto('/sections'); await ready(page);
	await expect(trigger(page, 'Chart')).toHaveAttribute('aria-expanded', 'false');
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
	await page.goto('/sections#media-heading'); await ready(page);
	await expect(trigger(page, 'Live table')).toHaveAttribute('aria-expanded', 'true');
	await expect(trigger(page, 'Nested media')).toHaveAttribute('aria-expanded', 'true');
	await expect(trigger(page, 'Chart')).toHaveAttribute('aria-expanded', 'false');
	await trigger(page, 'Chart target').click();
	await expect(trigger(page, 'Chart')).toHaveAttribute('aria-expanded', 'true');
	expect(await stored(page)).toBeNull();
});

test('responsive chart, table, live content and media measure when opened under both motion policies', async ({ page }) => {
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
		if (initial === 'expanded' || initial === 'blocked') expect((await body.boundingBox())!.height).toBeGreaterThan(0);
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
