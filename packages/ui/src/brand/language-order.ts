/** The brand signpost's display and cycle order. Products choose their supported set. */
export const LANGUAGE_ORDER = ['en', 'fr', 'es'] as const;

/** Known locales follow the brand order; other locales keep their supplied order. */
export function orderLanguages(locales: readonly string[]): string[] {
    const rank = (locale: string) => {
        const index = (LANGUAGE_ORDER as readonly string[]).indexOf(locale);
        return index < 0 ? LANGUAGE_ORDER.length : index;
    };
    return [...locales].sort((a, b) => rank(a) - rank(b));
}
