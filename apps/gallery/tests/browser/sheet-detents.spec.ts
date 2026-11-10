import { expect, test, type Page } from '@playwright/test';
import { openGallery, GALLERY_THEMES } from './gallery.js';
async function open(page: Page) {
	await openGallery(page);
	await page.getByRole('button', { name: 'Open draggable sheet' }).click();
	const sheet = page.getByRole('dialog', { name: 'Draggable detail' });
	await expect(sheet).toBeVisible();
	return { sheet, handle: page.getByRole('slider', { name: 'Sheet height' }) };
}

test('sheet detent keyboard, scroll and non-modal interactions', async ({ page }) => {
	const { sheet, handle } = await open(page);
	await expect(sheet).toHaveAttribute('aria-modal', 'false');
	await expect(page.locator('[data-slot=sheet-overlay]')).toHaveCount(0);
	await handle.focus();
	await handle.press('Home');
	await expect(handle).toHaveAttribute('aria-valuetext', 'Peek');
	await handle.press('ArrowUp');
	await expect(handle).toHaveAttribute('aria-valuetext', 'Half height');
	await handle.press('End');
	await expect(handle).toHaveAttribute('aria-valuetext', 'Full height');
	const body = page.getByTestId('sheet-scroll-body');
	await body.hover();
	await page.mouse.wheel(0, 300);
	await expect.poll(() => body.evaluate(n => n.scrollTop)).toBeGreaterThan(0);
	await expect(sheet).toHaveAttribute('data-detent', 'full');
	await handle.press('Home');
	const outside = page.getByRole('button', { name: 'Outside count: 0' });
	await outside.scrollIntoViewIfNeeded();
	await outside.click();
	await expect(page.getByRole('button', { name: 'Outside count: 1' })).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(sheet).toBeVisible();
	await sheet.getByRole('button', { name: 'Close draggable sheet' }).focus();
	await page.keyboard.press('Tab');
	await expect.poll(() => sheet.evaluate(n => n.contains(document.activeElement))).toBe(false);
	await handle.focus();
	await page.keyboard.press('Escape');
	await expect(sheet).toBeHidden();
});

test('sheet detent height follows viewport and reduced motion', async ({ page }) => {
	const { sheet, handle } = await open(page);
	await handle.press('End');
	for (const height of [800, 1000]) {
		await page.setViewportSize({ width: 800, height });
		await expect.poll(async () => (await sheet.boundingBox())!.height).toBeCloseTo(height * 0.9, 0);
		await expect(sheet).toHaveAttribute('data-detent', 'full');
	}
	// 50% of 200px is below the 120px peek: the half stop floors at peek instead of reversing.
	await handle.press('Home');
	await handle.press('ArrowUp');
	await page.setViewportSize({ width: 800, height: 200 });
	await expect.poll(async () => (await sheet.boundingBox())!.height).toBeCloseTo(120, 0);
	await expect(sheet).toHaveAttribute('data-detent', 'half');
	await page.setViewportSize({ width: 800, height: 800 });
	await page.emulateMedia({ reducedMotion: 'reduce' });
	expect(await sheet.evaluate(n => getComputedStyle(n).transitionDuration)).toBe('0s');
});

test('sheet mouse drag snaps nearest and flicks in direction', async ({ page }) => {
	const { sheet, handle } = await open(page);
	const box = (await handle.boundingBox())!;
	const x = box.x + box.width / 2;
	const y = box.y + box.height / 2;
	await page.mouse.move(x, y);
	await page.mouse.down();
	await page.mouse.move(x, y + page.viewportSize()!.height * 0.5 - 130, { steps: 10 });
	// Hold at release to remove flick velocity from the sample window.
	await page.waitForTimeout(150);
	await page.mouse.up();
	await expect(sheet).toHaveAttribute('data-detent', 'peek');
	const second = (await handle.boundingBox())!;
	await page.mouse.move(x, second.y + 22);
	await page.mouse.down();
	await page.mouse.move(x, second.y - 80, { steps: 2 });
	await page.mouse.up();
	await expect(sheet).toHaveAttribute('data-detent', 'half');
});

test('sheet touch drag follows the finger and snaps both ways', async ({ page, context }) => {
	const { sheet, handle } = await open(page);
	const cdp = await context.newCDPSession(page);
	// Touch pointers start captured by the touched handle child, unlike a mouse.
	async function drag(to: number) {
		const box = (await handle.boundingBox())!;
		const x = box.x + box.width / 2;
		const from = box.y + box.height / 2;
		const start = (await sheet.boundingBox())!.height;
		await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: from }] });
		for (let step = 1; step <= 10; step++) {
			await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: from + (to - from) * step / 10 }] });
		}
		expect(Math.abs((await sheet.boundingBox())!.height - start)).toBeGreaterThan(40);
		await page.waitForTimeout(150);
		await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
	}
	await drag(40);
	await expect(sheet).toHaveAttribute('data-detent', 'full');
	await drag(page.viewportSize()!.height - 100);
	await expect(sheet).toHaveAttribute('data-detent', 'peek');
	await cdp.detach();
});

test('touch scrolling and header controls do not move the sheet', async ({ page, context }) => {
	const { sheet } = await open(page);
	await sheet.getByRole('button', { name: 'Header action: 0' }).click();
	await expect(sheet.getByRole('button', { name: 'Header action: 1' })).toBeVisible();
	const body = page.getByTestId('sheet-scroll-body');
	const box = (await body.boundingBox())!;
	const cdp = await context.newCDPSession(page);
	const x = box.x + box.width / 2;
	const y = box.y + Math.min(box.height - 10, 140);
	await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
	for (let step = 1; step <= 6; step++) {
		await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - step * 15 }] });
	}
	await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
	await expect.poll(() => body.evaluate(n => n.scrollTop)).toBeGreaterThan(0);
	await expect(sheet).toHaveAttribute('data-detent', 'half');
	await cdp.detach();
});

for (const theme of GALLERY_THEMES) {
	test(`sheet detents render in ${theme} @theme`, async ({ page }) => {
		await openGallery(page, theme);
		await page.getByRole('button', { name: 'Open draggable sheet' }).click();
		await expect(page.getByRole('slider', { name: 'Sheet height' })).toBeVisible();
	});
}
