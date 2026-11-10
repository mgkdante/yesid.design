import { describe, expect, it } from 'vitest';
import { OG_LINE_MAX_LENGTH, resolveShareCopy, type ShareCopyInput } from '../share-copy.js';

const summary = 'A practical guide to building accessible interfaces for everyday readers.';
const excerpt = 'How a small team made its publishing workflow clearer and easier to maintain.';
const primary = 'One look for every site.';
const french = 'Un guide pratique pour rendre les interfaces accessibles à tous les lecteurs.';
const input: ShareCopyInput = {
	locales: ['en', 'fr'],
	candidates: [{ id: 'oneLiner', text: { en: primary } }, { id: 'excerpt', text: { en: excerpt } }],
};

describe('resolveShareCopy', () => {
	it('keeps a short primary on the card and derives the description from longer sentences', () => {
		expect(Array.from(primary)).toHaveLength(24);
		const result = resolveShareCopy({ ...input, candidates: [
			{ id: 'oneLiner', text: { en: primary } },
			{ id: 'body', text: { en: `${summary} ${excerpt} ${summary} Unfinished tail` } },
		], cta: { en: 'Read more.' } }).en;
		expect(result).toMatchObject({
			status: 'selected', ogLine: primary, description: `${summary} ${excerpt} Read more.`, ctaAppended: true,
			ogLineSource: { rule: 'primary', sourceLocale: 'en', candidateId: 'oneLiner', candidateIndex: 0 },
			descriptionSource: { rule: 'sentences', sourceLocale: 'en', candidateId: 'body', candidateIndex: 1 },
		});
	});

	it('collapses primary whitespace and newlines without dropping any text', () => {
		expect(resolveShareCopy({ ...input, candidates: [
			{ id: 'short', text: { en: '  One look\n for\t every   site.  ' } }, input.candidates[1]!,
		] }).en).toMatchObject({ ogLine: primary, description: excerpt });
	});

	it('keeps every nonempty primary regardless of description bounds or the card guarantee', () => {
		for (const text of ['X', 'W'.repeat(OG_LINE_MAX_LENGTH + 1)]) {
			expect(resolveShareCopy({ ...input, candidates: [
				{ id: 'short', text: { en: text } }, input.candidates[1]!,
			] }).en).toMatchObject({ ogLine: text, description: excerpt });
		}
	});

	it('uses an English primary for the French card while keeping the French description and CTA', () => {
		const result = resolveShareCopy({ ...input, candidates: [
			{ id: 'oneLiner', text: { en: primary, fr: ' \n ' } },
			{ id: 'body', text: { en: excerpt, fr: french } },
		], cta: { en: 'Read more.', fr: 'Lire la suite.' } }).fr;
		expect(result).toMatchObject({ locale: 'fr', ogLine: primary, description: `${french} Lire la suite.`,
			ogLineSource: { rule: 'primary', sourceLocale: 'en' },
			descriptionSource: { rule: 'sentences', sourceLocale: 'fr', candidateId: 'body' },
		});
	});

	it('prefers local longer copy over a qualifying default-locale primary for descriptions', () => {
		expect(resolveShareCopy({ ...input, candidates: [
			{ id: 'short', text: { en: summary, fr: 'Court.' } }, { id: 'body', text: { fr: french } },
		] }).fr).toMatchObject({ ogLine: 'Court.', description: french, sourceLocale: 'fr' });
	});

	it('uses the source locale CTA for fallback content, and supports a non-English default locale', () => {
		expect(resolveShareCopy({ ...input, cta: { en: 'Read more.', fr: 'Lire la suite.' } }).fr)
			.toMatchObject({ description: `${excerpt} Read more.`, descriptionSource: { sourceLocale: 'en' } });
		expect(resolveShareCopy({ locales: ['es'], defaultLocale: 'fr', candidates: [
			{ id: 'short', text: { fr: french } },
		], cta: { fr: 'Lire la suite.', es: 'Leer más.' } }).es)
			.toMatchObject({ ogLine: french, description: `${french} Lire la suite.`, sourceLocale: 'fr' });
	});

	it('uses a default CTA label if its translation is empty', () => {
		expect(resolveShareCopy({ ...input, candidates: [{ id: 'short', text: { fr: french } }],
			cta: { en: 'Read more.', fr: '  ' } }).fr).toMatchObject({ description: `${french} Read more.` });
	});

	it.each([50, 200])('accepts the inclusive default description boundary of %i code points', (size) => {
		const text = `${'a'.repeat(size - 1)}.`;
		expect(resolveShareCopy({ ...input, candidates: [{ id: 'short', text: { en: text } }] }).en)
			.toMatchObject({ status: 'selected', description: text, ogLine: text });
	});

	it('honours custom description bounds and counts Unicode code points', () => {
		const text = '🧭🧭🧭.';
		expect(resolveShareCopy({ ...input, minLength: 4, maxLength: 4,
			candidates: [{ id: 'short', text: { en: text } }] }).en).toMatchObject({ description: text });
	});

	it('tries primary plus CTA before primary alone and keeps the card CTA-free', () => {
		const text = 'An accessible publishing workflow.';
		const cta = 'Read the complete article.';
		expect(resolveShareCopy({ ...input, candidates: [{ id: 'short', text: { en: text } }], cta: { en: cta } }).en)
			.toMatchObject({ description: `${text} ${cta}`, ogLine: text, ctaAppended: true,
				descriptionSource: { rule: 'primary-cta' } });
		const candidate = [{ id: 'short', text: { en: summary } }];
		expect(resolveShareCopy({ ...input, candidates: candidate, maxLength: summary.length, cta: { en: cta } }).en)
			.toMatchObject({ description: summary, ctaAppended: false, descriptionSource: { rule: 'primary' } });
	});

	it('appends a CTA exactly at max and omits it when accumulated sentences leave no room', () => {
		const description = `${excerpt} Read more.`;
		expect(resolveShareCopy({ ...input, maxLength: description.length, cta: { en: 'Read more.' } }).en)
			.toMatchObject({ description, ctaAppended: true });
		expect(resolveShareCopy({ ...input, maxLength: excerpt.length, cta: { en: 'Read more.' } }).en)
			.toMatchObject({ description: excerpt, ctaAppended: false });
	});

	it.each([
		["See what's inside.", 'See what’s inside.'],
		['See what’s inside.', "See what's inside."],
		['See what‘s inside.', "See what's inside."],
		['Read more.', 'Read more.'],
	])('keeps CTA composition idempotent and apostrophe-tolerant: %s', (existing, cta) => {
		const text = `${summary} ${existing}`;
		const first = resolveShareCopy({ ...input, candidates: [{ id: 'short', text: { en: text } }], cta: { en: cta } }).en!;
		expect(first).toMatchObject({ description: text, ctaAppended: false });
		if (first.status !== 'selected') throw new Error('Expected usable content');
		expect(resolveShareCopy({ ...input, candidates: [{ id: 'short', text: { en: first.description } }], cta: { en: cta } }).en)
			.toMatchObject({ description: text, ctaAppended: false });
	});

	it('recognizes a CTA across collapsed newlines but requires a word boundary', () => {
		expect(resolveShareCopy({ ...input, candidates: [{ id: 'short', text: { en: `${summary}\nRead more.` } }],
			cta: { en: 'Read more.' } }).en).toMatchObject({ description: `${summary} Read more.`, ctaAppended: false });
		expect(resolveShareCopy({ ...input, candidates: [{ id: 'short', text: { en: `${summary} Bread more.` } }],
			cta: { en: 'read more.' } }).en).toMatchObject({ description: `${summary} Bread more. read more.`, ctaAppended: true });
	});

	it.each(['—', '–', '-', '"', '“', '«', '(', '【'])('recognizes an existing CTA after punctuation %s', (separator) => {
		const text = `${summary} ${separator}Read more.`;
		expect(resolveShareCopy({ ...input, candidates: [{ id: 'short', text: { en: text } }],
			cta: { en: 'Read more.' } }).en).toMatchObject({ description: text, ctaAppended: false });
	});

	it('recognizes a CTA at the start and preserves apostrophes after punctuation', () => {
		expect(resolveShareCopy({ locales: ['en'], minLength: 1, candidates: [
			{ id: 'short', text: { en: 'Read more.' } },
		], cta: { en: 'Read more.' } }).en).toMatchObject({ description: 'Read more.', ctaAppended: false });
		const text = `${summary} «See what’s inside.`;
		expect(resolveShareCopy({ ...input, candidates: [{ id: 'short', text: { en: text } }],
			cta: { en: "See what's inside." } }).en).toMatchObject({ description: text, ctaAppended: false });
	});

	it.each(['B', 'é', '字', '2', '\u0301'])('rejects a CTA embedded after the Unicode word character %s', (prefix) => {
		const text = `${summary} ${prefix}read more.`;
		expect(resolveShareCopy({ ...input, candidates: [{ id: 'short', text: { en: text } }],
			cta: { en: 'read more.' } }).en).toMatchObject({ description: `${text} read more.`, ctaAppended: true });
	});

	it.each([
		['fr', '« Une interface claire pour tous les lecteurs. »', 'Une autre phrase utile !', 'Lire la suite.'],
		['es', '¿Una interfaz clara para todos los lectores?', '¡Una experiencia mucho más fácil!', 'Leer más.'],
		['fr', '« Une interface claire pour tous les lecteurs ! »', 'Une autre phrase utile ? »', 'Lire la suite.'],
		['es', '“Una interfaz clara para todos los lectores.”', '¡Otra experiencia mucho más fácil!”', 'Leer más.'],
	])('keeps complete %s sentences and their closing punctuation', (locale, first, second, cta) => {
		const description = `${first} ${second} ${cta}`;
		expect(resolveShareCopy({ locales: [locale], minLength: 30, maxLength: description.length, candidates: [
			{ id: 'primary', text: { [locale]: 'Bref.' } },
			{ id: 'body', text: { [locale]: `${first}\n${second} ${'Too long '.repeat(40)}. Unfinished tail` } },
		], cta: { [locale]: cta } })[locale]).toMatchObject({ description });
	});

	it('does not treat known abbreviations, initials, acronyms or decimals as sentence ends', () => {
		const first = 'Dr. A. Roy uses e.g. version 2.5 in the U.S. for everyday readers.';
		const result = resolveShareCopy({ ...input, maxLength: first.length, candidates: [
			input.candidates[0]!, { id: 'body', text: { en: `${first} ${excerpt}` } },
		] }).en;
		expect(result).toMatchObject({ description: first });
		// The first full sentence is too large. Never use just "Dr." or skip into its middle.
		expect(resolveShareCopy({ ...input, minLength: 1, maxLength: 10, candidates: [
			{ id: 'primary', text: {} }, { id: 'body', text: { en: `${first} End.` } },
		] }).en).toMatchObject({ status: 'missing' });
	});

	it.each([
		['en', 'This project helps teams publish useful reports, dashboards, maps, etc.'],
		['en', 'This project helps teams publish useful reports for readers in the U.S.'],
		['en', '“This project helps teams publish useful reports, dashboards, maps, etc.”'],
		['fr', 'Ce projet aide les équipes à publier des rapports, tableaux et cartes, etc.'],
		['fr', '« Ce projet aide les équipes à publier des rapports, tableaux et cartes, etc. »'],
		['fr', 'Ce projet aide les équipes à publier des exemples utiles, p. ex.'],
		['es', 'Este proyecto permite compartir informes, tablas y mapas con todos, etc.'],
		['es', '“Este proyecto permite compartir informes, tablas y mapas con todos, etc.”'],
		['es', 'Este proyecto permite compartir ejemplos útiles con todos, p. ej.'],
	])('selects a complete %s sentence ending in an abbreviation', (locale, text) => {
		expect(resolveShareCopy({ locales: [locale], maxLength: Array.from(text).length, candidates: [
			{ id: 'primary', text: {} }, { id: 'body', text: { [locale]: text } },
		], defaults: { description: { [locale]: summary }, ogLine: { [locale]: primary } } })[locale])
			.toMatchObject({ status: 'selected', description: text, ogLine: text,
				descriptionSource: { rule: 'sentences', sourceLocale: locale },
				ogLineSource: { rule: 'sentences', sourceLocale: locale } });
	});

	it.each([
		['en', 'This project lets every team share important data, e.g.', 'Read the case study.'],
		['en', 'This project lets every team share important data, i.e.', 'Read the case study.'],
		['fr', 'Ce projet permet à toutes les équipes de partager des données utiles, p. ex.', 'Voir le cas d’étude.'],
		['es', 'Este proyecto permite a todos los equipos compartir datos importantes, p. ej.', 'Ver el caso de estudio.'],
		['es', 'Este proyecto permite compartir los informes del núm.', 'Ver el caso de estudio.'],
	])('never selects a %s fragment before an abbreviation continuation exceeds the budget', (locale, fragment, cta) => {
		const text = `${fragment} ${'descriptions détaillées '.repeat(15)}.`;
		expect(resolveShareCopy({ locales: [locale], maxLength: 150, candidates: [
			{ id: 'primary', text: {} }, { id: 'body', text: { [locale]: text } },
		], cta: { [locale]: cta }, defaults: { description: { [locale]: summary }, ogLine: { [locale]: primary } } })[locale])
			.toMatchObject({ description: summary, ogLine: primary,
				descriptionSource: { rule: 'default' }, ogLineSource: { rule: 'default' }, ctaAppended: false });
	});

	it('tries longer candidates in order and never cuts or skips an oversized leading sentence', () => {
		expect(resolveShareCopy({ ...input, candidates: [input.candidates[0]!,
			{ id: 'unfinished', text: { en: summary.slice(0, -1) } },
			{ id: 'oversized', text: { en: `${'Big '.repeat(70)}sentence. ${summary}` } },
			{ id: 'body', text: { en: `${excerpt} Unfinished tail` } },
		] }).en).toMatchObject({ description: excerpt, descriptionSource: { candidateId: 'body', candidateIndex: 3 } });
	});

	it.each(['A.', 'É.', 'Ö.', 'É.', 'Ö.', 'U.É.'])('keeps the initial %s inside an oversized sentence', (initial) => {
		expect(resolveShareCopy({ ...input, minLength: 40, maxLength: 60, candidates: [
			input.candidates[0]!, { id: 'body', text: { en:
				`Les interfaces accessibles sont étudiées par Mme. ${initial} Roy avec de nombreux détails supplémentaires pour tous les lecteurs.`,
			} },
		] }).en).toMatchObject({ status: 'missing', ogLine: primary });
	});

	it('uses complete leading longer sentences for OG only when neither locale has primary text', () => {
		expect(resolveShareCopy({ ...input, candidates: [{ id: 'primary', text: {} },
			{ id: 'body', text: { fr: `${french} ${french} ${french}` } },
		] }).fr).toMatchObject({ ogLine: `${french} ${french}`, ogLineSource: { rule: 'sentences', sourceLocale: 'fr' } });
	});

	it('uses independently configured defaults after content and preserves their provenance', () => {
		const defaults = { description: { en: summary }, ogLine: { en: 'Default card line.' } };
		expect(resolveShareCopy({ ...input, candidates: [], defaults }).fr).toMatchObject({
			description: summary, ogLine: defaults.ogLine.en,
			descriptionSource: { rule: 'default', sourceLocale: 'en', candidateId: null, candidateIndex: null },
			ogLineSource: { rule: 'default', sourceLocale: 'en' },
		});
		expect(resolveShareCopy({ ...input, candidates: [input.candidates[0]!], defaults }).en)
			.toMatchObject({ ogLine: primary, description: summary });
	});

	it('reports missing outputs explicitly, retaining an independently resolved primary', () => {
		expect(resolveShareCopy({ ...input, candidates: [] }).en).toEqual({ status: 'missing', locale: 'en' });
		expect(resolveShareCopy({ ...input, candidates: [input.candidates[0]!] }).en)
			.toMatchObject({ status: 'missing', ogLine: primary });
		expect(resolveShareCopy({ ...input, candidates: [], defaults: {
			description: { en: 'Too short.' }, ogLine: { en: 'W'.repeat(OG_LINE_MAX_LENGTH + 1) },
		} }).en).toEqual({ status: 'missing', locale: 'en' });
	});

	it.each([[0, 200], [50, 49], [1.5, 200], [50, Infinity], [NaN, 200]])(
		'rejects invalid bounds %s to %s', (minLength, maxLength) => {
			expect(() => resolveShareCopy({ ...input, minLength, maxLength })).toThrow(RangeError);
		},
	);
});
