import { resolveHeights, snapIndex, validateDetents, type SheetDetent } from './detents.js';

/** Native scrolling stops at its own scroll container, before content's touch-action. */
function excluded(target: Element, content: HTMLElement): boolean {
	if (target.closest('button,a[href],input,select,textarea,[contenteditable],[data-sheet-no-drag]')) return true;
	if (target.closest('[role=slider]:not([data-sheet-handle])')) return true;
	for (let node: Element | null = target; node && node !== content; node = node.parentElement) {
		if (/auto|scroll/.test(getComputedStyle(node).overflowY) && node.scrollHeight > node.clientHeight) return true;
	}
	return false;
}

export function sheetDrag(node: HTMLElement, read: () => {
	detents: readonly SheetDetent[];
	change: (index: number) => void;
	height: (height: number | undefined) => void;
}) {
	let drag: { id: number; y: number; start: number; heights: number[]; active: boolean; samples: { y: number; t: number }[] } | undefined;
	let suppressClick = false;
	function down(e: PointerEvent) {
		if (read().detents.length < 2) return;
		if (!e.isPrimary || e.button !== 0 || !(e.target instanceof Element) || excluded(e.target, node)) return;
		validateDetents(read().detents, window.innerHeight);
		drag = { id: e.pointerId, y: e.clientY, start: node.getBoundingClientRect().height,
			heights: resolveHeights(read().detents, window.innerHeight), active: false,
			samples: [{ y: e.clientY, t: e.timeStamp }] };
		suppressClick = false;
	}
	function move(e: PointerEvent) {
		if (!drag || e.pointerId !== drag.id) return;
		if (!drag.active && Math.abs(e.clientY - drag.y) < 6) return;
		if (!drag.active) { node.setPointerCapture(e.pointerId); drag.active = true; }
		e.preventDefault();
		drag.samples = [...drag.samples.filter(s => e.timeStamp - s.t <= 100), { y: e.clientY, t: e.timeStamp }];
		read().height(Math.max(drag.heights[0], Math.min(drag.heights.at(-1)!, drag.start + drag.y - e.clientY)));
	}
	function finish(e: PointerEvent) {
		if (!drag || e.pointerId !== drag.id) return;
		const current = drag;
		drag = undefined;
		if (!current.active) return;
		suppressClick = e.type === 'pointerup';
		if (node.hasPointerCapture(e.pointerId)) node.releasePointerCapture(e.pointerId);
		if (e.type === 'pointerup') {
			const sample = current.samples.find(s => e.timeStamp - s.t <= 100);
			const velocity = sample && e.timeStamp > sample.t ? (sample.y - e.clientY) / (e.timeStamp - sample.t) : 0;
			read().change(snapIndex(current.heights, current.start + current.y - e.clientY, velocity));
		}
		read().height(undefined);
	}
	function click(e: MouseEvent) {
		if (suppressClick) { e.preventDefault(); e.stopImmediatePropagation(); suppressClick = false; }
	}
	node.addEventListener('pointerdown', down);
	window.addEventListener('pointermove', move);
	window.addEventListener('pointerup', finish);
	window.addEventListener('pointercancel', finish);
	node.addEventListener('lostpointercapture', finish);
	node.addEventListener('click', click, true);
	return { destroy() {
		node.removeEventListener('pointerdown', down);
		node.removeEventListener('lostpointercapture', finish);
		window.removeEventListener('pointermove', move);
		window.removeEventListener('pointerup', finish);
		window.removeEventListener('pointercancel', finish);
		node.removeEventListener('click', click, true);
	} };
}
