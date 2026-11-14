import type { ErrorPageIllustration, ErrorPageLink } from '@yesid/ui/layout';

/** Gallery query options for /error-page; every option left out keeps today's page. */
export interface ErrorPageGalleryOptions {
	illustration: ErrorPageIllustration;
	label: boolean;
	tape: boolean;
	named: boolean;
	lang: ErrorPageGalleryLang;
}

export type ErrorPageGalleryLang = 'en' | 'fr' | 'es';

export const ILLUSTRATIONS: readonly ErrorPageIllustration[] = ['large-first', 'small-after', 'none'];

export function readOptions(params: Pick<URLSearchParams, 'get'>): ErrorPageGalleryOptions {
	const illustration = params.get('illustration') as ErrorPageIllustration | null;
	const lang = params.get('lang') as ErrorPageGalleryLang | null;
	return {
		illustration: illustration && ILLUSTRATIONS.includes(illustration) ? illustration : 'large-first',
		label: params.get('label') !== '0',
		tape: params.get('tape') !== '0',
		named: params.get('named') !== '0',
		lang: lang && lang in copy ? lang : 'en',
	};
}

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
