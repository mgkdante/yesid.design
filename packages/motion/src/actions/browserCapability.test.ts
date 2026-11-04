import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => {
	vi.unstubAllGlobals();
	vi.resetModules();
});

function mountAll(actions: typeof import('./index.js')) {
	const node = document.createElement('button');
	node.textContent = 'Example';
	const mounts = [
		() => actions.boop(node),
		() => actions.cursorGlow(node),
		() => actions.sectionGlow(node),
		() => actions.cardParallax(node),
		() => actions.magnetic(node),
		() => actions.wordmarkHover(node, { dotEl: document.createElement('span') }),
	];
	for (const mount of mounts) {
		const action = mount();
		expect(typeof action.destroy).toBe('function');
		action.destroy();
	}
	expect(node.outerHTML).toBe('<button>Example</button>');
}

it('returns inert cleanup objects when matchMedia disappears after import', async () => {
	const actions = await import('./index.js');
	vi.stubGlobal('matchMedia', undefined);
	mountAll(actions);
});

it('can freshly import and mount all six effects without matchMedia', async () => {
	vi.resetModules();
	vi.stubGlobal('matchMedia', undefined);
	const actions = await import('./index.js');
	mountAll(actions);
	// The store initializes eagerly when policy is imported, and also reads
	// the browser capability when its first subscriber arrives.
	const { prefersReducedMotion } = await import('../stores/reducedMotion.js');
	const unsubscribe = prefersReducedMotion.subscribe(() => {});
	unsubscribe();
});
