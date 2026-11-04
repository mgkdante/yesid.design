import { afterEach, describe, expect, it, vi } from 'vitest';
import { boop } from './boop.js';
import { cardParallax } from './cardParallax.js';
import { cursorGlow } from './cursorGlow.js';
import { magnetic } from './magnetic.js';
import { sectionGlow } from './sectionGlow.js';
import { wordmarkHover } from './wordmarkHover.js';
import { gsap } from '../utils/gsap.js';

// Device capabilities are independent of touch-point count. In particular,
// a touchscreen laptop can have either a primary or a secondary mouse.
const devices = [
	{ name: 'desktop mouse', touch: 0, hover: true, fine: true, primaryHover: true, enabled: true },
	{ name: 'touchscreen laptop with mouse', touch: 10, hover: true, fine: true, primaryHover: true, enabled: true },
	{ name: 'touch-primary tablet with attached mouse', touch: 10, hover: true, fine: true, primaryHover: false, enabled: true },
	{ name: 'touch-only phone', touch: 5, hover: false, fine: false, primaryHover: false, enabled: false },
	{ name: 'touch-only tablet', touch: 10, hover: false, fine: false, primaryHover: false, enabled: false },
	{ name: 'coarse hovering pointer', touch: 0, hover: true, fine: false, primaryHover: true, enabled: false },
	{ name: 'fine pointer without hover', touch: 1, hover: false, fine: true, primaryHover: false, enabled: false },
	{ name: 'no pointer', touch: 0, hover: false, fine: false, primaryHover: false, enabled: false },
];

const effects = [
	{ name: 'boop', gated: false, mount: (node: HTMLElement) => boop(node), event: 'mouseenter', active: (node: HTMLElement) => node.style.scale !== '' },
	{ name: 'cursorGlow', gated: false, mount: (node: HTMLElement) => cursorGlow(node), event: 'pointermove', active: (node: HTMLElement) => node.style.getPropertyValue('--glow-x') !== '' },
	{ name: 'sectionGlow', gated: false, mount: (node: HTMLElement) => sectionGlow(node), event: 'pointermove', active: (node: HTMLElement) => node.style.getPropertyValue('--glow-opacity') === '1' },
	{ name: 'cardParallax', gated: true, mount: (node: HTMLElement) => cardParallax(node), event: 'pointermove', active: (node: HTMLElement) => node.style.getPropertyValue('--parallax-x') !== '' },
	{ name: 'magnetic', gated: true, mount: (node: HTMLElement) => magnetic(node), event: 'mousemove', active: (node: HTMLElement) => node.style.transform !== '' },
	{ name: 'wordmarkHover', gated: true, mount: (node: HTMLElement) => wordmarkHover(node, { dotEl: document.createElement('span') }), event: 'mouseenter', active: () => vi.mocked(gsap.timeline).mock.calls.length > 0 },
];

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	vi.clearAllMocks();
});

describe.each(devices)('$name', (device) => {
	it.each([false, true])('all pointer effects agree (reduced motion: %s)', (reduce) => {
		vi.spyOn(navigator, 'maxTouchPoints', 'get').mockReturnValue(device.touch);
		const capabilities: Record<string, boolean> = {
			'(hover: hover)': device.primaryHover,
			'(any-hover: hover)': device.hover,
			'(any-pointer: fine)': device.fine,
			'(any-hover: hover) and (any-pointer: fine)': device.hover && device.fine,
			'(prefers-reduced-motion: reduce)': reduce,
		};
		vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
			matches: capabilities[query] ?? false,
			media: query, onchange: null, addListener() {}, removeListener() {},
			addEventListener() {}, removeEventListener() {}, dispatchEvent: () => true,
		}));
		for (const effect of effects) {
			const node = document.createElement('div');
			node.textContent = 'Example';
			vi.spyOn(node, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 100, 100));
			const action = effect.mount(node);
			try {
				node.dispatchEvent(new PointerEvent(effect.event, { clientX: 60, clientY: 60 }));
				expect.soft(effect.active(node), effect.name).toBe(device.enabled && !(reduce && effect.gated));
				if (!device.enabled) expect.soft(node.innerHTML, effect.name).toBe('Example');
			} finally {
				action.destroy();
			}
		}
	});
});

it('all six actions are inert without a browser', () => {
	vi.stubGlobal('window', undefined);
	for (const effect of effects) {
		const node = document.createElement('div');
		node.textContent = 'Example';
		const action = effect.mount(node);
		node.dispatchEvent(new PointerEvent(effect.event, { clientX: 60, clientY: 60 }));
		expect.soft(effect.active(node), effect.name).toBe(false);
		action.destroy();
		expect(node.innerHTML).toBe('Example');
	}
});
