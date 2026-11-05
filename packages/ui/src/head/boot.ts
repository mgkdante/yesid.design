import { SECTIONS_CHOICE_KEY } from '../brand/sections-preference.js';

/** Runs before first paint to apply theme and section geometry.
 * `boot.json` holds this text's CSP hash; edit both together.
 */
export const themeBootScript = `(() => {
	const root = document.documentElement;
	let theme = null;
	try { theme = localStorage.getItem('theme'); } catch {}
	root.dataset.theme = theme === 'light' ? 'light' : 'dark';
	root.dataset.sectionsBoot = '';
	let observer;
	const failOpen = () => {
		root.dataset.sectionsFailed = '';
		try {
			observer?.disconnect();
			for (const section of document.querySelectorAll('.section-card:not([data-section-ready])')) section.removeAttribute('data-section-initial');
		} catch {}
	};
	try {
		const serverAvailable = document.currentScript?.hasAttribute('data-sections-available');
		const readChoice = () => {
			delete root.dataset.sectionsChoice;
			try {
				const choice = localStorage.getItem('${SECTIONS_CHOICE_KEY}');
				root.dataset.sectionsChoice = choice === 'expanded' ? 'expanded' : 'collapsed';
			} catch {}
		};
		const prepare = () => {
			if (root.hasAttribute('data-sections-failed')) return;
			const sections = [...document.querySelectorAll('[data-section-bulk]')];
			const available = (document.readyState === 'loading' && serverAvailable) || (sections.length >= 2 && !!document.querySelector('[data-sections-control]'));
			root.toggleAttribute('data-sections-available', !!available);
			let id = '';
			try { id = decodeURIComponent(location.hash.slice(1)); } catch {}
			let target = id && (document.getElementById(id) || [...document.querySelectorAll('[data-toc]')].find(node => node.getAttribute('data-toc') === id));
			if (target && !target.matches('.section-card')) target = target.querySelector('.section-card') || target;
			for (const section of document.querySelectorAll('.section-card:not([data-section-ready])')) {
				let open = section.getAttribute('data-section-default') !== 'closed';
				if (available && section.hasAttribute('data-section-bulk') && root.dataset.sectionsChoice) open = root.dataset.sectionsChoice === 'expanded';
				if (target && section.contains(target)) open = true;
				section.setAttribute('data-section-initial', open ? 'open' : 'closed');
			}
			root.toggleAttribute('data-sections-collapsed', !!available && sections.every(section => section.getAttribute('data-section-initial') === 'closed'));
		};
		const safelyPrepare = () => { try { prepare(); } catch { failOpen(); } };
		addEventListener('error', event => {
			const target = event.target;
			if (event instanceof ErrorEvent || target?.tagName === 'SCRIPT' || (target?.tagName === 'LINK' && target.rel === 'modulepreload')) failOpen();
		}, true);
		addEventListener('unhandledrejection', failOpen);
		// A stalled module request may emit neither load nor error. Keep reading available.
		setTimeout(() => {
			try {
				if (document.querySelector('.section-card:not([data-section-ready])')) failOpen();
			} catch { failOpen(); }
		}, 5000);
		addEventListener('storage', event => {
			if (event.key !== '${SECTIONS_CHOICE_KEY}' && event.key !== null) return;
			readChoice();
			safelyPrepare();
		});
		readChoice();
		// Live chart and text changes do not require a structural scan.
		const relevant = node => node.nodeType === 1 && (node.matches('.section-card, [data-sections-control]') || node.querySelector('.section-card, [data-sections-control]'));
		observer = new MutationObserver(records => {
			try {
				if (document.readyState === 'loading' || records.some(record => [...record.addedNodes, ...record.removedNodes].some(relevant))) prepare();
			} catch { failOpen(); }
		});
		observer.observe(root, { childList: true, subtree: true });
		document.addEventListener('readystatechange', safelyPrepare);
		safelyPrepare();
	} catch { failOpen(); }
	addEventListener('pagereveal', event => event.viewTransition?.ready.catch(() => {}));
})();`;

/** Replaces `%yesid.themeBoot%` in app.html with the boot script; call it from `transformPageChunk`. */
export function injectThemeBoot(html: string): string {
	// SSR eligibility lets the first card use its final geometry even while later HTML is parsing.
	const sections = html.match(/<[a-z](?:"[^"]*"|'[^']*'|[^'">])*\sdata-section-bulk(?:=""|(?=[\s>]))/gu)?.length ?? 0;
	const control = /<[a-z](?:"[^"]*"|'[^']*'|[^'">])*\sdata-sections-control(?:=""|(?=[\s>]))/u.test(html);
	const eligibility = sections >= 2 && control ? ' data-sections-available' : '';
	return html.replace('%yesid.themeBoot%', () => `<script${eligibility}>${themeBootScript}</script>`);
}
