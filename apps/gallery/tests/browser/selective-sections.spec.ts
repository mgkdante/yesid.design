import { createHash } from 'node:crypto';
import { expect, test } from '@playwright/test';
import boot from '../../../../packages/ui/src/head/boot.json';

for (const choice of ['first', 'collapsed', 'expanded', 'blocked']) {
	for (const motion of ['reduce', 'no-preference'] as const) {
		test(`selective ${choice} before paint through hydration with CSP and ${motion} motion`, async ({ page }, testInfo) => {
			await page.emulateMedia({ reducedMotion: motion });
			await page.addInitScript(choice => {
				if (choice === 'collapsed' || choice === 'expanded') localStorage.setItem('sections-choice', choice);
				if (choice === 'blocked') Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } });
				const evidence = { violations: [] as string[], frames: [] as number[] };
				Object.assign(window, { selectiveEvidence: evidence });
				document.addEventListener('securitypolicyviolation', event => evidence.violations.push(event.violatedDirective));
				const sample = () => {
					const body = document.querySelector('[data-toc="technical"] > [data-slot="collapsible"] > .section-body');
					if (body) evidence.frames.push(body.getBoundingClientRect().height);
					requestAnimationFrame(sample);
				};
				requestAnimationFrame(sample);
			}, choice);
			await page.route('**/sections/selective', async route => {
				const response = await route.fetch();
				const html = await response.text();
				const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(match => match[1]).filter(Boolean);
				const hashes = scripts.map(script => `sha256-${createHash('sha256').update(script).digest('base64')}`);
				expect(hashes).toContain(boot.hash);
				await route.fulfill({ response, headers: { ...response.headers(), 'content-security-policy': `script-src 'self' ${hashes.map(hash => `'${hash}'`).join(' ')}` } });
			});
			let release!: () => void;
			const gate = new Promise<void>(resolve => { release = resolve; });
			await page.route('**/*.js', async route => { await gate; await route.continue(); });
			const technical = page.getByRole('button', { name: 'Technical details', exact: true });
			const finding = page.getByRole('button', { name: 'Service finding', exact: true });
			try {
				await page.goto('/sections/selective', { waitUntil: 'commit' });
				await expect.poll(() => page.evaluate(() => performance.getEntriesByType('paint').some(entry => entry.name === 'first-contentful-paint'))).toBe(true);
				await expect(technical).toHaveAttribute('aria-expanded', String(choice === 'expanded'));
				await expect(finding).toHaveAttribute('aria-expanded', String(choice !== 'collapsed'));
			} finally { release(); }
			await expect(page.locator('html')).toHaveAttribute('data-gallery-ready', 'true');
			await expect(technical).toHaveAttribute('aria-expanded', String(choice === 'expanded'));
			const evidence = await page.evaluate(() => (window as unknown as { selectiveEvidence: { violations: string[]; frames: number[] } }).selectiveEvidence);
			expect(evidence.violations).toEqual([]);
			expect(evidence.frames.length).toBeGreaterThan(0);
			if (choice !== 'expanded') expect(evidence.frames.every(height => height === 0)).toBe(true);
			await testInfo.attach('pre-paint-geometry', { body: JSON.stringify(evidence), contentType: 'application/json' });
			await page.screenshot({ path: testInfo.outputPath(`selective-${choice}.png`), fullPage: true });
			await page.getByTestId('sections-toggle').click();
			await expect(technical).toHaveAttribute('aria-expanded', String(choice === 'collapsed'));
		});
	}
}

test('selective no-JavaScript fallback keeps optional details readable', async ({ browser, baseURL }) => {
	const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
	try {
		const page = await context.newPage();
		await page.goto('/sections/selective');
		await expect(page.getByText('Optional methodology remains readable without JavaScript.')).toBeVisible();
		await expect(page.getByTestId('sections-controls')).toBeHidden();
	} finally { await context.close(); }
});

for (const theme of ['light', 'dark']) {
	for (const width of [320, 1440, 1920]) {
		test(`selective three states ${theme} at ${width}`, async ({ page }, testInfo) => {
			await page.setViewportSize({ width, height: 900 });
			await page.addInitScript(theme => localStorage.setItem('theme', theme), theme);
			await page.goto('/sections/selective');
			await expect(page.locator('html')).toHaveAttribute('data-gallery-ready', 'true');
			for (const state of ['mixed', 'collapsed', 'expanded']) {
				await expect(page.getByText('Les détails techniques', { exact: false })).toBeVisible();
				await expect(page.getByText('Los detalles técnicos', { exact: false })).toBeVisible();
				expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
				await page.screenshot({ path: testInfo.outputPath(`${theme}-${width}-${state}.png`), fullPage: true });
				await page.getByTestId('sections-toggle').click();
			}
		});
	}
}
