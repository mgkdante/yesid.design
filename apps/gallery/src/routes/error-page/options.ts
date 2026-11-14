import type { ErrorPageIllustration, ErrorPageLink } from '@yesid/ui/layout';

/**
 * Gallery options for /error-page/[options], a prerendered path so the chosen props are in the
 * first markup. The segment joins tokens with dots: an illustration, a language, and any of
 * `no-label`, `no-tape` and `unnamed` (no `suggestionsLabel`). /error-page itself is today's page.
 */
export interface ErrorPageGalleryOptions {
	illustration: ErrorPageIllustration;
	label: boolean;
	tape: boolean;
	named: boolean;
	lang: ErrorPageGalleryLang;
}

export type ErrorPageGalleryLang = 'en' | 'fr' | 'es';

export const ILLUSTRATIONS: readonly ErrorPageIllustration[] = ['large-first', 'small-after', 'none'];
export const LANGS: readonly ErrorPageGalleryLang[] = ['en', 'fr', 'es'];

export const DEFAULT_OPTIONS: ErrorPageGalleryOptions = {
	illustration: 'large-first',
	label: true,
	tape: true,
	named: true,
	lang: 'en',
};

/** The path segment for a set of options; `parseOptions` reads it back. */
export function optionsSegment(options: Partial<ErrorPageGalleryOptions>): string {
	const { illustration, label, tape, named, lang } = { ...DEFAULT_OPTIONS, ...options };
	return [illustration, !label && 'no-label', !tape && 'no-tape', !named && 'unnamed', lang]
		.filter(Boolean)
		.join('.');
}

/** Reads a path segment; `undefined` for an unknown token. */
export function parseOptions(segment: string): ErrorPageGalleryOptions | undefined {
	const options = { ...DEFAULT_OPTIONS };
	for (const token of segment.split('.')) {
		if ((ILLUSTRATIONS as readonly string[]).includes(token)) options.illustration = token as ErrorPageIllustration;
		else if ((LANGS as readonly string[]).includes(token)) options.lang = token as ErrorPageGalleryLang;
		else if (token === 'no-label') options.label = false;
		else if (token === 'no-tape') options.tape = false;
		else if (token === 'unnamed') options.named = false;
		else return undefined;
	}
	return options;
}

/** Every prerendered option set: each illustration in each language, plus the quiet sets. */
export const OPTION_SEGMENTS: readonly string[] = [
	...ILLUSTRATIONS.flatMap((illustration) => LANGS.map((lang) => optionsSegment({ illustration, lang }))),
	optionsSegment({ illustration: 'small-after', label: false, tape: false }),
	optionsSegment({ illustration: 'small-after', label: false, tape: false, named: false }),
];

interface ErrorPageGalleryCopy {
	label: string;
	heading: string;
	body: string;
	suggestionsLabel: string;
	statusNote: string;
	suggestions: readonly ErrorPageLink[];
}

/** Literal headings and recovery links first, in the words yesid.dev drafted for its 404. */
export const copy: Record<ErrorPageGalleryLang, ErrorPageGalleryCopy> = {
	en: {
		label: 'Error 404',
		heading: 'Wrong platform',
		body: 'The page you asked for is not on this line.',
		suggestionsLabel: 'Suggested pages',
		statusNote: 'route not found',
		suggestions: [
			{ href: '/', label: 'Home' },
			{ href: '/listing-frame', label: 'Listing' },
			{ href: '/detail-frame', label: 'Detail' },
		],
	},
	fr: {
		label: 'Erreur 404',
		heading: 'Page introuvable à cette adresse',
		body: 'Cette page n’existe pas à cette adresse. Le lien a peut-être changé depuis votre dernière visite.',
		suggestionsLabel: 'Où aller ensuite',
		statusNote: 'itinéraire introuvable',
		suggestions: [
			{ href: '/', label: 'Retourner à l’accueil' },
			{ href: '/listing-frame', label: 'Voir la liste complète' },
			{ href: '/detail-frame', label: 'Consulter le détail' },
		],
	},
	es: {
		label: 'Error 404',
		heading: 'No encontramos esta página en esta dirección',
		body: 'Esta página no existe en esta dirección. El enlace puede haber cambiado desde tu última visita.',
		suggestionsLabel: 'Adónde ir ahora',
		statusNote: 'ruta no encontrada',
		suggestions: [
			{ href: '/', label: 'Volver al inicio' },
			{ href: '/listing-frame', label: 'Ver la lista completa' },
			{ href: '/detail-frame', label: 'Consultar el detalle' },
		],
	},
};
