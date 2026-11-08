import { Storage } from 'happy-dom';
import { expect } from 'vitest';

// Node 25+ ships its own Web Storage globals, and Vitest keeps them over happy-dom's. Node's
// localStorage is undefined without --localstorage-file, so DOM tests get happy-dom storage.
if (typeof document !== 'undefined') {
	for (const name of ['localStorage', 'sessionStorage'] as const) {
		if (!(globalThis[name] instanceof Storage)) {
			Object.defineProperty(globalThis, name, { value: new Storage(), configurable: true, writable: true });
		}
	}
}

expect.extend({
	toBeInTheDocument(received: Node | null) {
		const pass = received?.ownerDocument?.documentElement.contains(received) ?? false;
		return {
			pass,
			message: () =>
				pass
					? 'expected the element not to be in the document'
					: 'expected the element to be in the document',
		};
	},
});
