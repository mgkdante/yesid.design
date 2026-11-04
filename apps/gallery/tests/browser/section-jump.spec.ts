import { expect, test } from '@playwright/test';

test('a fragment link through an open shadow root opens and lands inside the registered root', async ({ page }) => {
	await page.goto('/detail-frame?sections=1');
	const target = page.locator('[data-toc="platforms"]');
	await expect(target.getByRole('button', { name: 'Platforms', exact: true })).toHaveAttribute('aria-expanded', 'false');
	await page.evaluate(() => {
		const outer = document.createElement('a');
		outer.href = '#platforms';
		outer.setAttribute('data-sveltekit-reload', '');
		outer.style.cssText = 'position:fixed;top:150px;left:16px;z-index:100';
		const host = outer.appendChild(document.createElement('span'));
		host.attachShadow({ mode: 'open' }).innerHTML = '<a href="#platforms" data-sveltekit-reload>Jump through shadow</a>';
		document.querySelector('article')!.append(outer);
	});
	await page.getByText('Jump through shadow', { exact: true }).click();
	await expect(page).toHaveURL(/#platforms$/);
	await expect(target.getByRole('button', { name: 'Platforms', exact: true })).toHaveAttribute('aria-expanded', 'true');
	await expect.poll(async () => Math.abs((await target.boundingBox())!.y - page.viewportSize()!.height * 0.25)).toBeLessThanOrEqual(2);
});

for (const target of ['_parent', '_top']) {
	test('an iframe ' + target + ' link preserves its held jump when the parent changes fragment', async ({ page }) => {
		await page.goto('/detail-frame');
		const parentFragment = page.url() + '#parent-fragment';
		await page.evaluate(() => {
			const iframe = document.body.appendChild(document.createElement('iframe'));
			iframe.title = 'Jump frame';
			iframe.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:100';
			iframe.src = '/detail-frame?sections=1&links=1';
		});
		const frame = page.frameLocator('iframe[title="Jump frame"]');
		await frame.getByRole('button', { name: 'Begin held jump' }).click();
		await expect(frame.getByTestId('jump-result')).toHaveText('pending');
		await frame.getByTestId('jump-result').evaluate((output, { target, href }) => {
			const link = output.ownerDocument.body.appendChild(output.ownerDocument.createElement('a'));
			link.href = href;
			link.target = target;
			link.textContent = 'Navigate parent fragment';
			link.setAttribute('data-sveltekit-reload', '');
			link.style.cssText = 'position:fixed;top:150px;left:16px;z-index:100';
		}, { target, href: parentFragment });
		await frame.getByRole('link', { name: 'Navigate parent fragment' }).click({ noWaitAfter: true });
		await expect(page).toHaveURL(parentFragment);
		await frame.getByRole('button', { name: 'Release held jump' }).click();
		await expect(frame.getByTestId('jump-result')).toHaveText('true');
	});
}

for (const kind of ['open shadow root', 'SVG anchor'] as const) {
	test('a navigation link in an ' + kind + ' cancels the held jump', async ({ page }) => {
		// A 204 response proves a real navigation was requested while keeping the fixture mounted.
		await page.route('**/section-jump-next', (route) => route.fulfill({ status: 204 }));
		await page.goto('/detail-frame?sections=1&links=1');
		await page.getByRole('button', { name: 'Begin held jump' }).click();
		await expect(page.getByTestId('jump-result')).toHaveText('pending');
		await page.evaluate((kind) => {
			const host = document.body.appendChild(document.createElement('div'));
			host.style.cssText = 'position:fixed;top:150px;left:16px;z-index:100';
			if (kind === 'open shadow root') {
				host.attachShadow({ mode: 'open' }).innerHTML = '<a href="/section-jump-next" data-sveltekit-reload>Navigate away</a>';
			} else {
				host.innerHTML = '<svg width="180" height="44"><a href="/section-jump-next" data-sveltekit-reload><text x="0" y="25">Navigate away</text></a></svg>';
			}
		}, kind);
		const request = page.waitForRequest((request) => request.isNavigationRequest() && request.url().endsWith('/section-jump-next'));
		await page.getByText('Navigate away', { exact: true }).click({ noWaitAfter: true });
		await request;
		await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 0)));
		await page.getByRole('button', { name: 'Release held jump' }).click();
		await expect(page.getByTestId('jump-result')).toHaveText('false');
	});
}

for (const motion of ['reduce', 'no-preference'] as const) {
	test('reopening the mobile TOC during settlement still lands and sets the active item (' + motion + ')', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.emulateMedia({ reducedMotion: motion });
		await page.goto('/detail-frame?sections=1');
		await page.getByRole('button', { name: 'Signals', exact: true }).click();
		await page.evaluate(() => window.scrollTo(0, 300));
		const pill = page.getByTestId('toc-pill');
		await pill.getByRole('button', { expanded: false }).click();
		// One frame lets jump() open its real section and enter settlement. Reopen before
		// the required stable frames complete, without relying on automation click delays.
		await pill.getByRole('button', { name: 'Platforms', exact: true }).evaluate(async (item) => {
			(item as HTMLButtonElement).click();
			await new Promise(requestAnimationFrame);
			document.querySelector<HTMLButtonElement>('[data-testid="toc-pill"] > button')!.click();
		});
		await expect(pill.getByRole('button', { expanded: true })).toBeVisible();
		await expect(page.locator('[data-toc="platforms"] button').first()).toHaveAttribute('aria-expanded', 'true');
		await expect.poll(async () => Math.abs((await page.locator('[data-toc="platforms"]').boundingBox())!.y - 844 * 0.25)).toBeLessThanOrEqual(2);
		await expect(pill.getByRole('button', { name: 'Platforms', exact: true })).toHaveAttribute('aria-current', 'location');
	});
}

for (const motion of ['reduce', 'no-preference'] as const) {
	test('a TOC action opens only its target and lands on the active 25% line (' + motion + ')', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: motion });
		await page.goto('/detail-frame?sections=1');
		await expect(page.getByRole('button', { name: 'Expand all', exact: true })).toBeVisible();
		if (page.viewportSize()!.width < 1024) {
			await page.getByTestId('toc-pill').getByRole('button', { expanded: false }).click();
			await page.getByTestId('toc-pill').getByRole('button', { name: 'Platforms', exact: true }).click();
		} else {
			await page.getByRole('link', { name: 'Platforms', exact: true }).click();
		}
		await expect(page.getByRole('button', { name: 'Platforms', exact: true })).toHaveAttribute('aria-expanded', 'true');
		for (const title of ['Signals', 'Timetables', 'Handover']) {
			await expect(page.getByRole('button', { name: title, exact: true })).toHaveAttribute('aria-expanded', 'false');
		}
		await expect(page.getByRole('button', { name: 'Collapse all', exact: true })).toBeVisible();
		const target = page.locator('[data-toc="platforms"]');
		await expect.poll(async () => Math.abs((await target.boundingBox())!.y - page.viewportSize()!.height * 0.25)).toBeLessThanOrEqual(2);
		await expect(page.getByTestId('toc-pill').locator('.toc-pill-name')).toHaveText('Platforms');
	});
}

test('the router helper reveals an initial fragment after the real sections register', async ({ page }) => {
	await page.goto('/detail-frame?sections=1#platforms');
	await expect(page.getByRole('button', { name: 'Platforms', exact: true })).toHaveAttribute('aria-expanded', 'true');
	await expect(page.getByRole('button', { name: 'Signals', exact: true })).toHaveAttribute('aria-expanded', 'false');
	await expect.poll(async () => Math.abs((await page.locator('[data-toc="platforms"]').boundingBox())!.y - page.viewportSize()!.height * 0.25)).toBeLessThanOrEqual(2);
});
