import type { ArticleMetaEntry } from '@yesid/ui/layout';

export type FixtureLanguage = 'en' | 'fr' | 'es';

export interface HeaderFixture {
	lang: FixtureLanguage;
	title: string;
	/** The post's first tag, as yesid.dev passes it to `highlight`. */
	highlight?: string;
	category: string;
	subtitle?: string;
	back: string;
	meta: ArticleMetaEntry[];
}

/** The yesid.dev tools essay in its three languages: its first tag `ai` sits inside "brain". */
export const essay: Record<FixtureLanguage, HeaderFixture> = {
	en: {
		lang: 'en',
		title: 'One brain for four AI tools: T3 Code and Notion',
		highlight: 'ai',
		category: 'Professional',
		subtitle:
			'I work with Codex, Claude, OpenCode and Antigravity. Each one has its own instructions, its own memory and its own way of knowing who I am.',
		back: '← Back to the blog',
		meta: [{ text: 'Nov 2026', datetime: '2026-11-01' }, '4 min read', 'English'],
	},
	fr: {
		lang: 'fr',
		title: 'Un seul cerveau pour quatre outils d’IA : T3 Code et Notion',
		highlight: 'ia',
		category: 'Professionnel',
		subtitle:
			'Je travaille avec Codex, Claude, OpenCode et Antigravity. Chacun a ses propres instructions, sa propre mémoire et sa propre façon de savoir qui je suis.',
		back: '← Retour au blogue',
		meta: [{ text: 'nov. 2026', datetime: '2026-11-01' }, '4 min de lecture', 'Français'],
	},
	es: {
		lang: 'es',
		title: 'Un solo cerebro para cuatro herramientas de IA: T3 Code y Notion',
		highlight: 'ia',
		category: 'Profesional',
		subtitle:
			'Trabajo con Codex, Claude, OpenCode y Antigravity. Cada una tiene sus propias instrucciones, su propia memoria y su propia forma de saber quién soy.',
		back: '← Volver al blog',
		meta: [{ text: 'nov 2026', datetime: '2026-11-01' }, '4 min de lectura', 'Español'],
	},
};

/** Deliberately long French and Spanish titles, with words wider than a 320 px column in display type. */
export const longTitles: Record<'fr' | 'es', HeaderFixture> = {
	fr: {
		lang: 'fr',
		title:
			'Reconstruire la fiabilité des horaires : responsabilités, interopérabilité et internationalisation des données ouvertes',
		category: 'Étude de cas',
		subtitle: 'Ce que les données ouvertes de la STM disent vraiment des retards, et ce qu’elles taisent.',
		back: '← Retour aux projets',
		meta: [{ label: 'Mis à jour le', text: '12 novembre 2026', datetime: '2026-11-12' }, '18 min de lecture', 'Français'],
	},
	es: {
		lang: 'es',
		title:
			'Responsabilidades compartidas: cómo reconstruimos la confiabilidad de los horarios con internacionalización',
		category: 'Caso de estudio',
		subtitle: 'Lo que los datos abiertos de la STM dicen de verdad sobre los retrasos, y lo que callan.',
		back: '← Volver a los proyectos',
		meta: [
			{ label: 'Última actualización el', text: 'miércoles 12 de noviembre de 2026', datetime: '2026-11-12' },
			'18 min de lectura',
			'Español',
		],
	},
};

/** A yesid.dev case study: a short title, a one-liner and proof links. */
export const caseStudy: HeaderFixture = {
	lang: 'en',
	title: 'Café Arona',
	category: 'Case study',
	subtitle: 'A bilingual website the family manages from Shopify.',
	back: '← Back to projects',
	meta: ['Sherbrooke, Québec', 'Shopify', 'Production'],
};
