// pressBounce — Svelte action for tactile tap-press feedback on touch devices.
// Layer 2 of the two-layer tactile-feedback system.
//
// Gated by:
//   - Touch capability without a hover-capable fine pointer.
// Pointer-capable devices, including hybrids, use their CSS press baseline.
//
// Reduced-motion: pressBounce stays active because it is <200ms scale feedback
// on user action, not a vestibular trigger.
//
// Pair with class="tap-press" (Layer 1 CSS baseline) for layered feedback.
// Layer 1 is the optional @yesid/motion/tap-feedback.css public import and
// remains copyable from packages/motion/tap-feedback.css.

import { gsap } from '../utils/gsap';
import { shouldAnimate } from '../policy.js';
import { durationSec } from '../tokens';

type ActionReturn = { destroy(): void };

export function pressBounce(node: HTMLElement): ActionReturn {
	if (!shouldAnimate('safe-always', 'touch-only')) {
		return { destroy() {} };
	}

	const onDown = () => {
		gsap.killTweensOf(node);
		gsap.to(node, {
			scale: 0.94,
			duration: durationSec('instant'),
			ease: 'power2.out',
		});
	};

	const onUp = () => {
		gsap.killTweensOf(node);
		gsap.to(node, {
			scale: 1,
			duration: durationSec('fast'),
			ease: 'back.out(2)', // bounce overshoot
		});
	};

	node.addEventListener('pointerdown', onDown);
	node.addEventListener('pointerup', onUp);
	node.addEventListener('pointercancel', onUp);

	return {
		destroy() {
			node.removeEventListener('pointerdown', onDown);
			node.removeEventListener('pointerup', onUp);
			node.removeEventListener('pointercancel', onUp);
			gsap.killTweensOf(node);
		},
	};
}
