import { SvelteMap } from 'svelte/reactivity';

interface SectionRegistration {
	id?: string;
	element?: () => HTMLElement | null;
	isOpen(): boolean;
	setOpen(open: boolean): void;
}

/** Opens the content-section chain exposing a heading, section anchor or numbered wrapper. */
export function openSectionContaining(target: Element): boolean {
	let descendant: SectionRegistration | undefined;
	for (const section of sections.values()) {
		const element = section.element?.();
		if (!element || !target.contains(element)) continue;
		if (!descendant || element.contains(descendant.element?.() ?? null)) descendant = section;
	}
	const sectionTarget = descendant?.element?.() ?? target;
	let found = false;
	for (const section of sections.values()) {
		const element = section.element?.();
		if (!element || (!element.contains(target) && !element.contains(sectionTarget))) continue;
		section.setOpen(true);
		found = true;
	}
	return found;
}

const sections = new SvelteMap<symbol, SectionRegistration>();

/** Internal lifecycle shared by CollapsibleSection and the page bulk control. */
export function registerSection(section: SectionRegistration): () => void {
	const key = Symbol();
	sections.set(key, section);
	return () => {
		sections.delete(key);
	};
}

export function countSections(): number {
	return sections.size;
}

export function allSectionsCollapsed(): boolean | undefined {
	return sections.size ? [...sections.values()].every((section) => !section.isOpen()) : undefined;
}

export function setSectionsOpen(open: boolean): void {
	for (const section of sections.values()) section.setOpen(open);
}

/** Opens matching content sections, optionally limited to a page's root. Returns whether any matched. */
export function openSection(id: string, root?: Element | Document): boolean {
	let found = false;
	for (const section of sections.values()) {
		if (section.id !== id) continue;
		const element = section.element?.();
		if (root && (!element || !root.contains(element))) continue;
		section.setOpen(true);
		found = true;
	}
	return found;
}
