import { describe, expect, it } from 'vitest';
import { findHighlight } from './article-highlight.js';

const accented = (text: string, word: string, options?: { useSegmenter?: boolean }) => {
	const range = findHighlight(text, word, options);
	return range ? text.slice(range.start, range.end) : null;
};

describe('with Intl.Segmenter', () => {
	it('is available in the test runtime', () => {
		expect(typeof Intl.Segmenter).toBe('function');
	});

	it.each([
		['One BRAIN for four tools', 'AI'],
		['Remeasured reliability', 'measure'],
		['Les défis énergétiques', 'énergé'],
		['Line 240 delays', '24'],
		// Apostrophes between letters stay inside the word.
		["I can't stop", 'can'],
		['I can’t stop', 'can'],
		["Aujourd'hui", 'hui'],
		["It's late", 's'],
		// Nothing to accent in punctuation alone.
		['Notes: part one', ':'],
	])('accents nothing in %j for %j', (text, word) => {
		expect(accented(text, word)).toBeNull();
	});

	it.each([
		['One brain for four AI tools: T3 Code and Notion', 'ai', 'AI'],
		['One brain for four AI tools: T3 Code and Notion', 't3 code', 'T3 Code'],
		["I can't stop", "can't", "can't"],
		// Chinese and Thai have no spaces between words.
		['我喜欢中文', '中文', '中文'],
		['ภาษาไทย', 'ไทย', 'ไทย'],
		// Elisions start a new word after the apostrophe.
		["L'espace public", 'espace', 'espace'],
		['Un seul cerveau pour quatre outils d’IA', 'ia', 'IA'],
		['Qu’il pleuve', 'il', 'il'],
		["Storia dell'arte", 'arte', 'arte'],
		['Learning C++ in a weekend', 'C++', 'C++'],
	])('accents the whole word in %j for %j', (text, word, expected) => {
		expect(accented(text, word)).toBe(expected);
	});

	it('compares in NFC and returns offsets into the original title', () => {
		const decomposed = 'Café Arona';
		expect(findHighlight(decomposed, 'Café')).toEqual({ start: 0, end: 5 });
		expect(accented(decomposed, 'café')).toBe('Café');
		expect(accented('Café Arona', 'Café')).toBe('Café');
		// A base letter never matches without its accent.
		expect(accented(decomposed, 'Cafe')).toBeNull();
		expect(accented('Le Café et l’été', 'été')).toBe('été');
	});

	it('returns the first whole-word match and ignores blank highlights', () => {
		expect(findHighlight('Measure twice, measure once', 'MEASURE')).toEqual({ start: 0, end: 7 });
		for (const word of [undefined, '', '   ']) expect(findHighlight('How we measure', word)).toBeNull();
	});
});

describe('without Intl.Segmenter', () => {
	const fallback = { useSegmenter: false };

	it.each([
		['One BRAIN for four tools', 'AI'],
		["I can't stop", 'can'],
		['Café notes', 'Cafe'],
		// Without word data a run of Chinese reads as one word: missed, never split.
		['我喜欢中文', '中文'],
	])('accents nothing in %j for %j', (text, word) => {
		expect(accented(text, word, fallback)).toBeNull();
	});

	it.each([
		['One brain for four AI tools', 'ai', 'AI'],
		["L'espace public", 'espace', 'espace'],
		['outils d’IA', 'IA', 'IA'],
		['Café Arona', 'Café', 'Café'],
	])('accents the whole word in %j for %j', (text, word, expected) => {
		expect(accented(text, word, fallback)).toBe(expected);
	});
});
