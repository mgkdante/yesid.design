// use:boop — brief transform on hover that resets itself after ~300ms.
//
// WHY a boop instead of a standard hover scale:
//   A standard hover state stays active as long as the cursor is over the element.
//   A boop fires once — like a tap — then immediately returns to rest. This creates a
//   "alive" feeling: the element responds to attention without staying in a transformed
//   state that can look stuck or heavy. Concept from joshwcomeau.com.
// SAFE-ALWAYS tier: the default ≤1.05 scale is user-initiated and self-resetting,
// so it runs under prefers-reduced-motion.
//
// Usage: <button use:boop={{ scale: 1.05, rotation: 5, timing: 300 }}>

import { shouldAnimatePointerEffect } from '../policy.js';

export interface BoopParams {
	/** Scale multiplier. Default: 1.05 */
	scale?: number;
	/** Rotation in degrees. Default: 0 */
	rotation?: number;
	/** How long the boop transform stays before resetting, in ms. Default: 300 */
	timing?: number;
}

export function boop(node: HTMLElement, params: BoopParams = {}) {
	if (!shouldAnimatePointerEffect('safe-always')) return { update() {}, destroy() {} };

	let { scale = 1.05, rotation = 0, timing = 300 } = params;
	let timeoutId: ReturnType<typeof setTimeout> | null = null;
	const initialScale = node.style.scale;
	const initialRotate = node.style.rotate;
	const initialTransition = node.style.transition;
	const baseTransition = initialTransition || getComputedStyle(node).transition;

	function reset() {
		node.style.scale = initialScale;
		node.style.rotate = initialRotate;
	}

	function applyBoop() {
		if (timeoutId !== null) clearTimeout(timeoutId);

		// Hover owns the individual properties. Press feedback owns transform,
		// so this timer and these transitions cannot erase or delay a held press.
		node.style.transition = [
			baseTransition === 'none' ? '' : baseTransition,
			`scale ${timing}ms var(--ease-bounce)`,
			`rotate ${timing}ms var(--ease-bounce)`,
		].filter(Boolean).join(', ');
		node.style.scale = String(scale);
		node.style.rotate = `${rotation}deg`;

		timeoutId = setTimeout(() => {
			reset();
			timeoutId = null;
		}, timing);
	}

	node.addEventListener('mouseenter', applyBoop);

	return {
		update(newParams: BoopParams) {
			scale = newParams.scale ?? 1.05;
			rotation = newParams.rotation ?? 0;
			timing = newParams.timing ?? 300;
		},
		destroy() {
			node.removeEventListener('mouseenter', applyBoop);
			if (timeoutId !== null) clearTimeout(timeoutId);
			reset();
			node.style.transition = initialTransition;
		}
	};
}
