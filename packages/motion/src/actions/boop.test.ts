import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

function mockMatchMedia(reduce: boolean, pointer = true) {
	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		value: vi.fn().mockImplementation((query: string) => ({
			matches: query === '(prefers-reduced-motion: reduce)' ? reduce : pointer,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn()
		}))
	});
}

describe('boop action', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		mockMatchMedia(false); // Animations enabled by default.
		vi.resetModules();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('returns an object with update and destroy methods', async () => {
		const { boop } = await import('./boop.js');
		const el = document.createElement('button');
		const result = boop(el);
		expect(typeof result.update).toBe('function');
		expect(typeof result.destroy).toBe('function');
	});

	it('sets scale on mouseenter', async () => {
		const { boop } = await import('./boop.js');
		const el = document.createElement('button');
		boop(el, { scale: 1.05 });

		el.dispatchEvent(new MouseEvent('mouseenter'));

		expect(el.style.scale).toBe('1.05');
	});

	it('resets scale after the timing duration', async () => {
		const { boop } = await import('./boop.js');
		const el = document.createElement('button');
		boop(el, { scale: 1.1, timing: 300 });

		el.dispatchEvent(new MouseEvent('mouseenter'));
		expect(el.style.scale).toBe('1.1');

		vi.advanceTimersByTime(300);

		expect(el.style.scale).toBe('');
	});

	it('includes rotation when specified', async () => {
		const { boop } = await import('./boop.js');
		const el = document.createElement('button');
		boop(el, { rotation: 10 });

		el.dispatchEvent(new MouseEvent('mouseenter'));

		expect(el.style.rotate).toBe('10deg');
	});

	it('clears transform on destroy cleanup', async () => {
		const { boop } = await import('./boop.js');
		const el = document.createElement('button');
		const action = boop(el, { scale: 1.05, timing: 500 });

		el.dispatchEvent(new MouseEvent('mouseenter'));
		// destroy before timeout fires
		action.destroy();

		// Timeout should be cancelled — advancing time should not throw.
		vi.advanceTimersByTime(500);
		expect(el.style.scale).toBe('');
	});

	it('boops under prefers-reduced-motion at the SAFE-ALWAYS default scale of ≤1.05', async () => {
		mockMatchMedia(true);
		vi.resetModules();
		const { boop } = await import('./boop.js');
		const el = document.createElement('button');
		boop(el);

		el.dispatchEvent(new MouseEvent('mouseenter'));

		expect(el.style.scale).toBe('1.05');
	});

	it('update() changes the params applied on next hover', async () => {
		const { boop } = await import('./boop.js');
		const el = document.createElement('button');
		const action = boop(el, { scale: 1.05 });

		action.update({ scale: 1.2 });
		el.dispatchEvent(new MouseEvent('mouseenter'));

		expect(el.style.scale).toBe('1.2');
		action.destroy();
	});

	it('owns scale and rotation without resetting another action\'s transform', async () => {
		const { boop } = await import('./boop.js');
		const el = document.createElement('button');
		el.style.scale = '1.02';
		el.style.rotate = '2deg';
		el.style.transition = 'color 150ms linear';
		const action = boop(el, { scale: 1.04, rotation: 5 });
		el.dispatchEvent(new MouseEvent('mouseenter'));
		// Another action owns this channel while a press is held.
		el.style.transform = 'scale(0.94)';
		expect(el.style.scale).toBe('1.04');
		expect(el.style.rotate).toBe('5deg');
		expect(el.style.transition).toContain('color 150ms linear');
		expect(el.style.transition).not.toContain('transform');
		vi.advanceTimersByTime(650);
		expect(el.style.scale).toBe('1.02');
		expect(el.style.rotate).toBe('2deg');
		expect(el.style.transform).toBe('scale(0.94)');
		action.destroy();
		expect(el.style.transition).toBe('color 150ms linear');
		expect(el.style.transform).toBe('scale(0.94)');
	});

	it('destroy restores only its own styles and cancels its reset timer', async () => {
		const { boop } = await import('./boop.js');
		const el = document.createElement('button');
		const action = boop(el);
		el.dispatchEvent(new MouseEvent('mouseenter'));
		el.style.transform = 'scale(0.94)';
		action.destroy();
		vi.advanceTimersByTime(650);
		expect(el.style.scale).toBe('');
		expect(el.style.rotate).toBe('');
		expect(el.style.transition).toBe('');
		expect(el.style.transform).toBe('scale(0.94)');
	});
});

describe('boop device gating', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		mockMatchMedia(false);
		vi.resetModules();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('bails on touch-only device (no listener attached)', async () => {
		mockMatchMedia(false, false);

		const { boop } = await import('./boop.js');
		const el = document.createElement('div');
		const addSpy = vi.spyOn(el, 'addEventListener');
		boop(el);
		expect(addSpy).not.toHaveBeenCalled();
	});

	it('returns a valid destroy-shaped object on touch-only bail', async () => {
		mockMatchMedia(false, false);

		const { boop } = await import('./boop.js');
		const el = document.createElement('div');
		const result = boop(el);
		expect(typeof result.destroy).toBe('function');
	});
});
