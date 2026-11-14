/** Private origin-wide bulk choice. Historical disclosure keys are deliberately unrelated. */
export const SECTIONS_CHOICE_KEY = 'sections-choice';
export const SECTIONS_READY_EVENT = '@yesid/ui/sections-ready';

export function noteSectionReady(): void {
	if (typeof document !== 'undefined') document.dispatchEvent(new Event(SECTIONS_READY_EVENT));
}

export function rememberSections(open: boolean): void {
	if (typeof document === 'undefined') return;
	const choice = open ? 'expanded' : 'collapsed';
	document.documentElement.dataset.sectionsChoice = choice;
	// Keep an explicit in-document bulk choice authoritative even if persistence is blocked.
	document.documentElement.dataset.sectionsSaved = '';
	try { localStorage.setItem(SECTIONS_CHOICE_KEY, choice); } catch {}
}

/** Read once per mount, after all siblings exist. Never writes a visitor's choice. */
export function initialSectionOpen(element: HTMLElement | null, declared: boolean, independent = false, firstVisitClosed = false): boolean {
	if (!element) return declared;
	if (element.hasAttribute('data-section-fallback')) return true;
	let target: Element | null = null;
	try {
		const id = decodeURIComponent(location.hash.slice(1));
		if (id) target = document.getElementById(id) ?? [...document.querySelectorAll('[data-toc]')].find(node => node.getAttribute('data-toc') === id) ?? null;
	} catch {}
	if (target && !target.matches('.section-card')) target = target.querySelector('.section-card') ?? target;
	if (target && element.contains(target)) return true;
	if (independent || !hasBulkSections()) return declared;
	const choice = document.documentElement.dataset.sectionsChoice;
	if (firstVisitClosed && !document.documentElement.hasAttribute('data-sections-saved')) return false;
	return choice === 'collapsed' ? false : choice === 'expanded' ? true : declared;
}

export function hasBulkSections(): boolean {
	return !!document.querySelector('[data-sections-control]') && document.querySelectorAll('[data-section-bulk]').length >= 2;
}
