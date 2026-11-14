import { expect, test } from '@playwright/test';

for (const width of [320, 390]) {
 test(`native popover has a gap at ${width}`, async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width, height: 844 } });
  try {
   const page = await context.newPage();
   await page.goto(`${baseURL}/site-header-compact`);
   await page.getByRole('button', { name: 'Open menu', exact: true }).click();
   const pill = await page.getByTestId('nav-pill').boundingBox();
   const popover = await page.locator('[popover]').boundingBox();
   expect(popover!.y - pill!.y - pill!.height).toBeGreaterThanOrEqual(8);
  } finally { await context.close(); }
 });
}

test('native popover shows the hydrated control labels', async ({ browser, baseURL }) => {
 const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
 try {
  const page = await context.newPage();
  await page.goto(`${baseURL}/site-header-compact`);
  await page.getByRole('button', { name: 'Open menu', exact: true }).click();
  await expect(page.getByText('Dark theme', { exact: true })).toBeVisible();
  await expect(page.getByText('Language: English / Français', { exact: true })).toBeVisible();
 } finally { await context.close(); }
});

test('menu control focus follows the round pill', async ({ page }) => {
 await page.goto('/site-header');
 await page.locator('html[data-gallery-ready="true"]').waitFor();
 const trigger = page.getByRole('button', { name: 'Open menu', exact: true });
 await trigger.focus();
 await expect(trigger).toHaveCSS('outline-style', 'solid');
 expect(await trigger.evaluate(node => parseFloat(getComputedStyle(node).borderRadius))).toBeGreaterThanOrEqual(22);
});

for (const width of [320, 390]) {
 test(`table preserves whole words at ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 });
  await page.goto('/button-focus');
  await page.locator('html[data-gallery-ready="true"]').waitFor();
  await page.locator('main').evaluate(node => {
   node.innerHTML = '<table style="width:100%;table-layout:fixed"><tbody><tr><th scope="row">Deployment</th><td>Reliable environments support teams</td></tr></tbody></table>';
  });
  const cell = page.getByRole('cell');
  await expect(cell).toHaveCSS('word-break', 'normal');
  await expect(cell).toHaveCSS('overflow-wrap', 'break-word');
  expect(await cell.evaluate(node => {
   const text = node.firstChild!;
   const start = text.textContent!.indexOf('environments');
   const range = document.createRange();
   range.setStart(text, start); range.setEnd(text, start + 'environments'.length);
   return range.getClientRects().length;
  })).toBe(1);
 });
}

for (const width of [390, 600, 1440]) {
 test(`brand and unchanged controls fit at ${width} @theme`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/header-seams');
  await page.locator('html[data-gallery-ready="true"]').waitFor();
  const banner = page.getByRole('banner');
  await expect(banner.getByRole('button', { name: 'Open menu' })).toHaveCount(0);
  await expect(banner.getByRole('link', { name: /^yesid\s*\.$/ })).toBeVisible();
  await expect(banner.getByRole('link', { name: 'login', exact: true })).toBeVisible();
  await expect(banner.getByRole('switch', { name: 'Dark theme' })).toBeVisible();
  await expect(banner.getByTestId('language-toggle')).toBeVisible();
  const bounds = await page.getByTestId('nav-pill').boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
 });
}

test('French and Spanish buttons wrap at 200px with content height @theme', async ({ page }) => {
 await page.goto('/header-seams');
 for (const label of ['Envoyer les instructions de connexion par courriel', 'Enviar las instrucciones para iniciar sesión por correo']) {
  const button = page.getByRole(label.startsWith('Envoyer') ? 'button' : 'link', { name: label });
  await expect(button).toHaveCSS('white-space', 'normal');
  const box = await button.boundingBox();
  expect(box!.width).toBeLessThanOrEqual(200);
  expect(box!.height).toBeGreaterThan(32);
  expect(await button.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
  expect(await button.evaluate(node => getComputedStyle(node).transitionProperty)).not.toContain('all');
 }
 await expect(page.getByRole('button', { name: 'Continue', exact: true })).toHaveCSS('white-space', 'nowrap');
});

for (const width of [320, 390]) {
 test(`table long words fit at ${width} @theme`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 });
  await page.goto('/header-seams');
  const table = page.getByRole('table', { name: 'Deployment words' });
  expect(await table.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
  const cell = table.getByRole('cell').first();
  expect(await cell.evaluate(node => {
   const range = document.createRange(); const text = node.firstChild!;
   const start = text.textContent!.indexOf('environments');
   range.setStart(text, start); range.setEnd(text, start + 12);
   return range.getClientRects().length;
  })).toBe(1);
 });
}
