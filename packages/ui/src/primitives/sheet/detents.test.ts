import { describe, expect, it } from 'vitest';
import { cssHeight, cssSize, parseSize, resolveHeights, snapIndex, validateDetents, type SheetDetent } from './detents.js';
const detents: readonly SheetDetent[] = [
	{ id: 'peek', size: '120px', label: 'Peek' },
	{ id: 'half', size: '50%', label: 'Half' },
	{ id: 'full', size: '90%', label: 'Full' },
];
describe('Sheet detent math', () => {
	it('resolves viewport percentages and retains CSS viewport units', () => {
		expect(resolveHeights(detents, 1000)).toEqual([120, 500, 900]);
		expect(cssSize('50%')).toBe('50dvh');
		expect(cssSize('120px')).toBe('120px');
	});
	it('keeps mixed-unit stops ordered on a short viewport instead of throwing', () => {
		expect(() => validateDetents(detents)).not.toThrow();
		expect(resolveHeights(detents, 200)).toEqual([120, 120, 180]);
		expect(cssHeight(detents, 0)).toBe('120px');
		expect(cssHeight(detents, 1)).toBe('max(120px, 50dvh)');
		expect(cssHeight(detents, 2)).toBe('max(120px, 50dvh, 90dvh)');
		expect(cssHeight([{ id: 'a', size: '30%', label: 'A' }, { id: 'b', size: '60%', label: 'B' }], 1)).toBe('60dvh');
	});
	it('rejects missing stops, duplicate ids, invalid sizes and descending heights', () => {
		expect(() => validateDetents([detents[0]])).toThrow('at least two');
		expect(() => validateDetents([detents[0], detents[0]])).toThrow('unique');
		expect(() => parseSize('-1px')).toThrow('positive');
		expect(() => validateDetents([...detents].reverse())).toThrow('smallest');
		expect(() => validateDetents([detents[1], { id: 'x', size: '40%', label: 'X' }])).toThrow('smallest');
		expect(() => validateDetents(detents)).not.toThrow();
	});
	it('selects nearest stops, directed flick stops and clamps at endpoints', () => {
		const heights = [120, 500, 900];
		expect(snapIndex(heights, 300, 0)).toBe(0);
		expect(snapIndex(heights, 350, 0)).toBe(1);
		expect(snapIndex(heights, 550, 0.5)).toBe(2);
		expect(snapIndex(heights, 550, -0.5)).toBe(1);
		expect(snapIndex(heights, 1200, 1)).toBe(2);
		expect(snapIndex(heights, 0, -1)).toBe(0);
	});
});
