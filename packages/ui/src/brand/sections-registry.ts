import { SvelteMap } from 'svelte/reactivity';

interface SectionRegistration {
	id?: string;
	isOpen(): boolean;
	setOpen(open: boolean): void;
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

/** Opens every mounted CollapsibleSection with this anchor. Returns whether any matched. */
export function openSection(id: string): boolean {
	let found = false;
	for (const section of sections.values()) {
		if (section.id !== id) continue;
		section.setOpen(true);
		found = true;
	}
	return found;
}
