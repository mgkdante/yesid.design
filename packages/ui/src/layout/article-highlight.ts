/**
 * Whole-word matching for ArticleHeader's `highlight`.
 *
 * Words come from `Intl.Segmenter` (`granularity: 'word'`), so scripts written without spaces,
 * such as Chinese and Thai, split into their words. Title and highlight are compared in Unicode
 * NFC and lowercase, while the returned offsets point into the original title, so composed and
 * decomposed accents match and the rendered span keeps the title's own characters.
 *
 * Apostrophes: an apostrophe (`'` or `’`) between letters stays inside the word, so `can` never
 * matches inside `can't` and `aujourd` never inside `aujourd'hui`. One elision exception: after
 * a one-letter prefix or a listed French or Italian elided form (`l'`, `d'`, `qu'`, `jusqu'`,
 * `dell'` and so on), a new word starts after the apostrophe, so `espace` matches in `l'espace`
 * and `IA` in `d’IA`.
 *
 * Without `Intl.Segmenter`, letters, digits and combining marks form words and everything else
 * separates them, under the same apostrophe policy. Text without spaces then reads as one word,
 * so the fallback may miss a match there but never accents part of a word.
 */

export interface HighlightRange {
	start: number;
	end: number;
}

interface Chunk {
	/** Offset of the chunk in the original text. */
	start: number;
	end: number;
	/** The chunk in NFC, lowercased. */
	folded: string;
}

interface Folded {
	text: string;
	/** Folded offset at each chunk boundary, mapped to the original offset. */
	toOriginal: Map<number, number>;
}

const APOSTROPHES = new Set(["'", '’']);
const ELIDED = new Set([
	// French
	'qu', 'jusqu', 'lorsqu', 'puisqu', 'quoiqu', 'presqu', 'quelqu',
	// Italian
	'un', 'all', 'dall', 'dell', 'nell', 'sull', 'coll', 'quell', 'quest', 'bell', 'sant',
]);
const WORD_CHAR = /[\p{L}\p{N}\p{M}]/u;
const MARK = /\p{M}/u;

type SegmenterLike = {
	segment(input: string): Iterable<{ segment: string; index: number; isWordLike?: boolean }>;
};

function createSegmenter(granularity: 'word' | 'grapheme'): SegmenterLike | null {
	const Segmenter = (globalThis.Intl as { Segmenter?: new (locale?: string, options?: object) => SegmenterLike })
		.Segmenter;
	return Segmenter ? new Segmenter(undefined, { granularity }) : null;
}

const wordSegmenter = createSegmenter('word');
const graphemeSegmenter = createSegmenter('grapheme');

/** Splits `text` into grapheme-sized chunks; NFC and lowercasing never cross their edges. */
function chunks(text: string, graphemes: SegmenterLike | null): Chunk[] {
	const pieces: { start: number; end: number }[] = [];
	if (graphemes) {
		for (const { segment, index } of graphemes.segment(text)) pieces.push({ start: index, end: index + segment.length });
	} else {
		// A base character and the combining marks after it.
		let start = 0;
		for (let i = 0; i < text.length; ) {
			const code = text.codePointAt(i)!;
			const width = code > 0xffff ? 2 : 1;
			if (i > start && !MARK.test(String.fromCodePoint(code))) {
				pieces.push({ start, end: i });
				start = i;
			}
			i += width;
		}
		if (text.length > start) pieces.push({ start, end: text.length });
	}
	return pieces.map(({ start, end }) => ({ start, end, folded: text.slice(start, end).normalize('NFC').toLowerCase() }));
}

function fold(text: string, graphemes: SegmenterLike | null): Folded {
	const toOriginal = new Map<number, number>([[0, 0]]);
	let folded = '';
	for (const chunk of chunks(text, graphemes)) {
		folded += chunk.folded;
		toOriginal.set(folded.length, chunk.end);
	}
	return { text: folded, toOriginal };
}

const isApostrophe = (char: string | undefined) => char !== undefined && APOSTROPHES.has(char);
const isWordChar = (char: string | undefined) => char !== undefined && WORD_CHAR.test(char);

/** Word boundaries of `text` and the ranges of its words. */
function words(text: string, segmenter: SegmenterLike | null): { boundaries: Set<number>; ranges: HighlightRange[] } {
	const ranges: HighlightRange[] = [];
	const boundaries = new Set<number>([0, text.length]);
	if (segmenter) {
		for (const { segment, index, isWordLike } of segmenter.segment(text)) {
			boundaries.add(index);
			if (isWordLike) ranges.push({ start: index, end: index + segment.length });
		}
	} else {
		let start = -1;
		for (let i = 0; i <= text.length; i++) {
			const inWord =
				i < text.length &&
				(isWordChar(text[i]) || (isApostrophe(text[i]) && isWordChar(text[i - 1]) && isWordChar(text[i + 1])));
			if (inWord && start < 0) start = i;
			if (!inWord && start >= 0) {
				ranges.push({ start, end: i });
				start = -1;
			}
		}
		// Every position outside a word's interior is a boundary.
		for (let i = 1; i < text.length; i++) {
			if (!ranges.some((range) => range.start < i && i < range.end)) boundaries.add(i);
		}
	}
	// Elision: a word starts after the apostrophe that follows an elided prefix.
	for (const range of ranges) {
		for (let i = range.start + 1; i < range.end - 1; i++) {
			if (!isApostrophe(text[i])) continue;
			const prefix = text.slice(range.start, i);
			if ([...prefix].length === 1 || ELIDED.has(prefix)) boundaries.add(i + 1);
			break;
		}
	}
	return { boundaries, ranges };
}

/**
 * The first case-insensitive whole-word match of `word` in `text`, as offsets into `text`, or
 * `null`. `useSegmenter: false` forces the fallback (for tests).
 */
export function findHighlight(
	text: string,
	word: string | undefined,
	{ useSegmenter = true }: { useSegmenter?: boolean } = {},
): HighlightRange | null {
	const graphemes = useSegmenter ? graphemeSegmenter : null;
	const needle = fold(word?.trim() ?? '', graphemes).text;
	if (!needle || !/[\p{L}\p{N}]/u.test(needle)) return null;
	const title = fold(text, graphemes);
	const { boundaries, ranges } = words(title.text, useSegmenter ? wordSegmenter : null);
	for (let at = title.text.indexOf(needle); at >= 0; at = title.text.indexOf(needle, at + 1)) {
		const end = at + needle.length;
		const start = title.toOriginal.get(at);
		const stop = title.toOriginal.get(end);
		if (start === undefined || stop === undefined) continue;
		if (!boundaries.has(at) || !boundaries.has(end)) continue;
		if (!ranges.some((range) => range.start < end && range.end > at)) continue;
		return { start, end: stop };
	}
	return null;
}
