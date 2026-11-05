import { SECTIONS_CHOICE_KEY, SECTIONS_READY_EVENT } from '../brand/sections-preference.js';
import { hasBulkSectionsInHtml } from './section-eligibility.js';

/** Runs before first paint to apply theme and section geometry.
 * `boot.json` holds this text's CSP hash; edit both together.
 */
export const themeBootScript = `(() => {
	const root = document.documentElement;
	let theme = null;
	try { theme = localStorage.getItem('theme'); } catch {}
	root.dataset.theme = theme === 'light' ? 'light' : 'dark';
	root.dataset.sectionsBoot = '';
	const cards = '.section-card:not([data-section-ready])';
	const controls = '[data-sections-control]:not([data-sections-ready])';
	const serverAvailable = document.currentScript?.hasAttribute('data-sections-available');
	let observer;
	let timer;
	let recovering = false;
	let finished = false;
	const readChoice = () => {
		delete root.dataset.sectionsChoice;
		try {
			const choice = localStorage.getItem('${SECTIONS_CHOICE_KEY}');
			root.dataset.sectionsChoice = choice === 'expanded' ? 'expanded' : 'collapsed';
		} catch {}
	};
	const applySection = (section, open, fallback = false) => {
		section.setAttribute('data-section-initial', open ? 'open' : 'closed');
		if (fallback) section.setAttribute('data-section-fallback', '');
		const box = section.querySelector(':scope > [data-slot="collapsible"]');
		if (!box) return;
		const trigger = box.querySelector(':scope > [data-section-trigger], :scope > .section-heading-row [data-section-trigger]');
		const body = box.querySelector(':scope > [data-slot="collapsible-content"]');
		if (!open && body?.contains(document.activeElement)) trigger?.focus();
		box.dataset.state = open ? 'open' : 'closed';
		if (trigger) {
			trigger.setAttribute('aria-expanded', String(open));
			trigger.dataset.state = open ? 'open' : 'closed';
		}
		if (body) {
			body.dataset.state = open ? 'open' : 'closed';
			body.toggleAttribute('inert', !open);
			if (open) body.removeAttribute('aria-hidden');
			else body.setAttribute('aria-hidden', 'true');
		}
	};
	const applyControls = (collapsed, fallback = false) => {
		root.toggleAttribute('data-sections-collapsed', collapsed);
		for (const control of document.querySelectorAll(controls)) {
			if (fallback) control.setAttribute('data-sections-fallback', '');
			const button = control.querySelector('button');
			const label = control.querySelector('.sections-label');
			const name = collapsed ? control.dataset.expandLabel : control.dataset.collapseLabel;
			if (button) {
				button.dataset.collapsed = String(collapsed);
				button.disabled = true;
				if (name !== undefined) button.setAttribute('aria-label', name);
				const title = collapsed ? control.dataset.expandTitle : control.dataset.collapseTitle;
				if (title !== undefined) button.title = title;
			}
			if (label && name !== undefined && label.textContent !== name) label.textContent = name;
		}
	};
	const revealPending = () => {
		for (const section of document.querySelectorAll(cards)) applySection(section, true, true);
		applyControls(false, true);
	};
	const finishIfReady = () => {
		if (finished || document.readyState === 'loading' || document.querySelector(cards + ', ' + controls)) return;
		finished = true;
		clearTimeout(timer);
		try { observer?.disconnect(); } catch {}
		root.removeAttribute('data-sections-recovering');
		removeEventListener('error', onError, true);
		removeEventListener('unhandledrejection', recover);
		document.removeEventListener('readystatechange', refresh);
		document.removeEventListener('${SECTIONS_READY_EVENT}', refresh);
	};
	const recover = () => {
		if (finished) return;
		try { finishIfReady(); } catch {}
		if (finished) return;
		recovering = true;
		root.dataset.sectionsRecovering = '';
		try { revealPending(); } catch {}
	};
	const onError = event => {
		const target = event.target;
		if (event instanceof ErrorEvent || target?.tagName === 'SCRIPT' || (target?.tagName === 'LINK' && target.rel === 'modulepreload')) recover();
	};
	const prepare = () => {
		const sections = [...document.querySelectorAll('[data-section-bulk]')];
		const available = (document.readyState === 'loading' && serverAvailable) || (sections.length >= 2 && !!document.querySelector('[data-sections-control]'));
		root.toggleAttribute('data-sections-available', !!available);
		let id = '';
		try { id = decodeURIComponent(location.hash.slice(1)); } catch {}
		let target = id && (document.getElementById(id) || [...document.querySelectorAll('[data-toc]')].find(node => node.getAttribute('data-toc') === id));
		if (target && !target.matches('.section-card')) target = target.querySelector('.section-card') || target;
		for (const section of document.querySelectorAll(cards)) {
			let open = section.getAttribute('data-section-default') !== 'closed';
			if (available && section.hasAttribute('data-section-bulk') && root.dataset.sectionsChoice) open = root.dataset.sectionsChoice === 'expanded';
			if (target && section.contains(target)) open = true;
			applySection(section, open);
		}
		const collapsed = sections.length ? sections.every(section => section.getAttribute('data-section-initial') === 'closed') : root.dataset.sectionsChoice === 'collapsed';
		applyControls(!!available && collapsed);
	};
	const refresh = () => {
		if (finished) return;
		try {
			if (recovering) revealPending();
			else prepare();
			finishIfReady();
		} catch { recover(); }
	};
	try {
		root.toggleAttribute('data-sections-available', !!serverAvailable);
		addEventListener('error', onError, true);
		addEventListener('unhandledrejection', recover);
		document.addEventListener('readystatechange', refresh);
		document.addEventListener('${SECTIONS_READY_EVENT}', refresh);
		timer = setTimeout(recover, 5000);
		addEventListener('storage', event => {
			if (event.key !== '${SECTIONS_CHOICE_KEY}' && event.key !== null) return;
			readChoice();
			if (!finished) refresh();
		});
		readChoice();
		const relevant = node => node.nodeType === 1 && (node.matches('.section-card, [data-sections-control]') || node.querySelector('.section-card, [data-sections-control]'));
		observer = new MutationObserver(records => {
			try {
				if (document.readyState === 'loading' || records.some(record => record.type === 'attributes' || [...record.addedNodes, ...record.removedNodes].some(relevant))) refresh();
			} catch { recover(); }
		});
		observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-section-ready', 'data-sections-ready'] });
		refresh();
	} catch { recover(); }
	addEventListener('pagereveal', event => event.viewTransition?.ready.catch(() => {}));
})();`;

/** Replaces `%yesid.themeBoot%` in app.html with the boot script; call it from `transformPageChunk`. */
export function injectThemeBoot(html: string): string {
	// SSR eligibility lets the first card use its final geometry even while later HTML is parsing.
	const eligibility = hasBulkSectionsInHtml(html) ? ' data-sections-available' : '';
	return html.replace('%yesid.themeBoot%', () => `<script${eligibility}>${themeBootScript}</script>`);
}
