import { expect, test, type Locator } from '@playwright/test';
import { expectAccessible } from '@yesid/config/playwright';

async function indicator(control: Locator) {
	return control.evaluate((element) => {
		const style = getComputedStyle(element);
		const canvas = document.createElement('canvas');
		canvas.width = canvas.height = 1;
		const ctx = canvas.getContext('2d')!;
		const luminance = (color: string) => {
			ctx.clearRect(0, 0, 1, 1);
			ctx.fillStyle = color;
			ctx.fillRect(0, 0, 1, 1);
			const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
			if (a !== 255) throw new Error(`Indicator neighbour must be opaque: ${color}`);
			const linear = [r!, g!, b!].map((v) => {
				const s = v / 255;
				return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
			});
			return linear[0]! * 0.2126 + linear[1]! * 0.7152 + linear[2]! * 0.0722;
		};
		let parent = element.parentElement!;
		while (getComputedStyle(parent).backgroundColor === 'rgba(0, 0, 0, 0)') parent = parent.parentElement!;
		const background = getComputedStyle(parent).backgroundColor;
		const ratio = (a: string, b: string) => {
			const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
			return (values[0]! + 0.05) / (values[1]! + 0.05);
		};
		// With a 2px offset, the exposed surface borders both sides of the outline.
		// The fill only becomes a neighbour if that separating gap disappears.
		const inner = parseFloat(style.outlineOffset) >= 2 ? background : style.backgroundColor;
		return {
			style: style.outlineStyle, width: style.outlineWidth, offset: style.outlineOffset,
			inner: ratio(style.outlineColor, inner), outer: ratio(style.outlineColor, background),
		};
	});
}

test.describe('Button keyboard focus', { tag: '@theme' }, () => {
	for (const width of [390, 1440]) {
		test(`every variant on page and card at ${width}px`, async ({ page }, testInfo) => {
			await page.setViewportSize({ width, height: 900 });
			await page.goto('/button-focus');
			await expect(page.locator('html')).toHaveAttribute('data-gallery-ready', 'true');
			await page.evaluate(() => document.fonts.ready);
			const controls = page.locator('[data-focus-surface]').getByRole('button').or(
				page.locator('[data-focus-surface]').getByRole('link'),
			);
			for (const control of await controls.all()) {
				await control.scrollIntoViewIfNeeded();
				const before = await control.boundingBox();
				// Start immediately before the control, then use real keyboard navigation.
				await control.evaluate((element) => {
					const start = document.createElement('span');
					start.tabIndex = -1;
					element.before(start);
					start.focus({ preventScroll: true });
					start.remove();
				});
				await page.keyboard.press('Tab');
				await expect(control).toBeFocused();
				await expect(control).toHaveCSS('outline-style', 'solid');
				await expect(control).toHaveCSS('outline-offset', '2px');
				const measured = await indicator(control);
				expect(measured.width).toBe('2px');
				expect(measured.offset).toBe('2px');
				expect(measured.inner).toBeGreaterThanOrEqual(3);
				expect(measured.outer).toBeGreaterThanOrEqual(3);
				expect(await control.boundingBox()).toEqual(before);
				await testInfo.attach(`${await control.innerText()} contrast`, {
					body: JSON.stringify(measured), contentType: 'application/json',
				});
			}
			await controls.first().click();
			await expect(controls.first()).toHaveCSS('outline-style', 'none');
			await expectAccessible(page);
			await page.keyboard.press('Tab');
			await page.emulateMedia({ forcedColors: 'active' });
			for (const control of await controls.all()) {
				await control.focus();
				await expect(control).toHaveCSS('outline-style', 'solid');
				await expect(control).toHaveCSS('outline-width', '2px');
			}
		});
	}
});
