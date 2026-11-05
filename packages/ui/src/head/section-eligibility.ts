const isSpace = (code: number) => code === 32 || code === 9 || code === 10 || code === 12 || code === 13;
const rawTextTags = new Set(['script', 'style', 'textarea', 'title']);

/** Scan start-tag attributes once, skipping quoted values, comments and raw text.
 * The cursor only moves forward, including on malformed or unterminated input.
 */
export function hasBulkSectionsInHtml(html: string): boolean {
	let cursor = 0;
	let sections = 0;
	let control = false;
	while (cursor < html.length) {
		const start = html.indexOf('<', cursor);
		if (start < 0) break;
		cursor = start + 1;
		if (html.startsWith('!--', cursor)) {
			const end = html.indexOf('-->', cursor + 3);
			cursor = end < 0 ? html.length : end + 3;
			continue;
		}
		const first = html.charCodeAt(cursor) | 32;
		if (first < 97 || first > 122) continue;
		const tagStart = cursor;
		while (cursor < html.length && !isSpace(html.charCodeAt(cursor)) && html[cursor] !== '>' && html[cursor] !== '/') cursor++;
		const tag = html.slice(tagStart, cursor).toLowerCase();
		let bulk = false;
		let hasControl = false;
		let complete = false;
		while (cursor < html.length) {
			while (isSpace(html.charCodeAt(cursor)) || html[cursor] === '/') cursor++;
			if (html[cursor] === '>') { cursor++; complete = true; break; }
			const nameStart = cursor;
			while (cursor < html.length && !isSpace(html.charCodeAt(cursor)) && !['=', '/', '>'].includes(html[cursor])) cursor++;
			if (cursor === nameStart) { cursor++; continue; }
			const name = html.slice(nameStart, cursor).toLowerCase();
			bulk ||= name === 'data-section-bulk';
			hasControl ||= name === 'data-sections-control';
			while (isSpace(html.charCodeAt(cursor))) cursor++;
			if (html[cursor] !== '=') continue;
			cursor++;
			while (isSpace(html.charCodeAt(cursor))) cursor++;
			const quote = html[cursor];
			if (quote === '"' || quote === "'") {
				cursor++;
				while (cursor < html.length && html[cursor] !== quote) cursor++;
				if (cursor < html.length) cursor++;
			} else {
				while (cursor < html.length && !isSpace(html.charCodeAt(cursor)) && html[cursor] !== '>') cursor++;
			}
		}
		if (!complete) break;
		if (bulk) sections++;
		control ||= hasControl;
		if (sections >= 2 && control) return true;
		if (!rawTextTags.has(tag)) continue;
		while (cursor < html.length) {
			const close = html.indexOf('</', cursor);
			if (close < 0) { cursor = html.length; break; }
			const end = close + 2 + tag.length;
			const boundary = html[end];
			if (html.slice(close + 2, end).toLowerCase() === tag && (isSpace(html.charCodeAt(end)) || boundary === '>' || boundary === '/')) {
				const endTag = html.indexOf('>', end);
				cursor = endTag < 0 ? html.length : endTag + 1;
				break;
			}
			cursor = close + 2;
		}
	}
	return false;
}
