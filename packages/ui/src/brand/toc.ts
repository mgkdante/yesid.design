import type { TocBadgeSpec } from './TocBadge.svelte';

export interface TocEntry {
	id: string;
	title: string;
	level: number;
	/** Leading mark, matching the section card's badge. Sub-headings omit it. */
	badge?: TocBadgeSpec;
	/** Lives in the desktop side rail: TocNav skips it, TocPill keeps it. */
	rail?: boolean;
	children: TocEntry[];
}

export function flattenToc(entries: TocEntry[]): TocEntry[] {
	const flat: TocEntry[] = [];
	for (const entry of entries) {
		flat.push(entry);
		for (const child of entry.children) flat.push(child);
	}
	return flat;
}

export function resolveTocCounter(
	entries: TocEntry[],
	activeId: string,
): { current: number; total: number } {
	const flat = flattenToc(entries);
	const activeIndex = Math.max(
		0,
		flat.findIndex((entry) => entry.id === activeId),
	);
	const usesCanonicalNumbers =
		entries.length > 0 &&
		entries.every((entry) => entry.badge?.kind === 'number' && entry.children.length === 0);
	if (usesCanonicalNumbers) {
		const activeEntry = entries.find((entry) => entry.id === activeId) ?? entries[0];
		return {
			current: activeEntry.badge?.kind === 'number' ? activeEntry.badge.value : activeIndex + 1,
			total: Math.max(
				...entries.map((entry) => (entry.badge?.kind === 'number' ? entry.badge.value : 0)),
			),
		};
	}
	return { current: activeIndex + 1, total: flat.length };
}
