import { expect, test, type Page } from '@playwright/test';

import {
	HOME,
	LABELS,
	LANGUAGE_LABEL,
	LINKS,
	LOCALES,
	MENU_ITEMS,
	SEARCH_LABEL,
	languageHref,
} from '../../src/lib/gallery/site-header-fixture.js';

// The header width each link priority needs before it shows (the package's contract).
const SHOWN_FROM = { 1: 375, 2: 500, 3: 1024 } as const;
const literal = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const header = (page: Page) => page.getByRole('navigation', { name: LABELS.nav });
const toggle = (page: Page) =>
	header(page).getByRole('button', { name: new RegExp(`^(${literal(LABELS.openMenu)}|${literal(LABELS.closeMenu)})$`) });
const menu = (page: Page) => page.getByRole('dialog', { name: LABELS.menu });
const menuLinks = (page: Page) => page.getByRole('navigation', { name: LABELS.menu });
const language = (page: Page) => page.getByRole('link', { name: new RegExp(`^${literal(LANGUAGE_LABEL)}:`) });

async function visitHeader(page: Page, url = HOME) {
	await page.goto(url);
	await expect(page.locator('html')).toHaveAttribute('data-gallery-ready', 'true');
}

// Delay the explicit universal load rather than a module Kit may have preloaded.
async function delayFixtureLoad(page: Page) {
	let requested!: () => void;
	let release!: () => void;
	const loading = new Promise<void>((resolve) => { requested = resolve; });
	const gate = new Promise<void>((resolve) => { release = resolve; });
	await page.route('**/navigation-lifecycle-gate.json?*', async (route) => {
		requested();
		await gate;
		await route.fulfill({ contentType: 'application/json', body: '{}' });
	});
	return { loading, release };
}

const routerFixture = (params: Record<string, string>) => `/navigation-lifecycle-fixture?${new URLSearchParams(params)}`;

test('links and search show at the header widths their priority allows', async ({ page }) => {
	const width = page.viewportSize()!.width;
	await visitHeader(page);

	for (const link of LINKS) {
		const shown = header(page).getByRole('link', { name: link.label, exact: true });
		await expect(shown).toBeVisible({ visible: width >= SHOWN_FROM[link.priority ?? 1] });
		if (link.current) await expect(shown).toHaveAttribute('aria-current', 'page');
	}
	await expect(header(page).getByRole('searchbox', { name: SEARCH_LABEL })).toBeVisible({ visible: width >= 1024 });
	await expect(language(page)).toHaveAttribute('href', languageHref(LOCALES[1]));
});

// One nav text size at every width: links 16px, wordmark 18px, and the pill stays on screen.
test('nav text keeps one size at every width and the pill fits the screen', async ({ page }, testInfo) => {
	test.skip(testInfo.project.name !== 'desktop', 'One run resizes through every width');
	for (const width of [320, 360, 374, 375, 390, 500, 768, 1024, 1440]) {
		await page.setViewportSize({ width, height: 800 });
		await visitHeader(page);
		const sizes = await header(page).evaluate((nav) => {
			const pill = nav.getBoundingClientRect();
			const shown = [...nav.querySelectorAll<HTMLElement>('.nav-pill-link')].filter((link) => link.offsetWidth > 0);
			const wordmark = nav.querySelector<HTMLElement>('.nav-wordmark')!;
			return {
				links: [...new Set(shown.map((link) => getComputedStyle(link).fontSize))],
				wordmark: getComputedStyle(wordmark).fontSize,
				left: pill.left,
				right: pill.right,
			};
		});
		if (width >= SHOWN_FROM[1]) expect(sizes.links, `links at ${width}px`).toEqual(['16px']);
		else expect(sizes.links, `no header links below ${SHOWN_FROM[1]}px`).toEqual([]);
		expect(sizes.wordmark, `wordmark at ${width}px`).toBe('18px');
		expect(sizes.left, `pill left edge at ${width}px`).toBeGreaterThanOrEqual(0);
		expect(sizes.right, `pill right edge at ${width}px`).toBeLessThanOrEqual(width);
	}
});

// Labels differ by product and language, so links move to the menu whenever they don't fit.
test('header links move to the menu when their labels do not fit, and come back when they do', async ({ page }, testInfo) => {
	test.skip(testInfo.project.name !== 'desktop', 'One run sets a phone width');
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	await page.setViewportSize({ width: 390, height: 800 });
	await visitHeader(page);
	const link = header(page).getByRole('link', { name: LINKS[0].label, exact: true });
	await expect(link).toBeVisible();
	const pillFits = () => header(page).evaluate((nav) => {
		const box = nav.getBoundingClientRect();
		return box.left >= 0 && box.right <= innerWidth;
	});

	await link.evaluate((node) => { node.textContent = 'A header link label far too long for any phone'; });
	await expect(header(page).getByRole('link', { name: /far too long/ })).toBeHidden();
	expect(await pillFits()).toBe(true);

	await header(page).locator('.nav-pill-link').first().evaluate((node, label) => { node.textContent = label; }, LINKS[0].label);
	await expect(link).toBeVisible();
	expect(await pillFits()).toBe(true);
	expect(errors).toEqual([]);
});

test('the skip link is the first tab stop and moves focus into the main content', async ({ page }) => {
	await visitHeader(page);
	const skip = page.getByRole('link', { name: LABELS.skipToContent });
	await expect(skip).not.toBeInViewport();
	await page.keyboard.press('Tab');
	await expect(skip).toBeFocused();
	await expect(skip).toBeInViewport();
	await page.keyboard.press('Enter');
	await page.keyboard.press('Tab');
	await expect(page.getByRole('main').locator(':focus')).toHaveCount(1);
});

test('the menu opens with every item, traps focus and closes with Escape', async ({ page }) => {
	await visitHeader(page);
	await toggle(page).click();

	await expect(menu(page)).toBeVisible();
	await expect(toggle(page)).toBeFocused();
	await expect(toggle(page)).toHaveAccessibleName(LABELS.closeMenu);
	for (const item of MENU_ITEMS) {
		const link = menuLinks(page).getByRole('link', { name: item.ariaLabel ?? new RegExp(`^${literal(item.label)}`) });
		await expect(link).toBeVisible();
		if (item.external) await expect(link).toHaveAttribute('target', '_blank');
	}

	await page.keyboard.press('Shift+Tab');
	await expect(menu(page).locator(':focus')).toHaveCount(1);
	await page.keyboard.press('Escape');
	await expect(menu(page)).toBeHidden();
	await expect(toggle(page)).toBeFocused();
	await expect(toggle(page)).toHaveAccessibleName(LABELS.openMenu);
});

test('menu items carry icons and only the current item\'s icon is lit', async ({ page }) => {
	await visitHeader(page);
	await toggle(page).click();
	for (const item of MENU_ITEMS) {
		const icon = menuLinks(page).getByRole('link', { name: item.ariaLabel ?? new RegExp(`^${literal(item.label)}`) }).locator('svg');
		await expect(icon).toBeVisible();
		if (item.current) await expect(icon).not.toHaveCSS('fill', 'none');
		else await expect(icon).toHaveCSS('fill', 'none');
	}
});

test('a classless text link is underlined and readable in both themes; header links are not', async ({ page }) => {
	await visitHeader(page);
	const link = page.getByRole('paragraph').getByRole('link');
	await expect(link).toBeVisible();
	for (const colorScheme of ['dark', 'light'] as const) {
		const result = await page.evaluate(({ link, colorScheme }) => {
			document.documentElement.dataset.theme = colorScheme;
			const context = document.createElement('canvas').getContext('2d')!;
			const rgba = (color: string) => {
				context.clearRect(0, 0, 1, 1);
				context.fillStyle = color;
				context.fillRect(0, 0, 1, 1);
				return Array.from(context.getImageData(0, 0, 1, 1).data);
			};
			const luminance = (rgb: number[]) => rgb.slice(0, 3).reduce((sum, value, i) => {
				const c = value / 255;
				return sum + (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4) * [0.2126, 0.7152, 0.0722][i]!;
			}, 0);
			let ancestor = link!.parentElement;
			while (ancestor && rgba(getComputedStyle(ancestor).backgroundColor)[3] === 0) ancestor = ancestor.parentElement;
			if (!ancestor) throw new Error('No non-transparent link background');
			const style = getComputedStyle(link!);
			const foreground = luminance(rgba(style.color));
			const background = luminance(rgba(getComputedStyle(ancestor).backgroundColor));
			return { decoration: style.textDecorationLine, contrast: (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05) };
		}, { link: await link.elementHandle(), colorScheme });
		expect(result.decoration).toContain('underline');
		expect(result.contrast).toBeGreaterThanOrEqual(4.5);
		await expect(header(page).getByRole('link', { name: LINKS[0]!.label, exact: true })).toHaveCSS('text-decoration-line', 'none');
	}
});

test('a language switch from the open menu keeps it open', async ({ page }) => {
	await visitHeader(page);
	await toggle(page).click();
	await language(page).click();

	await expect(page).toHaveURL(new RegExp(`lang=${LOCALES[1]}$`));
	await expect(menu(page)).toBeVisible();
	await expect(language(page)).toBeFocused();
	await expect(language(page)).toHaveAttribute('href', languageHref(LOCALES[0]));
	await page.keyboard.press('Escape');
	await expect(menu(page)).toBeHidden();
	await expect(toggle(page)).toBeFocused();
});

test('a state-preserving language switch from the closed header resets page focus', async ({ page }) => {
	await visitHeader(page);
	await language(page).click();
	await expect(page).toHaveURL(new RegExp(`lang=${LOCALES[1]}$`));
	await expect(menu(page)).toBeHidden();
	await expect(page.locator('body')).toBeFocused();
});

test.describe('Kit 3 hook-only navigation', () => {
	test.use({ contextOptions: { reducedMotion: 'no-preference' } });
	const fallbackHome = `${HOME}?initial=true`;

	test('a direct language link keeps the menu open and focuses its updated link', async ({ page }) => {
		await visitHeader(page, fallbackHome);
		await toggle(page).click();
		await language(page).click();
		await expect(page).toHaveURL(new RegExp(`lang=${LOCALES[1]}$`));
		await expect(menu(page)).toBeVisible();
		await expect(language(page)).toBeFocused();
		await expect(language(page)).toHaveAttribute('href', languageHref(LOCALES[0]));
	});

	test('an eventless language redirect closes the menu without locale focus or stale intent', async ({ page }) => {
		await visitHeader(page, fallbackHome);
		await toggle(page).click();
		await language(page).evaluate((node, href) => node.setAttribute('href', href), routerFixture({ redirect: 'locale' }));
		await language(page).click();
		await expect(page).toHaveURL((url) => url.searchParams.get('landed') === 'locale');
		await expect(menu(page)).toBeHidden();
		await expect(language(page)).not.toBeFocused();
		await toggle(page).click();
		const ordinary = header(page).getByRole('link').first();
		await ordinary.evaluate((node, href) => node.setAttribute('href', href), routerFixture({ redirect: 'ordinary' }));
		await ordinary.click();
		await expect(page).toHaveURL((url) => url.searchParams.get('landed') === 'ordinary');
		await expect(menu(page)).toBeHidden();
		await expect(language(page)).not.toBeFocused();
	});

	test('an eventless redirect from a closed state-preserving language link resets page focus', async ({ page }) => {
		await visitHeader(page, fallbackHome);
		await language(page).evaluate((node, href) => node.setAttribute('href', href), routerFixture({ redirect: 'locale' }));
		await language(page).click();
		await expect(page).toHaveURL((url) => url.searchParams.get('landed') === 'locale');
		await expect(menu(page)).toBeHidden();
		await expect(page.locator('body')).toBeFocused();
	});

	test('an ordinary navigation closes the menu and completes', async ({ page }) => {
		await visitHeader(page, fallbackHome);
		await toggle(page).click();
		await header(page).getByRole('link').first().click();
		await expect(page).toHaveURL((url) => url.pathname === HOME && url.search === '');
		await expect(menu(page)).toBeHidden();
	});

	for (const initial of ['locale', 'ordinary'] as const) {
		test(`a redirect superseding a slow ${initial} navigation closes a reopened menu`, async ({ page }) => {
			await visitHeader(page, fallbackHome);
			const delay = await delayFixtureLoad(page);
			try {
				await toggle(page).click();
				const ordinary = header(page).getByRole('link').first();
				const first = initial === 'locale' ? language(page) : ordinary;
				await first.evaluate((node, href) => node.setAttribute('href', href), routerFixture({ delay: initial }));
				await first.click({ noWaitAfter: true });
				await delay.loading;
				if (initial === 'ordinary') {
					await expect(menu(page)).toBeHidden();
					await toggle(page).click();
				}
				await expect(menu(page)).toBeVisible();
				const second = initial === 'locale' ? ordinary : language(page);
				const destination = initial === 'locale' ? 'ordinary' : 'locale';
				await second.evaluate((node, href) => node.setAttribute('href', href), routerFixture({ redirect: destination }));
				await second.click();
				await expect(page).toHaveURL((url) => url.searchParams.get('landed') === destination);
				await expect(menu(page)).toBeHidden();
				await expect(language(page)).not.toBeFocused();
			} finally {
				delay.release();
				await page.unrouteAll({ behavior: 'wait' });
			}
		});
	}
});

test.describe('with motion on', () => {
	test.use({ contextOptions: { reducedMotion: 'no-preference' } });

	// Reuses the independent review's review-146.spec.ts reproduction.
	for (const variant of [
		{ name: 'preventDefault', stopped: false, reload: false },
		{ name: 'preventDefault+stopPropagation', stopped: true, reload: false },
		{ name: 'cancelled reload link', stopped: true, reload: true },
	]) {
		test(`an app-cancelled trusted locale click cannot poison an ordinary redirect: ${variant.name}`, async ({ page }) => {
			await visitHeader(page);
			const delay = await delayFixtureLoad(page);
			try {
				await toggle(page).click();
				const ordinary = header(page).getByRole('link').first();
				await ordinary.evaluate((node, href) => node.setAttribute('href', href), routerFixture({ delay: 'ordinary', redirect: 'ordinary' }));
				await ordinary.click({ noWaitAfter: true });
				await delay.loading;
				await expect(menu(page)).toBeHidden();
				await toggle(page).click();
				await expect(menu(page)).toBeVisible();
				await language(page).evaluate((node, { stopped, reload }) => {
					if (reload) node.setAttribute('data-sveltekit-reload', 'true');
					node.addEventListener('click', (event) => {
						event.preventDefault();
						if (stopped) event.stopPropagation();
					}, { once: true });
				}, variant);
				await page.evaluate(() => {
					window.addEventListener('click', (event) => { document.documentElement.dataset.nativeClickTrusted = String(event.isTrusted); }, { once: true, capture: true });
				});
				await language(page).click();
				await expect(page.locator('html')).toHaveAttribute('data-native-click-trusted', 'true');
				delay.release();
				await expect(page).toHaveURL((url) => url.pathname === HOME && url.searchParams.get('landed') === 'ordinary');
				await expect(menu(page)).toBeHidden();
				await expect(language(page)).not.toBeFocused();
			} finally {
				delay.release();
				await page.unrouteAll({ behavior: 'wait' });
			}
		});
	}

	test('keyboard Enter on an eventless locale redirect closes the menu', async ({ page }) => {
		await visitHeader(page);
		await toggle(page).click();
		await language(page).evaluate((node, href) => {
			node.setAttribute('href', href);
			node.focus();
		}, routerFixture({ redirect: 'locale' }));
		await page.evaluate(() => {
			window.addEventListener('click', (event) => { document.documentElement.dataset.nativeClickTrusted = String(event.isTrusted); }, { once: true, capture: true });
		});
		await page.keyboard.press('Enter');
		await expect(page.locator('html')).toHaveAttribute('data-native-click-trusted', 'true');
		await expect(page).toHaveURL((url) => url.searchParams.get('landed') === 'locale');
		await expect(menu(page)).toBeHidden();
		await expect(page.locator('body')).toBeFocused();
	});

	test('a trusted eventless locale redirect closes the menu and resets focus', async ({ page }) => {
		await visitHeader(page);
		await toggle(page).click();
		await language(page).evaluate((node, href) => { node.setAttribute('href', href); }, routerFixture({ redirect: 'locale' }));
		await page.evaluate(() => {
			window.addEventListener('click', (event) => { document.documentElement.dataset.nativeClickTrusted = String(event.isTrusted); }, { once: true });
		});
		await language(page).click();
		await expect(page.locator('html')).toHaveAttribute('data-native-click-trusted', 'true');
		await expect(page).toHaveURL((url) => url.pathname === HOME && url.searchParams.get('lang') === LOCALES[1] && url.searchParams.get('landed') === 'locale');
		await expect(menu(page)).toBeHidden();
		await expect(page.locator('body')).toBeFocused();
		await expect(language(page)).toHaveAttribute('href', languageHref(LOCALES[0]));
	});

	test('an eventless locale redirect after a slow ordinary load closes a reopened menu', async ({ page }) => {
		await visitHeader(page);
		const delay = await delayFixtureLoad(page);
		try {
			await toggle(page).click();
			const ordinary = header(page).getByRole('link').first();
			await ordinary.evaluate((node, href) => { node.setAttribute('href', href); }, routerFixture({ delay: 'ordinary' }));
			await ordinary.click({ noWaitAfter: true });
			await delay.loading;
			await expect(menu(page)).toBeHidden();
			await toggle(page).click();
			await expect(menu(page)).toBeVisible();
			await language(page).evaluate((node, href) => { node.setAttribute('href', href); }, routerFixture({ redirect: 'locale' }));
			await page.evaluate(() => {
				window.addEventListener('click', (event) => { document.documentElement.dataset.nativeClickTrusted = String(event.isTrusted); }, { once: true });
			});
			await language(page).click();
			await expect(page.locator('html')).toHaveAttribute('data-native-click-trusted', 'true');
			await expect(page).toHaveURL((url) => url.pathname === HOME && url.searchParams.get('lang') === LOCALES[1] && url.searchParams.get('landed') === 'locale');
			await expect(menu(page)).toBeHidden();
			await expect(page.locator('body')).toBeFocused();
			await expect(language(page)).toHaveAttribute('href', languageHref(LOCALES[0]));
		} finally {
			delay.release();
			await page.unrouteAll({ behavior: 'wait' });
		}
	});

	test('an ordinary redirect superseding a slow locale switch closes the menu', async ({ page }) => {
		await visitHeader(page);
		const delay = await delayFixtureLoad(page);
		try {
			await language(page).evaluate((node, href) => { node.setAttribute('href', href); }, routerFixture({ delay: 'locale' }));
			await toggle(page).click();
			await language(page).click({ noWaitAfter: true });
			await delay.loading;
			await expect(menu(page)).toBeVisible();
			// The wordmark is an ordinary link without a menu-item close handler.
			const ordinary = header(page).getByRole('link').first();
			await ordinary.evaluate((node, href) => { node.setAttribute('href', href); }, routerFixture({ redirect: 'ordinary' }));
			await ordinary.click({ noWaitAfter: true });
			await expect(page).toHaveURL((url) => url.pathname === HOME && url.searchParams.get('landed') === 'ordinary');
			await expect(menu(page)).toBeHidden();
			await expect(language(page)).not.toBeFocused();
		} finally {
			delay.release();
			await page.unrouteAll({ behavior: 'wait' });
		}
	});

	test('a redirected locale switch superseding a slow ordinary navigation resets focus', async ({ page }) => {
		await visitHeader(page);
		const delay = await delayFixtureLoad(page);
		try {
			await toggle(page).click();
			const ordinary = header(page).getByRole('link').first();
			await ordinary.evaluate((node, href) => { node.setAttribute('href', href); }, routerFixture({ delay: 'ordinary' }));
			await ordinary.click({ noWaitAfter: true });
			await delay.loading;
			await expect(menu(page)).toBeHidden();
			await language(page).evaluate((node, href) => { node.setAttribute('href', href); }, routerFixture({ redirect: 'locale' }));
			await language(page).click({ noWaitAfter: true });
			await expect(page).toHaveURL((url) => url.pathname === HOME && url.searchParams.get('lang') === LOCALES[1] && url.searchParams.get('landed') === 'locale');
			await expect(page.locator('body')).toBeFocused();
		} finally {
			delay.release();
			await page.unrouteAll({ behavior: 'wait' });
		}
	});

	test('a slow navigation re-closes a menu reopened after its first close completes', async ({ page }) => {
		await visitHeader(page);
		const delay = await delayFixtureLoad(page);
		try {
			await toggle(page).click();
			const target = MENU_ITEMS.find((item) => !item.external && !item.current)!;
			const link = menuLinks(page).getByRole('link', { name: new RegExp(`^${literal(target.label)}`) });
			await link.evaluate((node, href) => {
				node.setAttribute('href', href);
				node.setAttribute('data-sveltekit-preload-data', 'false');
			}, routerFixture({ delay: 'ordinary' }));
			await link.click({ noWaitAfter: true });
			await delay.loading;
			await expect(menu(page)).toBeHidden();
			await toggle(page).click();
			await expect(menu(page)).toBeVisible();
			delay.release();
			await expect(page).toHaveURL((url) => url.pathname === '/navigation-lifecycle-fixture');
			await expect(menu(page)).toBeHidden();
		} finally {
			delay.release();
			await page.unrouteAll({ behavior: 'wait' });
		}
	});

	test('a locale click superseding a slow navigation resets focus without another beforeNavigate', async ({ page }) => {
		await visitHeader(page);
		const delay = await delayFixtureLoad(page);
		try {
			await toggle(page).click();
			const target = MENU_ITEMS.find((item) => !item.external && !item.current)!;
			const link = menuLinks(page).getByRole('link', { name: new RegExp(`^${literal(target.label)}`) });
			await link.evaluate((node, href) => {
				node.setAttribute('href', href);
				node.setAttribute('data-sveltekit-preload-data', 'false');
			}, routerFixture({ delay: 'ordinary' }));
			await link.click({ noWaitAfter: true });
			await delay.loading;
			await expect(menu(page)).toBeHidden();
			await language(page).click();
			await expect(page).toHaveURL(new RegExp(`lang=${LOCALES[1]}$`));
			await expect(page.locator('body')).toBeFocused();
		} finally {
			delay.release();
			await page.unrouteAll({ behavior: 'wait' });
		}
	});

	test('a menu link closes the menu and navigates', async ({ page }) => {
		const target = MENU_ITEMS.find((item) => !item.external && !item.current)!;
		await visitHeader(page);
		await toggle(page).click();
		await menuLinks(page).getByRole('link', { name: new RegExp(`^${literal(target.label)}`) }).click();

		await expect(page).toHaveURL((url) => url.pathname === target.href);
		await expect(menu(page)).toBeHidden();
	});

	test('Back with the menu open closes it, returns to the previous entry and releases the scroll lock', async ({ page }) => {
		await visitHeader(page);
		const overflow = await page.evaluate(() => getComputedStyle(document.body).overflow);
		await language(page).click();
		await expect(page).toHaveURL(new RegExp(`lang=${LOCALES[1]}$`));
		await toggle(page).click();
		await expect(menu(page)).toBeVisible();
		await page.goBack();

		await expect(page).toHaveURL((url) => url.pathname === HOME && !url.search);
		await expect(menu(page)).toBeHidden();
		await expect(page.locator('body')).toHaveCSS('overflow', overflow);
	});

	test('reopening while the menu closes keeps the same menu open, and the pill stays clickable above it', async ({ page }) => {
		await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
		await visitHeader(page);
		await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
		await toggle(page).click();
		await page.clock.runFor(100);
		const list = await menuLinks(page).elementHandle();
		await toggle(page).click();
		await toggle(page).click();
		await page.clock.runFor(1000);

		await expect(menu(page)).toBeVisible();
		await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true');
		expect(await list!.evaluate((node) => node.isConnected)).toBe(true);
	});
});

test.describe('in a short viewport', () => {
	test.use({ viewport: { width: 390, height: 320 } });

	test('the wheel scrolls the menu while the page stays put', async ({ page }) => {
		await visitHeader(page);
		const pageScroll = await page.evaluate(() => window.scrollY);
		await toggle(page).click();
		const list = menuLinks(page);
		await list.hover();
		await page.mouse.wheel(0, 400);

		await expect.poll(() => list.evaluate((nav) => nav.parentElement!.scrollTop)).toBeGreaterThan(0);
		expect(await page.evaluate(() => window.scrollY)).toBe(pageScroll);
	});
});
