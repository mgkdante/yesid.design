import { allSectionsCollapsed, countSections, setSectionsOpen } from '../brand/sections-registry.js';

/** Page actions for mounted content sections. No state is stored between visits. */
export const sections = {
	get count() {
		return countSections();
	},
	get allCollapsed() {
		return allSectionsCollapsed() ?? false;
	},
	collapseAll() {
		setSectionsOpen(false);
	},
	expandAll() {
		setSectionsOpen(true);
	},
	toggle() {
		setSectionsOpen(allSectionsCollapsed() ?? false);
	},
};
