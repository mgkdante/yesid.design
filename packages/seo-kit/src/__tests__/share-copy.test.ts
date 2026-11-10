import { describe, expect, it } from 'vitest';
import { resolveShareCopy, type ShareCopyInput } from '../share-copy.js';

const summary = 'A practical guide to building accessible interfaces for everyday readers.';
const excerpt = 'How a small team made its publishing workflow clearer and easier to maintain.';
const input: ShareCopyInput = {
	locales: ['en', 'fr'],
	candidates: [{ id: 'oneLiner', text: { en: summary } }, { id: 'excerpt', text: { en: excerpt } }],
};

describe('resolveShareCopy', () => {
	it('selects the first usable content field and reports its provenance', () => {
		expect(resolveShareCopy(input).en).toEqual({
			status: 'selected', locale: 'en', sourceLocale: 'en', candidateId: 'oneLiner',
			candidateIndex: 0, description: summary, ogLine: summary, ctaAppended: false,
		});
	});

	it('skips empty, short and overlong fields without cutting any sentence', () => {
		const candidates = [
			{ id: 'empty', text: { en: '   ' } },
			{ id: 'short', text: { en: 'Too short.' } },
			{ id: 'long', text: { en: `${summary} ${excerpt} ${summary}` } },
			{ id: 'body', text: { en: `  ${excerpt}  ` } },
		];
		expect(resolveShareCopy({ ...input, candidates }).en).toMatchObject({
			candidateId: 'body', candidateIndex: 3, description: excerpt, ogLine: excerpt,
		});
	});

	it.each([50, 200])('accepts the inclusive default boundary of %i characters', (length) => {
		const text = `${'a'.repeat(length - 1)}.`;
		expect(resolveShareCopy({ ...input, candidates: [{ id: 'seo', text: { en: text } }] }).en)
			.toMatchObject({ status: 'selected', description: text, ogLine: text });
	});

	it('honours custom bounds and counts Unicode code points', () => {
		const text = '🧭🧭🧭.';
		expect(resolveShareCopy({ ...input, minLength: 4, maxLength: 4,
			candidates: [{ id: 'seo', text: { en: text } }] }).en)
			.toMatchObject({ status: 'selected', description: text });
	});

	it('adds an optional CTA before checking the minimum length', () => {
		const text = 'An accessible publishing workflow.';
		const cta = 'Read the complete article.';
		expect(resolveShareCopy({ ...input, candidates: [{ id: 'seo', text: { en: text } }], cta: { en: cta } }).en)
			.toMatchObject({ description: `${text} ${cta}`, ogLine: `${text} ${cta}`, ctaAppended: true });
	});

	it('keeps the first candidate without a CTA when appending would exceed the maximum', () => {
		expect(resolveShareCopy({ ...input, maxLength: summary.length, cta: { en: 'Read more.' } }).en)
			.toMatchObject({ candidateId: 'oneLiner', description: summary, ctaAppended: false });
	});

	it('appends a CTA that fits exactly at the maximum', () => {
		const description = `${summary} Read more.`;
		expect(resolveShareCopy({ ...input, maxLength: description.length, cta: { en: 'Read more.' } }).en)
			.toMatchObject({ description, ogLine: description, ctaAppended: true });
	});

	it('recognizes a CTA on a new line but not a suffix inside another word', () => {
		const text = `${summary}\nRead more.`;
		expect(resolveShareCopy({ ...input, candidates: [{ id: 'seo', text: { en: text } }], cta: { en: 'Read more.' } }).en)
			.toMatchObject({ description: text, ctaAppended: false });
		expect(resolveShareCopy({ ...input, candidates: [{ id: 'seo', text: { en: `${summary} Bread more.` } }],
			cta: { en: 'read more.' } }).en).toMatchObject({ description: `${summary} Bread more. read more.`, ctaAppended: true });
	});

	it.each([
		["See what's inside.", 'See what’s inside.'],
		['See what’s inside.', "See what's inside."],
		['See what‘s inside.', "See what's inside."],
		['Read more.', 'Read more.'],
	])('does not repeat an existing CTA: %s', (existing, cta) => {
		const text = `${summary} ${existing}`;
		const first = resolveShareCopy({ ...input, candidates: [{ id: 'seo', text: { en: text } }], cta: { en: cta } });
		expect(first.en).toMatchObject({ description: text, ogLine: text, ctaAppended: false });
	});

	it('is idempotent when selected content is passed through again', () => {
		const first = resolveShareCopy({ ...input, cta: { en: 'Read more.' } }).en!;
		if (first.status !== 'selected') throw new Error('Expected usable content');
		const second = resolveShareCopy({ ...input,
			candidates: [{ id: 'seo', text: { en: first.description } }], cta: { en: 'Read more.' } }).en;
		expect(second).toMatchObject({ description: first.description, ogLine: first.ogLine, ctaAppended: false });
	});

	it('exhausts local candidates before falling back and uses localized CTAs', () => {
		const french = 'Un guide pratique pour rendre les interfaces accessibles à tous les lecteurs.';
		const result = resolveShareCopy({ ...input, candidates: [
			{ id: 'oneLiner', text: { en: summary, fr: 'Court.' } },
			{ id: 'excerpt', text: { fr: french } },
		], cta: { en: 'Read more.', fr: 'Lire la suite.' } });
		expect(result.fr).toMatchObject({ sourceLocale: 'fr', candidateId: 'excerpt',
			description: `${french} Lire la suite.`, ogLine: `${french} Lire la suite.` });
	});

	it('falls back to English content and its CTA when local content is unusable', () => {
		expect(resolveShareCopy({ ...input, cta: { en: 'Read more.', fr: 'Lire la suite.' } }).fr)
			.toMatchObject({ locale: 'fr', sourceLocale: 'en', candidateId: 'oneLiner',
				description: `${summary} Read more.`, ogLine: `${summary} Read more.` });
	});

	it('supports a configured fallback even when it is not among the requested locales', () => {
		expect(resolveShareCopy({ locales: ['es'], defaultLocale: 'fr', candidates: [
			{ id: 'excerpt', text: { fr: excerpt } },
		] }).es).toMatchObject({ locale: 'es', sourceLocale: 'fr', description: excerpt });
	});

	it('uses the default CTA for a missing translation', () => {
		expect(resolveShareCopy({ ...input, candidates: [{ id: 'seo', text: { fr: excerpt } }],
			cta: { en: 'Read more.' } }).fr).toMatchObject({ sourceLocale: 'fr', description: `${excerpt} Read more.` });
	});

	it('reports missing content instead of synthesizing copy or shortening a long candidate', () => {
		expect(resolveShareCopy({ ...input, candidates: [{ id: 'body', text: { en: summary.repeat(4) } }] }))
			.toEqual({ en: { status: 'missing', locale: 'en' }, fr: { status: 'missing', locale: 'fr' } });
		expect(resolveShareCopy({ ...input, candidates: [] }).en).toEqual({ status: 'missing', locale: 'en' });
	});

	it.each([[0, 200], [50, 49], [1.5, 200], [50, Infinity], [NaN, 200]])(
		'rejects invalid bounds %s to %s', (minLength, maxLength) => {
			expect(() => resolveShareCopy({ ...input, minLength, maxLength })).toThrow(RangeError);
		},
	);
});
