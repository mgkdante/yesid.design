export type SheetDetent = { id: string; size: `${number}px` | `${number}%`; label: string };

export function parseSize(size: SheetDetent['size']): { value: number; unit: 'px' | '%' } {
	const match = /^(\d+(?:\.\d+)?)(px|%)$/.exec(size);
	if (!match || Number(match[1]) <= 0) throw new Error(`Sheet detent size must be positive px or %: ${size}`);
	return { value: Number(match[1]), unit: match[2] as 'px' | '%' };
}

export function resolveHeights(detents: readonly SheetDetent[], viewport: number): number[] {
	return detents.map(({ size }) => {
		const { value, unit } = parseSize(size);
		return unit === '%' ? value * viewport / 100 : value;
	});
}

export function validateDetents(detents: readonly SheetDetent[], viewport = 800): void {
	if (detents.length < 2) throw new Error('Sheet requires at least two detents');
	if (new Set(detents.map(d => d.id)).size !== detents.length) throw new Error('Sheet detent ids must be unique');
	const heights = resolveHeights(detents, viewport);
	if (heights.some((height, i) => i > 0 && height <= heights[i - 1])) {
		throw new Error('Sheet detents must be ordered from smallest to largest at the current viewport');
	}
}

export function cssSize(size: SheetDetent['size']): string {
	return size.replace('%', 'dvh');
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
