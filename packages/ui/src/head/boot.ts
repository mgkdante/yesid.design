/** Runs before first paint to apply theme and handle interrupted view transitions.
 * `boot.json` holds this text's CSP hash; edit both together.
 */
export const themeBootScript = `(() => {
	const root = document.documentElement;
	let theme = null;
	try {
		theme = localStorage.getItem('theme');
	} catch {}
	root.dataset.theme = theme === 'light' ? 'light' : 'dark';
	addEventListener('pagereveal', (event) => event.viewTransition?.ready.catch(() => {}));

})();`;

/** Replaces `%yesid.themeBoot%` in app.html with the boot script; call it from `transformPageChunk`. */
export function injectThemeBoot(html: string): string {
	return html.replace('%yesid.themeBoot%', () => `<script>${themeBootScript}</script>`);
}
