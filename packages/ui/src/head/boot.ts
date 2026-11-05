import { SECTIONS_CHOICE_KEY } from '../brand/sections-preference.js';

/** Runs before first paint to apply theme, section geometry and interrupted view transitions.
 * `boot.json` holds this text's CSP hash; edit both together.
 */
export const themeBootScript = `(() => {
	const root = document.documentElement;
	let theme = null;
	try {
		theme = localStorage.getItem('theme');
	} catch {}
	root.dataset.theme = theme === 'light' ? 'light' : 'dark';
	root.dataset.sectionsBoot = '';
	// Suppress progressive paint of incomplete geometry until the HTML parser knows the count
	// and fragment chain. This releases at interactive, before deferred app scripts run.
	if (document.readyState === 'loading') root.dataset.sectionsParsing = '';
	delete root.dataset.sectionsChoice;
	try {
		const choice = localStorage.getItem('${SECTIONS_CHOICE_KEY}');
		root.dataset.sectionsChoice = choice === 'expanded' ? 'expanded' : 'collapsed';
	} catch {}
	const prepare = () => {
		const sections = [...document.querySelectorAll('[data-section-bulk]')];
		root.toggleAttribute('data-sections-available', sections.length >= 2 && !!document.querySelector('[data-sections-control]'));
		let id = '';
		try { id = decodeURIComponent(location.hash.slice(1)); } catch {}
		let target = id && (document.getElementById(id) || [...document.querySelectorAll('[data-toc]')].find(node => node.getAttribute('data-toc') === id));
		if (target && !target.matches('.section-card')) target = target.querySelector('.section-card') || target;
		for (const section of document.querySelectorAll('.section-card:not([data-section-ready])')) {
			let open = section.getAttribute('data-section-default') !== 'closed';
			if (root.hasAttribute('data-sections-available') && section.hasAttribute('data-section-bulk') && root.dataset.sectionsChoice) open = root.dataset.sectionsChoice === 'expanded';
			if (target && section.contains(target)) open = true;
			section.setAttribute('data-section-initial', open ? 'open' : 'closed');
		}
		root.toggleAttribute('data-sections-collapsed', root.hasAttribute('data-sections-available') && sections.every(section => section.getAttribute('data-section-initial') === 'closed'));
	};
	// Only structural section/control changes need a scan; live chart/text updates do not.
	const relevant = node => node.nodeType === 1 && (node.matches('.section-card, [data-sections-control]') || node.querySelector('.section-card, [data-sections-control]'));
	new MutationObserver(records => {
		if (document.readyState === 'loading' || records.some(record => [...record.addedNodes, ...record.removedNodes].some(relevant))) prepare();
	}).observe(root, { childList: true, subtree: true });
	prepare();
	document.addEventListener('readystatechange', () => {
		if (document.readyState === 'loading') return;
		prepare();
		delete root.dataset.sectionsParsing;
	});
	addEventListener('pagereveal', (event) => event.viewTransition?.ready.catch(() => {}));

})();`;

/** Replaces `%yesid.themeBoot%` in app.html with the boot script; call it from `transformPageChunk`. */
export function injectThemeBoot(html: string): string {
	return html.replace('%yesid.themeBoot%', () => `<script>${themeBootScript}</script>`);
}
