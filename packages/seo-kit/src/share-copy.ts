/** Maximum supported OG line length in Unicode code points, after collapsing whitespace. */
export const OG_LINE_MAX_LENGTH = 200;

type LocalizedText = Readonly<Record<string, string | null | undefined>>;

/** First candidate is the primary short text; remaining fields are longer plain-text summaries. */
export interface ShareCopyCandidate {
	id: string;
	text: LocalizedText;
}

export interface ShareCopyInput {
	locales: readonly string[];
	/** Used after requested-locale content is exhausted. Defaults to `en`. */
	defaultLocale?: string;
	candidates: readonly ShareCopyCandidate[];
	/** Missing translations use the default locale's label. No built-in copy. */
	cta?: Readonly<Record<string, string | undefined>>;
	/** Last-resort copy, checked against each output's bounds; no CTA is added. */
	defaults?: { description?: LocalizedText; ogLine?: LocalizedText };
	/** Inclusive description bounds in Unicode code points. Defaults to 50. */
	minLength?: number;
	/** Defaults to 200. Longer summaries contribute only complete leading sentences. */
	maxLength?: number;
}

export interface ShareCopySource {
	rule: 'primary-cta' | 'primary' | 'sentences' | 'default';
	sourceLocale: string;
	/** Null for configured defaults. */
	candidateId: string | null;
	/** Zero-based; null for configured defaults. */
	candidateIndex: number | null;
}

export interface ShareCopySelection {
	status: 'selected';
	locale: string;
	/** Description provenance aliases; the OG line can use a different locale and candidate. */
	sourceLocale: string;
	candidateId: string | null;
	candidateIndex: number | null;
	/** Bounded meta, Open Graph and Twitter description. */
	description: string;
	descriptionSource: ShareCopySource;
	/** Primary short text, independent of description bounds and CTA composition. */
	ogLine: string;
	ogLineSource: ShareCopySource;
	/** Whether this resolution appended the description CTA. */
	ctaAppended: boolean;
}

/** Missing outputs stay absent; any independently resolved output and its source are retained. */
export type ShareCopyResult = ShareCopySelection | {
	status: 'missing'; locale: string;
	description?: string; descriptionSource?: ShareCopySource;
	ogLine?: string; ogLineSource?: ShareCopySource;
};

type Copy = { text: string; source: ShareCopySource; ctaAppended: boolean };
const length = (text: string) => Array.from(text).length;
const collapse = (text: string | null | undefined) => text?.replace(/\s+/gu, ' ').trim() ?? '';
const apostrophes = (text: string) => text.replace(/[‘’]/gu, "'");

function withCta(text: string, cta: string, maxLength: number) {
	const normalized = apostrophes(text);
	const label = apostrophes(cta);
	if (!cta || normalized === label || (normalized.endsWith(label) && /[\s\p{P}]$/u.test(normalized.slice(0, -label.length)))) {
		return text;
	}
	const combined = `${text} ${cta}`;
	return length(combined) <= maxLength ? combined : text;
}

// Deliberately small abbreviation list, plus initials/acronyms and decimal points. Not NLP.
const abbreviation = /(?<![\p{L}\p{N}_])(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|etc|M|Mme|Mlle|Pr|Sra|Srta|Ud|Uds|e\.g|i\.e|p\.\s*(?:ex|ej)|núm|\p{L})\.$/iu;

/** Returns only complete sentences; an unfinished final tail never becomes share copy. */
function leadingSentences(text: string, maxLength: number): string {
	let end = 0;
	const boundaries = /[.!?…]+["'”’»)\]}]*(?:\s+["”’»)\]}]+)*(?=\s|$)/gu;
	for (const match of text.matchAll(boundaries)) {
		const nextEnd = match.index + match[0].length;
		if (length(text.slice(0, nextEnd)) > maxLength) break;
		const punctuationEnd = match.index + match[0].search(/["'”’»)\]}\s]|$/u);
		if (nextEnd < text.length && text[match.index] === '.' && abbreviation.test(text.slice(0, punctuationEnd))) continue;
		end = nextEnd;
	}
	return text.slice(0, end).trim();
}

function fromCandidate(input: ShareCopyInput, index: number, sourceLocale: string, rule: ShareCopySource['rule'], text: string): Copy {
	return { text, source: { rule, sourceLocale, candidateId: input.candidates[index]!.id, candidateIndex: index }, ctaAppended: false };
}

function configuredDefault(input: ShareCopyInput, locales: string[], output: 'description' | 'ogLine', min: number, max: number): Copy | undefined {
	for (const sourceLocale of locales) {
		const text = collapse(input.defaults?.[output]?.[sourceLocale]);
		if (length(text) >= min && length(text) <= max) return {
			text, source: { rule: 'default', sourceLocale, candidateId: null, candidateIndex: null }, ctaAppended: false,
		};
	}
	return undefined;
}

function selectOgLine(input: ShareCopyInput, locales: string[]): Copy | undefined {
	for (const sourceLocale of locales) {
		const text = collapse(input.candidates[0]?.text[sourceLocale]);
		if (text) return fromCandidate(input, 0, sourceLocale, 'primary', text);
	}
	for (const sourceLocale of locales) {
		for (let index = 1; index < input.candidates.length; index++) {
			const text = leadingSentences(collapse(input.candidates[index]!.text[sourceLocale]), OG_LINE_MAX_LENGTH);
			if (text) return fromCandidate(input, index, sourceLocale, 'sentences', text);
		}
	}
	return configuredDefault(input, locales, 'ogLine', 1, OG_LINE_MAX_LENGTH);
}

function selectDescription(input: ShareCopyInput, locales: string[], min: number, max: number): Copy | undefined {
	for (const sourceLocale of locales) {
		const cta = collapse(input.cta?.[sourceLocale]) || collapse(input.cta?.[input.defaultLocale ?? 'en']);
		for (let index = 0; index < input.candidates.length; index++) {
			const raw = collapse(input.candidates[index]!.text[sourceLocale]);
			const text = index === 0 ? raw : leadingSentences(raw, max);
			if (!text) continue;
			const description = withCta(text, cta, max);
			if (length(description) < min || length(description) > max) continue;
			const rule = index === 0 ? (cta && description === withCta(text, cta, Infinity) ? 'primary-cta' : 'primary') : 'sentences';
			return { ...fromCandidate(input, index, sourceLocale, rule, description), ctaAppended: description !== text };
		}
	}
	return configuredDefault(input, locales, 'description', min, max);
}

/** Resolves independent card and description text, with per-output rule/candidate provenance. */
export function resolveShareCopy(input: ShareCopyInput): Record<string, ShareCopyResult> {
	const { defaultLocale = 'en', minLength = 50, maxLength = 200 } = input;
	if (!Number.isInteger(minLength) || !Number.isInteger(maxLength) || minLength < 1 || maxLength < minLength) {
		throw new RangeError('Share copy bounds must be positive integers with maxLength >= minLength');
	}
	return Object.fromEntries(input.locales.map((locale) => {
		const locales = locale === defaultLocale ? [locale] : [locale, defaultLocale];
		const description = selectDescription(input, locales, minLength, maxLength);
		const ogLine = selectOgLine(input, locales);
		if (!description || !ogLine) return [locale, {
			status: 'missing', locale,
			...(description && { description: description.text, descriptionSource: description.source }),
			...(ogLine && { ogLine: ogLine.text, ogLineSource: ogLine.source }),
		}];
		return [locale, {
			status: 'selected', locale, sourceLocale: description.source.sourceLocale,
			candidateId: description.source.candidateId, candidateIndex: description.source.candidateIndex,
			description: description.text, descriptionSource: description.source,
			ogLine: ogLine.text, ogLineSource: ogLine.source, ctaAppended: description.ctaAppended,
		}];
	}));
}
