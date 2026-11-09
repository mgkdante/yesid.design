export type SheetDetent = { id: string; size: `${number}px` | `${number}%`; label: string };

export function parseSize(size: SheetDetent['size']): { value: number; unit: 'px' | '%' } {
	const match = /^(\d+(?:\.\d+)?)(px|%)$/.exec(size);
	if (!match || Number(match[1]) <= 0) throw new Error(`Sheet detent size must be positive px or %: ${size}`);
	return { value: Number(match[1]), unit: match[2] as 'px' | '%' };
}

/**
 * Pixel heights at a viewport. A stop never resolves below an earlier one, so mixed units that
 * cross on a short viewport (120px vs 50%) collapse together instead of reversing.
 */
export function resolveHeights(detents: readonly SheetDetent[], viewport: number): number[] {
	let floor = 0;
	return detents.map(({ size }) => {
		const { value, unit } = parseSize(size);
		floor = Math.max(floor, unit === '%' ? value * viewport / 100 : value);
		return floor;
	});
}

/** Structural checks only: viewport-dependent order between px and % stops cannot throw at runtime. */
export function validateDetents(detents: readonly SheetDetent[]): void {
	if (detents.length < 2) throw new Error('Sheet requires at least two detents');
	if (new Set(detents.map(d => d.id)).size !== detents.length) throw new Error('Sheet detent ids must be unique');
	const last: Partial<Record<'px' | '%', number>> = {};
	for (const { size } of detents) {
		const { value, unit } = parseSize(size);
		if (value <= (last[unit] ?? 0)) throw new Error('Sheet detents must be ordered from smallest to largest');
		last[unit] = value;
	}
}

export function cssSize(size: SheetDetent['size']): string {
	return size.replace('%', 'dvh');
}

/** CSS height for stop `index`, floored by every earlier stop, matching resolveHeights. */
export function cssHeight(detents: readonly SheetDetent[], index: number): string {
	const units = new Set(detents.slice(0, index + 1).map(d => parseSize(d.size).unit));
	if (units.size === 1) return cssSize(detents[index].size);
	return `max(${detents.slice(0, index + 1).map(d => cssSize(d.size)).join(', ')})`;
}

/** Positive velocity means growing. Flicks choose the next stop beyond release height. */
export function snapIndex(heights: readonly number[], height: number, velocity: number): number {
	if (velocity >= 0.5) {
		const next = heights.findIndex(stop => stop > height);
		return next < 0 ? heights.length - 1 : next;
	}
	if (velocity <= -0.5) {
		for (let i = heights.length - 1; i >= 0; i--) if (heights[i] < height) return i;
		return 0;
	}
	return heights.reduce((best, stop, i) => Math.abs(stop - height) < Math.abs(heights[best] - height) ? i : best, 0);
}
