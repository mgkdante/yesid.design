import { afterEach, describe, expect, it, vi } from 'vitest';
import { destroyLenis, getLenis, initLenis } from '@yesid/motion/utils/lenis';
import { mountLifecycle } from './test-fixtures/mount-lifecycle.js';
import { fakeRouter, linkNavigation } from './test-fixtures/fake-router.js';

// Keep the real shared Lenis instance and animation. Only its GSAP driver/policy are isolated.
vi.mock('@yesid/motion/utils/gsap', () => ({
	initScrollTriggerConfig: vi.fn(),
	ScrollTrigger: { isTouch: 0, update: vi.fn() },
	gsap: { ticker: { add: vi.fn(), remove: vi.fn(), lagSmoothing: vi.fn() } },
}));
vi.mock('@yesid/motion/policy', () => ({ shouldAnimate: () => true }));

afterEach(() => {
	destroyLenis();
	document.body.replaceChildren();
	window.scrollTo(0, 0);
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe.each(['window', 'element'] as const)('header-less navigation with a real %s Lenis scroller', (scroller) => {
	it.each([
		{ hook: 'before', programmatic: false }, { hook: 'on', programmatic: false },
		{ hook: 'before', programmatic: true }, { hook: 'on', programmatic: true },
	] as const)('interrupts $hook momentum (programmatic=$programmatic) without leaving input locked', ({ hook, programmatic }) => {
		if (scroller === 'element') {
			const wrapper = document.createElement('div');
			const content = document.createElement('div');
			wrapper.append(content);
			document.body.append(wrapper);
			vi.spyOn(wrapper, 'clientHeight', 'get').mockReturnValue(600);
			vi.spyOn(wrapper, 'scrollHeight', 'get').mockReturnValue(4000);
			initLenis({ wrapper, content });
		} else {
			// Vitest's global Window constructor can be from a different happy-dom realm.
			vi.stubGlobal('Window', window.constructor);
			vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(4000);
			initLenis();
		}
		const lenis = getLenis()!;
		expect(lenis.scroll).toBe(0);
		expect(lenis.limit).toBeGreaterThan(1000);
		lenis.scrollTo(1000, { programmatic, duration: 1 });
		lenis.raf(100);
		lenis.raf(150);
		expect(lenis.isScrolling).toBe('smooth');
		const position = lenis.scroll;
		const hooks = fakeRouter();
		mountLifecycle(hooks.router);
		hooks[hook](linkNavigation('/destination'));
		expect(lenis.isScrolling).toBe(false);
		expect(lenis.velocity).toBe(0);
		lenis.raf(300);
		expect(lenis.scroll).toBe(position);
		expect(lenis.isStopped).toBe(false);
		// A stop owned by another caller must not be released by navigation.
		lenis.stop();
		hooks[hook](linkNavigation('/another-destination'));
		expect(lenis.isStopped).toBe(true);
	});
});
