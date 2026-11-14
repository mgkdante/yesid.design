import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const theme of ['dark', 'light']) {
  test(`labelled field recovery and boundaries in ${theme}`, async ({ page }) => {
    await page.addInitScript(value => localStorage.setItem('theme', value), theme);
    await page.goto('/labelled-field');
    await expect(page.locator('html')).toHaveAttribute('data-gallery-ready', 'true');
    for (const lang of ['en', 'fr', 'es']) {
      const section = page.locator(`section[lang="${lang}"]`);
      await section.getByRole('button').click();
      const summary = section.getByRole('group');
      await expect(summary).toBeFocused();
      for (const field of ['email', 'message']) {
        const input = page.locator(`#${lang}-${field}`);
        await expect(input).toHaveAttribute('aria-invalid', 'true');
        const ids = (await input.getAttribute('aria-describedby'))!.split(' ');
        expect(ids).toContain(`${lang}-${field}-hint`);
        expect(ids).toContain(`${lang}-${field}-error`);
        for (const id of ids) await expect(page.locator(`#${id}`)).toBeVisible();
        await summary.locator(`a[href="#${lang}-${field}"]`).click();
        await expect(input).toBeFocused();
      }
    }
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    const section = page.locator('section[lang="en"]');
    await page.locator('#en-email').fill('reader@example.com');
    await page.locator('#en-message').fill('Help with a website.');
    await section.getByRole('button').click();
    await expect(section.locator('form')).toHaveAttribute('aria-busy', 'true');
    await expect(section.getByRole('button')).toBeDisabled();
    await expect(section.getByRole('status')).toHaveText(/Sending/);
    await expect(section.locator('form')).toHaveAttribute('aria-busy', 'false');
    await expect(section.getByRole('group')).toHaveCount(0);
    await expect(page.locator('#en-email')).not.toHaveAttribute('aria-invalid');
    // Measure an uninvalidated input boundary against both surrounding surfaces.
    const ratios = await page.locator('#en-email').evaluate(el => {
      const rgb = (value: string) => value.match(/[\d.]+/g)!.slice(0, 3).map(Number);
      const lum = (value: string) => rgb(value).map(c => c / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4).reduce((sum, c, i) => sum + c * [.2126, .7152, .0722][i], 0);
      const probe = document.createElement('span'); el.after(probe);
      const border = lum(getComputedStyle(el).borderTopColor);
      const results = ['background', 'card'].map(surface => {
        probe.style.color = `var(--${surface})`;
        const bg = lum(getComputedStyle(probe).color);
        return (Math.max(border, bg) + .05) / (Math.min(border, bg) + .05);
      }); probe.remove(); return results;
    });
    for (const ratio of ratios) expect(ratio).toBeGreaterThanOrEqual(3);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
  test(`labelled fields reflow and retain 44px targets in ${theme}`, async ({ page }) => {
    await page.addInitScript(value => localStorage.setItem('theme', value), theme);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/labelled-field');
    await expect(page.locator('html')).toHaveAttribute('data-gallery-ready', 'true');
    for (const section of await page.locator('section[lang]').all()) await section.getByRole('button').click();
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const targets = await page.locator('[data-register="task"]').evaluate(el =>
        [...el.querySelectorAll('input, textarea, button, .error-summary a')].map(target => {
          const box = target.getBoundingClientRect();
          return { height: box.height, width: box.width, size: target.matches('input, textarea') ? parseFloat(getComputedStyle(target).fontSize) : null };
        }));
      for (const target of targets) {
        expect(target.height).toBeGreaterThanOrEqual(44);
        expect(target.width).toBeGreaterThanOrEqual(44);
        if (target.size !== null) {
          expect(target.size).toBeGreaterThanOrEqual(16); expect(target.size).toBeLessThanOrEqual(17);
        }
      }
      expect(await page.locator('[data-register="task"]').evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
    }
  });
}
