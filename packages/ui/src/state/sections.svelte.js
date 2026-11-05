import { allSectionsCollapsed, countSections, setSectionsOpen } from '../brand/sections-registry.js';
import { rememberSections } from '../brand/sections-preference.js';

/** Bulk actions remember one origin-wide choice; individual toggles stay local to the view. */
export const sections = {
	get count() {
		return countSections();
	},
	get allCollapsed() {
		return allSectionsCollapsed() ?? false;
	},
	collapseAll() {
		rememberSections(false);
		setSectionsOpen(false);
	},
	expandAll() {
		rememberSections(true);
		setSectionsOpen(true);
	},
	toggle() {
		const open = allSectionsCollapsed() ?? false;
		rememberSections(open);
		setSectionsOpen(open);
	},
};
