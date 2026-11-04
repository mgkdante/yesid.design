import { tick, untrack } from 'svelte';
import { fromStore, writable } from 'svelte/store';
import { openSection, openSectionContaining } from './sections-registry.js';
import { flattenToc, type TocEntry } from './toc.js';

interface SectionJumpOptions {
	beforeReveal?: (id: string) => void | Promise<void>;
	behavior?: ScrollBehavior;
}

interface SectionRegistrationOptions {
	root?: Element | Document;
	/** Adds targets to the module-owned marked sections and registered ids. */
	selector?: string;
	landFragments?: boolean;
	activeId?: string;
	onActiveChange?: (id: string) => void;
}

interface SectionNavigationEvent {
	type: string;
	to: { url: URL } | null;
}

/** One page's section navigation, including disclosure opening and layout settlement. */
export interface SectionJump {
	readonly activeId: string;
	/** Replaces the previous registration. Its cleanup cancels pending jumps and observations. */
	register(entries: readonly TocEntry[], options?: SectionRegistrationOptions): () => void;
	/** Last request wins. Reduced motion always disables smooth scrolling. */
	jump(id: string, options?: SectionJumpOptions): Promise<boolean>;
}

const TARGETS = '[data-section-index], [data-toc]';
const LANDING_LINE = 0.25;
const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function reconcile(active: string, previous: readonly string[], next: readonly string[]): string {
	if (!next.length) return '';
	if (next.includes(active)) return active;
	const oldIndex = previous.indexOf(active);
	if (oldIndex < 0) return next[0];
	let winner = next[0];
	let distance = Infinity;
	for (const id of next) {
		const index = previous.indexOf(id);
		if (index >= 0 && Math.abs(index - oldIndex) < distance) {
			winner = id;
			distance = Math.abs(index - oldIndex);
		}
	}
	return winner;
}

function targetFor(root: Element | Document, id: string): HTMLElement | null {
	const choose = (targets: HTMLElement[]) => targets.find((target) => target.offsetParent !== null) ?? targets[0] ?? null;
	if (/^section-[0-9]+$/.test(id)) {
		const indexed = [...root.querySelectorAll<HTMLElement>('[data-section-index]')]
			.filter((element) => element.dataset.sectionIndex === id.slice(8));
		if (indexed.length) return choose(indexed);
	}
	const marked = [...root.querySelectorAll<HTMLElement>('[data-toc]')]
		.filter((element) => element.dataset.toc === id);
	if (marked.length) return choose(marked);
	if (root instanceof HTMLElement && root.id === id) return root;
	return choose([...root.querySelectorAll<HTMLElement>('[id]')].filter((element) => element.id === id));
}

function targetId(element: Element): string {
	const index = element.getAttribute('data-section-index');
	return index !== null ? 'section-' + index : element.getAttribute('data-toc') || element.id;
}

function land(target: HTMLElement, behavior: ScrollBehavior): void {
	const previous = target.style.scrollMarginTop;
	target.style.scrollMarginTop = LANDING_LINE * 100 + 'vh';
	try {
		target.scrollIntoView({ behavior, block: 'start' });
	} finally {
		target.style.scrollMarginTop = previous;
	}
}

function settle(target: HTMLElement, signal: AbortSignal): Promise<void> {
	if (signal.aborted || typeof requestAnimationFrame !== 'function') return Promise.resolve();
	let scroller: Element | null = null;
	for (let node = target.parentElement; node; node = node.parentElement) {
		if (['auto', 'scroll'].includes(getComputedStyle(node).overflowY)) {
			scroller = node;
			break;
		}
	}
	const measured = scroller ?? document.scrollingElement ?? document.documentElement;
	const grace = reducedMotion() ? 0 : 100;
	return new Promise((resolve) => {
		const started = performance.now();
		let frameId = 0;
		let last = -1;
		let stable = 0;
		let changed = false;
		let done = false;
		const finish = () => {
			if (done) return;
			done = true;
			cancelAnimationFrame(frameId);
			clearTimeout(timeout);
			signal.removeEventListener('abort', finish);
			resolve();
		};
		const frame = () => {
			const height = measured.scrollHeight;
			if (height === last) stable += 1;
			else {
				if (last !== -1) changed = true;
				stable = 0;
				last = height;
			}
			if (stable >= 2 && (changed || performance.now() - started >= grace)) finish();
			else frameId = requestAnimationFrame(frame);
		};
		const timeout = setTimeout(finish, 700);
		signal.addEventListener('abort', finish, { once: true });
		frameId = requestAnimationFrame(frame);
	});
}

function fragmentLinks(root: Element | Document, jump: (id: string) => void, cancelJump: () => void): () => void {
	let frame = 0;
	let pendingHref = '';
	let historyEpoch = 0;
	const clicks = new Map<MouseEvent, string>();
	const cancel = () => {
		cancelAnimationFrame(frame);
		pendingHref = '';
		cancelJump();
	};
	const historyChanged = (event: PopStateEvent) => {
		// Native fragment navigation can emit popstate before the click task runs.
		if (event.state === null && (location.href === pendingHref || [...clicks].some(([click, href]) => !click.defaultPrevented && location.href === href))) return;
		historyEpoch += 1;
		cancel();
	};
	let disposed = false;
	const clicked = (event: MouseEvent) => {
		if (event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		const target = event.target instanceof Element ? event.target : (event.target as Node | null)?.parentElement;
		const link = target?.closest<HTMLAnchorElement>('a[href]');
		if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
		const url = new URL(link.href);
		if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
		// Capture sees navigation outside the root and stopped bubbling. Wait for the
		// dispatch to finish so a consumer's preventDefault can keep its current jump.
		const epoch = historyEpoch;
		clicks.set(event, url.href);
		setTimeout(() => {
			clicks.delete(event);
			if (disposed || epoch !== historyEpoch || event.defaultPrevented) return;
			cancel();
			if (!root.contains(link)) return;
			if (!url.hash || url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search) return;
			let id: string;
			try { id = decodeURIComponent(url.hash.slice(1)); } catch { return; }
			pendingHref = url.href;
			frame = requestAnimationFrame(() => {
				if (location.href === pendingHref) jump(id);
			});
		}, 0);
	};
	document.addEventListener('click', clicked, true);
	window.addEventListener('popstate', historyChanged);
	return () => {
		disposed = true;
		clicks.clear();
		document.removeEventListener('click', clicked, true);
		window.removeEventListener('popstate', historyChanged);
		cancelAnimationFrame(frame);
		pendingHref = '';
	};
}

function createNavigation() {
	const active = fromStore(writable(''));
	let root: Element | Document | undefined;
	let previousIds: string[] = [];
	let request = 0;
	let pending: AbortController | undefined;
	let route = 0;
	let lifetime = 0;
	let pageDisposed = false;
	let notify: ((id: string) => void) | undefined;
	let stopCurrent = () => {};
	let refreshCurrent = () => {};
	const cancelRequest = () => {
		request += 1;
		pending?.abort();
		pending = undefined;
	};
	const setActive = (id: string) => {
		active.current = id;
		untrack(() => notify?.(id));
	};

	const controller: SectionJump = {
		get activeId() { return active.current; },
		register(entries, options = {}) {
			if (typeof document === 'undefined') return () => {};
			const scope = options.root ?? document;
			if (root && root !== scope) cancelRequest();
			stopCurrent();
			const epoch = ++lifetime;
			root = scope;
			pageDisposed = false;
			notify = options.onActiveChange;
			const ids = flattenToc([...entries]).map((entry) => entry.id);
			setActive(reconcile(options.activeId ?? untrack(() => active.current), previousIds, ids));
			previousIds = ids;
			let disposed = false;
			let observer: IntersectionObserver | undefined;
			let stopLinks: (() => void) | undefined;
			const refresh = () => {
				if (disposed) return;
				observer?.disconnect();
				const selector = options.selector ? TARGETS + ', ' + options.selector : TARGETS;
				const targets = new Set(scope.querySelectorAll<HTMLElement>(selector));
				for (const id of ids) {
					const target = targetFor(scope, id);
					if (target) targets.add(target);
				}
				if (!targets.size || typeof IntersectionObserver === 'undefined') return;
				const height = window.innerHeight;
				observer = new IntersectionObserver((records) => {
					if (disposed) return;
					for (const record of records) {
						if (!record.isIntersecting) continue;
						const id = targetId(record.target);
						if (id) setActive(id);
					}
				}, { rootMargin: '-' + height * LANDING_LINE + 'px 0px -' + (height * (1 - LANDING_LINE) - 1) + 'px 0px' });
				targets.forEach((target) => observer!.observe(target));
			};
			refreshCurrent = refresh;
			void tick().then(() => {
				if (disposed) return;
				refresh();
				window.addEventListener('resize', refresh);
				if (options.landFragments) stopLinks = fragmentLinks(scope, (id) => { void controller.jump(id); }, cancelRequest);
			});
			const stop = () => {
				if (disposed) return;
				disposed = true;
				observer?.disconnect();
				window.removeEventListener('resize', refresh);
				stopLinks?.();
				if (lifetime === epoch) {
					pageDisposed = true;
					refreshCurrent = () => {};
					notify = undefined;
					// A reactive effect cleans up immediately before registering its updated entries.
					// A same-root replacement in this flush keeps the reveal; real disposal cancels it.
					void Promise.resolve().then(() => {
						if (lifetime === epoch) cancelRequest();
					});
				}
			};
			stopCurrent = stop;
			return stop;
		},
		async jump(id, options = {}) {
			cancelRequest();
			if (pageDisposed) return false;
			const generation = request;
			const abort = new AbortController();
			pending = abort;
			try {
				await options.beforeReveal?.(id);
				await tick();
				if (pageDisposed || generation !== request || typeof document === 'undefined') return false;
				const scope = root ?? document;
				let target = targetFor(scope, id);
				if (!target?.isConnected) return false;
				openSection(id, scope);
				openSectionContaining(target);
				await tick();
				if (pageDisposed || generation !== request) return false;
				target = targetFor(scope, id);
				if (!target?.isConnected) return false;
				refreshCurrent();
				await settle(target, abort.signal);
				if (pageDisposed || generation !== request || !target.isConnected) return false;
				land(target, reducedMotion() ? 'auto' : options.behavior ?? 'smooth');
				setActive(id);
				return true;
			} finally {
				if (pending === abort) pending = undefined;
			}
		},
	};
	const navigated = (event: SectionNavigationEvent) => {
		const generation = ++route;
		cancelRequest();
		if (event.type === 'popstate' || !event.to?.url.hash) return;
		let id: string;
		try { id = decodeURIComponent(event.to.url.hash.slice(1)); } catch { return; }
		void tick().then(() => {
			if (generation === route) void controller.jump(id);
		});
	};
	return { controller, navigated };
}

/** Creates a controller without a router dependency. Register its entries in the page lifecycle. */
export function createSectionJump(): SectionJump {
	return createNavigation().controller;
}

/** Call during component initialization with SvelteKit's afterNavigate; setup order is internal. */
export function useSectionJump(afterNavigate: (callback: (event: SectionNavigationEvent) => void) => void): SectionJump {
	const { controller, navigated } = createNavigation();
	afterNavigate(navigated);
	return controller;
}

/** @internal Default for standalone TOC views; frames and routed pages can pass their controller. */
export const defaultSectionJump = createSectionJump();
