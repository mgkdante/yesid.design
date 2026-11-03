import { clock as clockStore } from './clock.svelte.js';
import { persisted as persistedState } from './persisted.svelte.js';
import { sections as sectionsState } from './sections.svelte.js';
import { theme as themeStore } from './theme.svelte.js';

export type Theme = 'dark' | 'light';

/**
 * Dark is the default. The app's pre-paint script owns first paint from the `theme` storage key;
 * `init()` adopts what it applied. System preference is intentionally ignored.
 */
export interface ThemeStore {
	readonly current: Theme;
	readonly isDark: boolean;
	set(next: Theme): void;
	toggle(): void;
	init(): void;
}

/** In-memory actions for every mounted collapsible content section on the page. */
export interface SectionsState {
	/** Number of mounted collapsible content sections. */
	readonly count: number;
	readonly allCollapsed: boolean;
	collapseAll(): void;
	expandAll(): void;
	toggle(): void;
}

/** A value that stays valid in every locale: ids, slugs, flags, numbers, never translated text. */
export type LocaleFree = string | number | boolean | null | LocaleFree[];

/** Widens a literal seed (`''` to `string`) and keeps explicit unions such as `Locale | null`. */
export type Widen<T> = [T] extends [string]
	? string
	: [T] extends [number]
		? number
		: [T] extends [boolean]
			? boolean
			: T;

/**
 * Tab-scoped state: survives reloads and navigation within the tab, resets in a new tab.
 * `bind:value={state.value}` works directly.
 */
export interface Persisted<T extends LocaleFree> {
	value: T;
}

/**
 * One shared wall clock for live timestamps. It ticks every second while anything is subscribed
 * (every 30 s under reduced motion) and pauses in hidden tabs.
 */
export interface ClockStore {
	/** Wall-clock milliseconds, updated on each tick. */
	readonly now: number;
	/** `now` corrected by the last server time noted. */
	readonly serverNow: number;
	/** Server time read now, never stepping back by less than 2 s, for animation. */
	serverNowContinuousMs(): number;
	/** Anchors `serverNow` to a server timestamp, such as a response's `Date` header. */
	noteServerEpochMs(serverEpochMs: number): void;
	/** Starts the tick and returns its release; `$effect(() => clock.subscribe())`. */
	subscribe(): () => void;
}

export const theme: ThemeStore = themeStore;
export const clock: ClockStore = clockStore;
export const sections: SectionsState = sectionsState;
export const persisted: <T extends LocaleFree>(key: string, initial: T) => Persisted<Widen<T>> =
	persistedState;
export { desktop } from './desktop.js';
export { createLocaleContext, type LocaleContext } from './locale.js';
