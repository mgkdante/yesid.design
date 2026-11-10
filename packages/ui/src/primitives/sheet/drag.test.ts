import { afterEach, expect, it, vi } from 'vitest';
import { sheetDrag } from './drag.js';
import type { SheetDetent } from './detents.js';

const detents: SheetDetent[] = [
	{ id: 'peek', size: '100px', label: 'Peek' },
	{ id: 'half', size: '50%', label: 'Half' },
	{ id: 'full', size: '90%', label: 'Full' },
];

let teardown: (() => void) | undefined;
afterEach(() => {
	teardown?.();
	document.body.replaceChildren();
});

function mount() {
	const node = document.createElement('div');
	const handle = document.createElement('span');
	node.append(handle);
	document.body.append(node);
	let captured: number | undefined;
	node.setPointerCapture = (id) => void (captured = id);
	node.hasPointerCapture = (id) => captured === id;
	node.releasePointerCapture = () => void (captured = undefined);
	node.getBoundingClientRect = () => ({ height: window.innerHeight / 2 }) as DOMRect;
	const change = vi.fn();
	const height = vi.fn();
	teardown = sheetDrag(node, () => ({ detents, change, height })).destroy;
	return { node, handle, change, height };
}

const pointer = (type: string, clientY: number, timeStamp: number) => {
	const event = new PointerEvent(type, { bubbles: true, pointerId: 1, isPrimary: true, button: 0, clientY });
	Object.defineProperty(event, 'timeStamp', { value: timeStamp });
	return event;
};

it('keeps a touch drag alive when the touched child loses its implicit capture', () => {
	const { node, handle, change, height } = mount();
	const start = 600;
	handle.dispatchEvent(pointer('pointerdown', start, 0));
	window.dispatchEvent(pointer('pointermove', start - 20, 300));
	expect(node.hasPointerCapture(1)).toBe(true);
	// Taking capture for the sheet releases the child's implicit touch capture; that event bubbles.
	handle.dispatchEvent(pointer('lostpointercapture', start - 20, 310));
	window.dispatchEvent(pointer('pointermove', start - 200, 600));
	expect(height).toHaveBeenLastCalledWith(window.innerHeight / 2 + 200);
	expect(height).not.toHaveBeenCalledWith(undefined);
	window.dispatchEvent(pointer('pointerup', start - 200, 900));
	expect(change).toHaveBeenCalledWith(2);
	expect(height).toHaveBeenLastCalledWith(undefined);
});

it('ends the drag without snapping when the sheet itself loses capture', () => {
	const { node, handle, change, height } = mount();
	handle.dispatchEvent(pointer('pointerdown', 600, 0));
	window.dispatchEvent(pointer('pointermove', 560, 300));
	node.dispatchEvent(pointer('lostpointercapture', 560, 310));
	window.dispatchEvent(pointer('pointerup', 300, 600));
	expect(change).not.toHaveBeenCalled();
	expect(height).toHaveBeenLastCalledWith(undefined);
});
