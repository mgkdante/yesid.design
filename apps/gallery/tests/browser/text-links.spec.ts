import { expect, test } from '@playwright/test';

for (const theme of ['dark', 'light']) {
  test(`text links retain their action cues in ${theme}`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem('theme', value), theme);
    await page.goto('/text-links');
    await expect(page.locator('html')).toHaveAttribute('data-gallery-ready', 'true');
    for (const surface of await page.locator('[data-link-surface]').all()) {
      const link = surface.locator('a').first();
      const primary = await link.evaluate((el) => {
        const probe = document.createElement('span');
        probe.style.color = 'var(--primary)'; el.append(probe);
        const color = getComputedStyle(probe).color; probe.remove(); return color;
      });
      await expect(link).toHaveCSS('color', primary);
      await expect(link).toHaveCSS('text-decoration-line', 'underline');
      expect(await link.evaluate((el) => {
        const style = getComputedStyle(el);
        return parseFloat(style.textUnderlineOffset) / parseFloat(style.fontSize);
      })).toBeCloseTo(0.2);
      await link.hover();
      await expect(link).toHaveCSS('text-decoration-thickness', '2px');
      await link.evaluate((el) => {
        const marker = document.createElement('span'); marker.tabIndex = -1;
        el.before(marker); marker.focus(); marker.remove();
      });
      await page.keyboard.press('Tab');
      await expect(link).toBeFocused();
      await expect(link).toHaveCSS('outline-style', 'solid');
      await expect(link).toHaveCSS('outline-width', '2px');
    }
    await page.emulateMedia({ forcedColors: 'active' });
    const link = page.locator('[data-link-surface] a').first();
    await link.focus();
    await expect(link).toHaveCSS('outline-style', 'solid');
    await expect(link).toHaveCSS('outline-width', '2px');
  });
  for (const width of [320, 390, 768, 1440, 1920]) {
    test(`fixtures fit ${width}px in ${theme} with reduced motion`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.addInitScript((value) => localStorage.setItem('theme', value), theme);
      for (const route of ['/text-links', '/registers']) {
        await page.goto(route);
        await expect(page.locator('html')).toHaveAttribute('data-gallery-ready', 'true');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await expect(page.locator('[lang="fr"]').first()).toBeVisible();
        await expect(page.locator('[lang="es"]').first()).toBeVisible();
      }
    });
  }
}
