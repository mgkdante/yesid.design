import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cursorGlow } from './cursorGlow.js';

describe('cursorGlow', () => {
	let node: HTMLDivElement;

	afterEach(() => vi.restoreAllMocks());

	beforeEach(() => {
		vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
			matches: query === '(any-hover: hover) and (any-pointer: fine)',
			media: query, onchange: null, addListener() {}, removeListener() {},
			addEventListener() {}, removeEventListener() {}, dispatchEvent: () => true,
		}));
		node = document.createElement('div');
		vi.spyOn(node, 'getBoundingClientRect').mockReturnValue({
			left: 0, top: 0, width: 200, height: 100,
			right: 200, bottom: 100, x: 0, y: 0, toJSON: () => {}
		});
	});

	it('sets --glow-x and --glow-y on pointermove', () => {
		const action = cursorGlow(node);
		const event = new PointerEvent('pointermove', { clientX: 150, clientY: 40 });
		node.dispatchEvent(event);
		expect(node.style.getPropertyValue('--glow-x')).toBe('150px');
		expect(node.style.getPropertyValue('--glow-y')).toBe('40px');
		action.destroy();
	});

	it('resets CSS vars on pointerleave', () => {
		const action = cursorGlow(node);
		node.dispatchEvent(new PointerEvent('pointermove', { clientX: 100, clientY: 50 }));
		node.dispatchEvent(new PointerEvent('pointerleave'));
		expect(node.style.getPropertyValue('--glow-x')).toBe('');
		expect(node.style.getPropertyValue('--glow-y')).toBe('');
		action.destroy();
	});

	it('returns no-op on touch-only devices', () => {
		vi.mocked(window.matchMedia).mockImplementation((query) => ({
			matches: false, media: query, onchange: null, addListener() {}, removeListener() {},
			addEventListener() {}, removeEventListener() {}, dispatchEvent: () => true,
		}));
		const action = cursorGlow(node);
		node.dispatchEvent(new PointerEvent('pointermove', { clientX: 50, clientY: 50 }));
		expect(node.style.getPropertyValue('--glow-x')).toBe('');
		action.destroy();
	});

	it('stays active under reduced motion as SAFE-ALWAYS opacity-only light', async () => {
		vi.mocked(window.matchMedia).mockImplementation((query) => ({
			matches: true, media: query, onchange: null, addListener() {}, removeListener() {},
			addEventListener() {}, removeEventListener() {}, dispatchEvent: () => true,
		}));
		const action = cursorGlow(node);
		node.dispatchEvent(new PointerEvent('pointermove', { clientX: 50, clientY: 50 }));
		expect(node.style.getPropertyValue('--glow-x')).toBe('50px');
		action.destroy();
	});
});
