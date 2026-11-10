/** One content field in priority order; products choose field names and locale keys. */
export interface ShareCopyCandidate {
	id: string;
	text: Readonly<Record<string, string | null | undefined>>;
}

export interface ShareCopyInput {
	locales: readonly string[];
	/** Used only after all candidates in the requested locale fail. Defaults to `en`. */
	defaultLocale?: string;
	candidates: readonly ShareCopyCandidate[];
	/** Missing translations use the default locale's label. No built-in copy. */
	cta?: Readonly<Record<string, string | undefined>>;
	/** Inclusive Unicode code-point bounds, after trimming and optional CTA. Defaults to 50. */
	minLength?: number;
	/** Defaults to 200. Candidates are skipped, never shortened. */
	maxLength?: number;
}

export interface ShareCopySelection {
	status: 'selected';
	/** Requested locale; `sourceLocale` identifies fallback content. */
	locale: string;
	sourceLocale: string;
	candidateId: string;
	candidateIndex: number;
	/** The same complete text for meta, Open Graph and Twitter descriptions. */
	description: string;
	/** Identical to `description`, for the text drawn on the OG image. */
	ogLine: string;
	ctaAppended: boolean;
}

/** Missing means neither local nor default-locale content fits; callers decide how to fail. */
export type ShareCopyResult = ShareCopySelection | { status: 'missing'; locale: string };

const length = (text: string) => Array.from(text).length;
const apostrophes = (text: string) => text.replace(/[‘’]/gu, "'");

function withCta(text: string, cta: string | undefined, maxLength: number) {
	if (!cta) return text;
	const normalized = apostrophes(text);
	const label = apostrophes(cta);
	if (normalized === label || (normalized.endsWith(label) && /\s/u.test(normalized.at(-label.length - 1) ?? ''))) {
		return text;
	}
	const combined = `${text} ${cta}`;
	return length(combined) <= maxLength ? combined : text;
}

function select(
	input: ShareCopyInput, sourceLocale: string, locale: string,
	defaultLocale: string, minLength: number, maxLength: number,
): ShareCopySelection | undefined {
	const cta = input.cta?.[sourceLocale]?.trim() || input.cta?.[defaultLocale]?.trim();
	for (const [candidateIndex, candidate] of input.candidates.entries()) {
		const text = candidate.text[sourceLocale]?.trim();
		if (!text) continue;
		const description = withCta(text, cta, maxLength);
		if (length(description) < minLength || length(description) > maxLength) continue;
		return {
			status: 'selected', locale, sourceLocale, candidateId: candidate.id, candidateIndex,
			description, ogLine: description, ctaAppended: description !== text,
		};
	}
	return undefined;
}

/** Resolves content once for reuse in the SEO head and OG card. Never truncates a candidate. */
export function resolveShareCopy(input: ShareCopyInput): Record<string, ShareCopyResult> {
	const { defaultLocale = 'en', minLength = 50, maxLength = 200 } = input;
	if (!Number.isInteger(minLength) || !Number.isInteger(maxLength) || minLength < 1 || maxLength < minLength) {
		throw new RangeError('Share copy bounds must be positive integers with maxLength >= minLength');
	}
	return Object.fromEntries(input.locales.map((locale) => {
		const local = select(input, locale, locale, defaultLocale, minLength, maxLength);
		const fallback = local || locale === defaultLocale ? undefined
			: select(input, defaultLocale, locale, defaultLocale, minLength, maxLength);
		return [locale, local ?? fallback ?? { status: 'missing', locale }];
	}));
}
