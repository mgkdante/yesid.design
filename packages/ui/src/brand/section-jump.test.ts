import { fireEvent, render, within } from '@testing-library/svelte';
import { createRawSnippet, tick } from 'svelte';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import CollapsibleSection from './CollapsibleSection.svelte';
import SectionsToggle from './SectionsToggle.svelte';
import TocNav from './TocNav.svelte';
import { createSectionJump, useSectionJump } from './section-jump.js';
import type { TocEntry } from './toc.js';
import NestedSections from './test-fixtures/NestedSections.svelte';
import { sections } from '../state/sections.svelte.js';

const entries = (...ids: string[]): TocEntry[] => ids.map((id) => ({ id, title: id, level: 2, children: [] }));
const cleanups: (() => void)[] = [];
let reduced = true;
let observers: { targets: Element[]; report: IntersectionObserverCallback; disconnect: ReturnType<typeof vi.fn>; margin?: string }[];

it.each(['nested-heading', 'inner', 'section-2'])('opens the ancestor chain for %s after Collapse all, leaving siblings closed', async (id) => {
	const view = render(NestedSections);
	const outer = within(view.container).getByRole('button', { name: 'Outer' });
	const inner = within(view.container).getByRole('button', { name: 'Inner' });
	const sibling = within(view.container).getByRole('button', { name: 'Nested sibling' });
	const unrelated = within(view.container).getByRole('button', { name: 'Unrelated' });
	sections.collapseAll();
	await tick();
	const target = id === 'inner'
		? view.container.querySelector<HTMLElement>('[data-toc="inner"]')!
		: id === 'section-2'
			? view.container.querySelector<HTMLElement>('[data-section-index="2"]')!
			: view.container.querySelector<HTMLElement>('#nested-heading')!;
	target.scrollIntoView = vi.fn();
	expect(target.closest('[inert], [aria-hidden="true"]')).not.toBeNull();
	const navigation = createSectionJump();
	register(navigation, ['outer', 'inner', 'section-2', 'nested-heading', 'nested-sibling', 'unrelated']);
	expect(await navigation.jump(id)).toBe(true);
	expect(target.scrollIntoView).toHaveBeenCalledOnce();
	expect(outer.getAttribute('aria-expanded')).toBe('true');
	expect(inner.getAttribute('aria-expanded')).toBe('true');
	expect(sibling.getAttribute('aria-expanded')).toBe('false');
	expect(unrelated.getAttribute('aria-expanded')).toBe('false');
	expect(target.closest('[inert], [aria-hidden="true"]')).toBeNull();
});

it('opening the outer section leaves nested descendants collapsed', async () => {
	const view = render(NestedSections);
	const outer = within(view.container).getByRole('button', { name: 'Outer' });
	const inner = within(view.container).getByRole('button', { name: 'Inner' });
	const sibling = within(view.container).getByRole('button', { name: 'Nested sibling' });
	sections.collapseAll();
	await tick();
	view.container.querySelector<HTMLElement>('[data-toc="outer"]')!.scrollIntoView = vi.fn();
	const navigation = createSectionJump();
	register(navigation, ['outer', 'inner']);
	expect(await navigation.jump('outer')).toBe(true);
	expect(outer.getAttribute('aria-expanded')).toBe('true');
	expect(inner.getAttribute('aria-expanded')).toBe('false');
	expect(sibling.getAttribute('aria-expanded')).toBe('false');
});

it('preserves a reveal when the same root gets new entries and options', async () => {
	const view = section('updated');
	const navigation = createSectionJump();
	register(navigation, ['old'], { root: view.container, landFragments: true });
	await tick();
	const landed = await navigation.jump('updated', {
		beforeReveal: () => {
			register(navigation, ['updated'], { root: view.container, selector: 'h3', landFragments: false });
		},
	});
	expect(landed).toBe(true);
	expect(view.target.scrollIntoView).toHaveBeenCalledOnce();
});

it('cancels a reveal when registration moves to a different root', async () => {
	const first = section('first-root');
	const second = section('second-root');
	const navigation = createSectionJump();
	register(navigation, ['first-root'], { root: first.container });
	const landed = await navigation.jump('second-root', {
		beforeReveal: () => {
			register(navigation, ['second-root'], { root: second.container });
		},
	});
	expect(landed).toBe(false);
	expect(second.target.scrollIntoView).not.toHaveBeenCalled();
});

it('does not land after disposal even if settlement has already queued its continuation', async () => {
	const view = section('disposed-after-settle');
	const navigation = createSectionJump();
	const stop = register(navigation, ['disposed-after-settle']);
	await tick();
	const frames: FrameRequestCallback[] = [];
	vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((callback) => {
		frames.push(callback);
		return frames.length;
	});
	const landed = navigation.jump('disposed-after-settle');
	await vi.waitFor(() => expect(frames.length).toBeGreaterThan(0));
	while (frames.length) frames.shift()!(performance.now());
	stop();
	expect(await landed).toBe(false);
	expect(view.target.scrollIntoView).not.toHaveBeenCalled();
});

beforeEach(() => {
	reduced = true;
	observers = [];
	vi.spyOn(window, 'matchMedia').mockImplementation(() => ({ matches: reduced }) as MediaQueryList);
	vi.stubGlobal('IntersectionObserver', function (report: IntersectionObserverCallback, options?: IntersectionObserverInit) {
		const instance = { targets: [] as Element[], report, disconnect: vi.fn(), margin: options?.rootMargin };
		observers.push(instance);
		return { observe: (target: Element) => instance.targets.push(target), disconnect: instance.disconnect };
	});
});

it('keeps the desktop adapter reactive through the shared controller', async () => {
	section('one');
	const second = section('two');
	const jump = createSectionJump();
	register(jump, ['one', 'two']);
	const view = render(TocNav, { props: { entries: entries('one', 'two'), navigation: jump, heading: 'Contents' } });
	const button = within(view.container).getByRole('button', { name: 'two' });
	await fireEvent.click(button);
	await vi.waitFor(() => expect(button.getAttribute('aria-current')).toBe('location'));
	expect(second.trigger.getAttribute('aria-expanded')).toBe('true');
});

it('ignores canceled, modified, download and external fragment links', async () => {
	history.replaceState(null, '', '/#ignored');
	const view = section('ignored');
	const link = document.body.appendChild(document.createElement('a'));
	link.href = '#ignored';
	const jump = createSectionJump();
	register(jump, ['ignored'], { landFragments: true });
	await tick();
	const cancel = (event: Event) => event.preventDefault();
	link.addEventListener('click', cancel);
	link.click();
	link.removeEventListener('click', cancel);
	link.setAttribute('download', '');
	link.click();
	link.removeAttribute('download');
	for (const modifier of ['ctrlKey', 'metaKey', 'shiftKey', 'altKey']) {
		link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, [modifier]: true }));
	}
	link.href = 'https://other.test/#ignored';
	link.click();
	await new Promise(requestAnimationFrame);
	expect(view.target.scrollIntoView).not.toHaveBeenCalled();
	link.remove();
});

it('reconciles a removed active entry to its nearest surviving neighbor', () => {
	const jump = createSectionJump();
	register(jump, ['overview', 'intro', 'coverage', 'freshness', 'envelope'], { activeId: 'coverage' });
	register(jump, ['overview', 'envelope', 'freshness']);
	expect(jump.activeId).toBe('freshness');
});
afterEach(() => {
	for (const stop of cleanups.splice(0)) stop();
	history.replaceState(null, '', '/');
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	vi.useRealTimers();
});

function section(id: string, open = false, nestedId = id + '-heading') {
	const children = createRawSnippet(() => ({ render: () => '<h3 id="' + nestedId + '">Nested heading</h3>' }));
	const view = render(CollapsibleSection, { props: { title: id, anchor: id, open, children } });
	const target = view.container.querySelector<HTMLElement>('[data-toc]')!;
	target.scrollIntoView = vi.fn();
	const heading = document.getElementById(nestedId)!;
	heading.scrollIntoView = vi.fn();
	const trigger = within(view.container).getByRole('button', { name: id });
	return { ...view, target, heading, trigger };
}
function register(jump: ReturnType<typeof createSectionJump>, ids: string[], options: Parameters<typeof jump.register>[1] = {}) {
	const stop = jump.register(entries(...ids), options);
	cleanups.push(stop);
	return stop;
}

it('opens only the chosen real section without clicking a trigger or relying on classes', async () => {
	const first = section('first');
	const second = section('second');
	const controls = render(SectionsToggle, { props: { copy: { collapse: 'Collapse all', expand: 'Expand all', collapseTitle: 'Collapse sections', expandTitle: 'Expand sections' } } });
	const click = vi.spyOn(first.trigger, 'click');
	first.container.querySelectorAll('[class]').forEach((element) => element.removeAttribute('class'));
	const jump = createSectionJump();
	register(jump, ['first', 'second']);
	await expect(jump.jump('first')).resolves.toBe(true);
	expect(first.trigger.getAttribute('aria-expanded')).toBe('true');
	expect(second.trigger.getAttribute('aria-expanded')).toBe('false');
	expect(click).not.toHaveBeenCalled();
	expect(controls.getByRole('button', { name: 'Collapse all' })).toBeTruthy();
	expect(jump.activeId).toBe('first');
});

it('does not open a matching anchor in another registered page scope', async () => {
	const first = section('shared', false, 'first-heading');
	const other = section('shared', false, 'other-heading');
	const jump = createSectionJump();
	register(jump, ['shared'], { root: first.container });
	await jump.jump('shared');
	expect(first.trigger.getAttribute('aria-expanded')).toBe('true');
	expect(other.trigger.getAttribute('aria-expanded')).toBe('false');
});

it('opens the owner of a nested heading and lands on the shared 25% line', async () => {
	const view = section('parent');
	let margin = '';
	view.heading.scrollIntoView = vi.fn(() => { margin = view.heading.style.scrollMarginTop; });
	const jump = createSectionJump();
	register(jump, ['parent', 'parent-heading']);
	await expect(jump.jump('parent-heading')).resolves.toBe(true);
	expect(view.trigger.getAttribute('aria-expanded')).toBe('true');
	expect(margin).toBe('25vh');
	expect(view.heading.style.scrollMarginTop).toBe('');
	const observer = observers.at(-1)!;
	expect(observer.margin).toBe('-' + window.innerHeight * 0.25 + 'px 0px -' + (window.innerHeight * 0.75 - 1) + 'px 0px');
	expect(observer.targets).toContain(view.heading);
});

it('tracks and reconciles active ids, refreshes on resize and releases observers', async () => {
	const a = section('a'); section('b'); section('c');
	const changed = vi.fn();
	const jump = createSectionJump();
	const stop = register(jump, ['a', 'b', 'c'], { activeId: 'b', onActiveChange: changed });
	await tick();
	expect(jump.activeId).toBe('b');
	const rect = a.target.getBoundingClientRect();
	observers.at(-1)!.report([{ target: a.target, isIntersecting: true, intersectionRatio: 1, boundingClientRect: rect, intersectionRect: rect, rootBounds: rect, time: 0 }], {} as IntersectionObserver);
	expect(jump.activeId).toBe('a');
	expect(changed).toHaveBeenLastCalledWith('a');
	window.dispatchEvent(new Event('resize'));
	expect(observers[0].disconnect).toHaveBeenCalled();
	register(jump, ['b', 'c']);
	await tick();
	expect(jump.activeId).toBe('b');
	stop();
	expect(jump.activeId).toBe('b');
	register(jump, []);
	expect(jump.activeId).toBe('');
});

it('resolves numbered sections and arbitrary anchors without selector interpolation', async () => {
	const numbered = section('numeric');
	numbered.target.setAttribute('data-section-index', '4');
	const odd = 'say "hi"] [x=y';
	const other = section('safe');
	await other.rerender({ anchor: odd });
	const jump = createSectionJump();
	register(jump, ['section-4', odd]);
	expect(await jump.jump('section-4')).toBe(true);
	expect(await jump.jump(odd)).toBe(true);
	expect(numbered.target.scrollIntoView).toHaveBeenCalledOnce();
	expect(other.target.scrollIntoView).toHaveBeenCalledOnce();
	expect(await jump.jump('missing')).toBe(false);
});

it('owns reduced motion even when the caller requests smooth scrolling', async () => {
	const view = section('motion', true);
	const jump = createSectionJump();
	register(jump, ['motion']);
	await jump.jump('motion', { behavior: 'smooth' });
	expect(view.target.scrollIntoView).toHaveBeenLastCalledWith({ behavior: 'auto', block: 'start' });
	reduced = false;
	await jump.jump('motion');
	expect(view.target.scrollIntoView).toHaveBeenLastCalledWith({ behavior: 'smooth', block: 'start' });
});

it('reveals late content before lookup and cancels superseded or unmounted requests', async () => {
	const jump = createSectionJump();
	register(jump, ['late', 'new']);
	let release!: () => void;
	const gate = new Promise<void>((resolve) => { release = resolve; });
	const stale = jump.jump('late', { beforeReveal: () => gate });
	const latest = section('new');
	expect(await jump.jump('new')).toBe(true);
	const late = section('late');
	release();
	expect(await stale).toBe(false);
	expect(late.target.scrollIntoView).not.toHaveBeenCalled();
	expect(latest.target.scrollIntoView).toHaveBeenCalledOnce();
	const stop = register(jump, ['late']);
	const cancelled = jump.jump('late', { beforeReveal: () => new Promise((resolve) => setTimeout(resolve, 0)) });
	stop();
	expect(await cancelled).toBe(false);
});

it('settles the nearest scroller before landing and caps the wait if frames stop', async () => {
	const view = section('settle');
	const scroller = document.createElement('div');
	scroller.style.overflowY = 'auto';
	document.body.append(scroller);
	scroller.append(view.container);
	let reads = 0;
	Object.defineProperty(scroller, 'scrollHeight', { get: () => ++reads < 5 ? reads * 100 : 500 });
	const jump = createSectionJump();
	register(jump, ['settle']);
	await jump.jump('settle');
	expect(reads).toBeGreaterThanOrEqual(6);
	vi.useFakeTimers();
	vi.spyOn(globalThis, 'requestAnimationFrame').mockReturnValue(7);
	vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {});
	const capped = jump.jump('settle');
	await vi.advanceTimersByTimeAsync(701);
	await expect(capped).resolves.toBe(true);
	scroller.remove();
});

it('cleanup cancels the settlement frame immediately instead of leaving a detached wait alive', async () => {
	section('cancel-settle');
	const jump = createSectionJump();
	const stop = register(jump, ['cancel-settle']);
	await tick();
	vi.useFakeTimers();
	const frame = vi.spyOn(globalThis, 'requestAnimationFrame').mockReturnValue(7);
	const cancel = vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {});
	const result = jump.jump('cancel-settle');
	await vi.advanceTimersByTimeAsync(0);
	expect(frame).toHaveBeenCalled();
	stop();
	await expect(result).resolves.toBe(false);
	expect(cancel).toHaveBeenCalledWith(7);
});

it('the router helper waits for mounted registration and preserves popstate reading positions', async () => {
	let navigate!: (event: { type: string; to: { url: URL } | null }) => void;
	const jump = useSectionJump((callback) => { navigate = callback; });
	const to = (hash: string) => ({ url: new URL('https://example.test/p' + hash) });
	navigate({ type: 'enter', to: to('#router') });
	const view = section('router');
	register(jump, ['router']);
	await vi.waitFor(() => expect(view.target.scrollIntoView).toHaveBeenCalledOnce());
	expect(observers.at(-1)!.targets).toContain(view.target);
	navigate({ type: 'popstate', to: to('#router') });
	navigate({ type: 'link', to: to('#%invalid') });
	navigate({ type: 'link', to: to('') });
	navigate({ type: 'link', to: null });
	await tick();
	expect(view.target.scrollIntoView).toHaveBeenCalledOnce();
});

it('lands same-page fragments and cancels corrections on history, another click or cleanup', async () => {
	history.replaceState(null, '', '/#fragment');
	const view = section('fragment');
	const root = document.createElement('main');
	document.body.append(root);
	root.append(view.container);
	const link = root.appendChild(document.createElement('a'));
	link.href = '#fragment';
	const other = root.appendChild(document.createElement('button'));
	const jump = createSectionJump();
	const stop = register(jump, ['fragment'], { root, landFragments: true });
	await tick();
	link.click();
	other.click();
	await new Promise(requestAnimationFrame);
	expect(view.target.scrollIntoView).not.toHaveBeenCalled();
	link.click();
	window.dispatchEvent(new PopStateEvent('popstate', { state: { readingPosition: 750 } }));
	await new Promise(requestAnimationFrame);
	expect(view.target.scrollIntoView).not.toHaveBeenCalled();
	link.click();
	await vi.waitFor(() => expect(view.target.scrollIntoView).toHaveBeenCalledOnce());
	stop();
	await fireEvent.click(link);
	await new Promise(requestAnimationFrame);
	expect(view.target.scrollIntoView).toHaveBeenCalledOnce();
	root.remove();
});
