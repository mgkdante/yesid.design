// Moves the header links out of the pill's row when the pill would not fit its header.
// Hidden links keep their size (they are only taken out of the row), so the next measurement can
// add them back without observing the pill itself, which would make the observer loop.

/** The smallest gap kept between the pill and each side of the header. */
const MIN_GAP = 4;
const OVERFLOW = 'data-links-overflow';

export interface LinksFitParams {
	/** Keep the current state, for example while the open menu collapses the links. */
	paused: boolean;
}

function outerWidth(element: HTMLElement): number {
	if (!element.offsetWidth) return 0;
	const style = getComputedStyle(element);
	return element.getBoundingClientRect().width + parseFloat(style.marginLeft) + parseFloat(style.marginRight);
}

export function linksFit(pill: HTMLElement, params: LinksFitParams) {
	let paused = params.paused;
	const root = pill.closest<HTMLElement>('[data-slot="site-header"]') ?? pill.parentElement!;
	const parts = () => [...pill.querySelectorAll<HTMLElement>('.nav-links-part')];

	function measure(): void {
		if (paused) return;
		const hidden = pill.hasAttribute(OVERFLOW) ? parts().reduce((sum, part) => sum + outerWidth(part), 0) : 0;
		const needed = pill.getBoundingClientRect().width + hidden;
		const style = getComputedStyle(root);
		const room = root.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - 2 * MIN_GAP;
		const overflow = needed > room;
		pill.toggleAttribute(OVERFLOW, overflow);
		for (const part of parts()) {
			part.style.position = overflow ? 'absolute' : '';
			part.style.visibility = overflow ? 'hidden' : '';
			part.style.pointerEvents = overflow ? 'none' : '';
		}
	}

	const observer = new ResizeObserver(measure);
	observer.observe(root);
	for (const child of pill.querySelectorAll<HTMLElement>('.nav-wordmark, .nav-links')) observer.observe(child);
	void document.fonts?.ready.then(measure);

	return {
		update(next: LinksFitParams) {
			paused = next.paused;
			measure();
		},
		destroy() {
			observer.disconnect();
		},
	};
}
