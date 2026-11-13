<!--
  Floating pill header: wordmark, links, optional search and actions, then the theme, language and
  menu controls. It opens with a skip link to `#main`; the pill is the page's banner. The menu is a
  full-screen metro line on a bits-ui Dialog; the pill renders inside the dialog content so it stays
  reachable and focus-trapped above the open menu.
  `--site-header-inset-end` narrows the header beside a docked panel, animated over
  `--site-header-inset-duration`. Snippets can query the header's width with `@container site-header`.
-->
<script lang="ts" module>
	import type { Component, Snippet } from 'svelte';
	import type { LanguageToggleProps } from '../brand/LanguageToggle.svelte';
	import type { NavigationLifecycle } from '../brand/navigation-lifecycle.js';

	export interface SiteHeaderLink {
		href: string;
		label: string;
		current?: boolean;
		/** 1 shows from a 375px header, 2 from 500px, 3 from 1024px, and only while the links fit. */
		priority?: 1 | 2 | 3;
	}

	export interface SiteHeaderMenuItem {
		href: string;
		label: string;
		subtitle?: string;
		current?: boolean;
		/** Opens in a new tab with `rel="noopener noreferrer"`. */
		external?: boolean;
		ariaLabel?: string;
		/** A Lucide-style icon component, lit on the current page; without one the item shows a stop. */
		icon?: Component<{ class?: string }>;
	}

	export interface SiteHeaderMenuGroup {
		label: string;
		items: readonly SiteHeaderMenuItem[];
	}

	export interface SiteHeaderLabels {
		openMenu: string;
		closeMenu: string;
		/** The menu dialog's title. */
		menu: string;
		theme: string;
		/** Accessible name of the header's navigation. */
		nav?: string;
		/** An empty string hides the footer. Copy belongs to the consumer. */
		menuFooter: string;
		/** The skip link's text, supplied by the consumer. */
		skipToContent: string;
	}

	export interface SiteHeaderProps {
		/** The persistent app layout's single navigation lifecycle. */
		navigation: NavigationLifecycle;
		home: string;
		wordmark?: string;
		links: readonly SiteHeaderLink[];
		menuItems?: readonly SiteHeaderMenuItem[];
		/** When supplied, replaces menuItems, including when empty. */
		menuGroups?: readonly SiteHeaderMenuGroup[];
		/** Moves theme and language controls into the menu below a 600px header width. */
		compactControls?: boolean;
		labels: SiteHeaderLabels;
		language?: Omit<LanguageToggleProps, 'ref' | 'class'>;
		/** Shown from a 1024px header; folds away with the links while the menu is open. */
		search?: Snippet;
		/** Rendered before the theme, language and menu controls. */
		actions?: Snippet;
	}
</script>

<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import { Dialog } from 'bits-ui';
	import { magnetic } from '@yesid/motion/actions';
	import { isPrefersReducedMotion } from '@yesid/motion/stores/reducedMotion';
	import { getLenis } from '@yesid/motion/utils/lenis';
	import LanguageToggle from '../brand/LanguageToggle.svelte';
	import ThemeToggle from '../brand/ThemeToggle.svelte';
	import Wordmark from '../brand/Wordmark.svelte';
	import { linksFit } from './links-fit.js';

	let { navigation, home, wordmark, links, menuItems = [], menuGroups, compactControls = false, labels, language, search, actions }: SiteHeaderProps =
		$props();

	const contentId = $props.id();
	const linksFrom = $derived(Math.min(...links.map((link) => link.priority ?? 1)));
	const menuFooter = $derived(labels.menuFooter);
	const skipToContent = $derived(labels.skipToContent);

	const indexedGroups = $derived.by(() => {
		let offset = 0;
		return menuGroups?.map(group => {
			const indexed = { ...group, offset };
			offset += group.items.length;
			return indexed;
		});
	});
	const menuLanguageLabel = $derived(language
		? `${language.label}: ${language.locales.map(locale => language.names[locale]).join(' / ')}`
		: '');

	let narrow = $state(false);
	const controlsInMenu = $derived(compactControls && narrow);
	let pillLanguageLink = $state<HTMLAnchorElement | null>(null);
	function measureHeader(node: HTMLElement) {
		const observer = new ResizeObserver(([entry]) => { narrow = entry.contentRect.width < 600; });
		observer.observe(node);
		return { destroy: () => observer.disconnect() };
	}
	let languageLink = $state<HTMLAnchorElement | null>(null);
	let menuToggle: HTMLButtonElement;
	let overlay: HTMLElement | undefined = $state();

	let menuOpen = $state(false);
	// True while the menu is visible, including its close animation; the pill's compact state follows this.
	let active = $state(false);
	let entering = $state(false);
	let closing = $state(false);

	let dismissVersion = 0;

	function toggleMenu() {
		if (navigation.pending) return;
		dismissVersion = navigation.version;
		menuOpen = !menuOpen;
		if (menuOpen) {
			active = true;
		}
	}

	// svelte-ignore state_referenced_locally
	onDestroy(navigation.attachMenu({
		get open() { return menuOpen; },
		get active() { return active; },
		close: () => { menuOpen = false; },
		languageLink: () => controlsInMenu ? languageLink : pillLanguageLink,
	}));

	$effect(() => {
		if (active) return;
		navigation.menuClosed();
	});

	$effect(() => {
		if (menuOpen) {
			entering = true;
			active = true;
			closing = false;
		} else if (active && !closing) {
			closing = true;
			if (isPrefersReducedMotion()) finishClose();
		}
	});

	// Paint the menu in its entering state, then drop the class so it transitions in.
	$effect(() => {
		if (!entering || closing || !overlay) return;
		if (isPrefersReducedMotion()) {
			entering = false;
			return;
		}
		const timer = setTimeout(() => (entering = false), 30);
		return () => clearTimeout(timer);
	});

	// Close anyway if transitionend never fires.
	$effect(() => {
		if (!closing) return;
		const timer = setTimeout(finishClose, 500);
		return () => clearTimeout(timer);
	});

	function finishClose() {
		if (!active || menuOpen || !closing) return;
		active = false;
		closing = false;
		entering = false;
	}

	function close() {
		if (menuOpen) dismissVersion = navigation.version;
		menuOpen = false;
	}

	async function restoreTrigger(event: Event) {
		event.preventDefault();
		const version = dismissVersion;
		await tick();
		if (!active && !menuOpen && version === navigation.version) menuToggle.focus({ preventScroll: true });
	}
</script>

{#snippet menuItem(item: SiteHeaderMenuItem, i: number, items: readonly SiteHeaderMenuItem[], offset = 0)}
	<a
		href={item.href}
		target={item.external ? '_blank' : undefined}
		rel={item.external ? 'noopener noreferrer' : undefined}
		aria-label={item.ariaLabel}
		class="menu-item"
		class:menu-item-active={item.current}
		aria-current={item.current ? 'page' : undefined}
		onclick={close}
		style="--item-index: {offset + i}"
	>
		{#if item.icon}
			<item.icon class="menu-icon" />
		{:else}
			<span class="menu-stop" class:menu-stop-active={item.current}>
				{#if item.current}<span class="menu-stop-fill"></span>{/if}
			</span>
		{/if}
		{#if i < items.length - 1}
			<span class="menu-line" class:menu-line-active={item.current}></span>
		{/if}
		<span class="menu-text">
			<span class="menu-label">{item.label}</span>
			<span class="menu-subtitle">{item.subtitle ?? ''}</span>
		</span>
	</a>
{/snippet}

<a class="skip-link" href="#main">{skipToContent}</a>

<!-- Bound to `active` so the focus trap and scroll lock last through the close animation. -->
<Dialog.Root open={active} onOpenChange={(open) => !open && close()}>
	<Dialog.Content
		forceMount
		id={contentId}
		onCloseAutoFocus={restoreTrigger}
		onEscapeKeydown={(event) => {
			event.preventDefault();
			close();
		}}
		onInteractOutside={(event) => {
			event.preventDefault();
			close();
		}}
		onOpenAutoFocus={(event) => {
			// Cancel in-flight page momentum; bits-ui owns the scroll lock.
			const lenis = getLenis();
			lenis?.scrollTo(lenis.scroll, { immediate: true });
			event.preventDefault();
			menuToggle.focus({ preventScroll: true });
		}}
	>
		{#snippet child({ props })}
			<div
				{...props}
				class="menu-dialog"
				class:menu-dialog-active={active}
				role={active ? 'dialog' : undefined}
				aria-modal={active ? 'true' : undefined}
				{...(active ? {} : { 'aria-labelledby': undefined, 'aria-describedby': undefined, tabindex: undefined })}
				style:pointer-events={active ? 'auto' : 'none'}
				style:contain="none"
				data-lenis-prevent={active ? true : undefined}
			>
				<header
					data-testid="nav"
					data-slot="site-header"
					use:measureHeader
					class="nav-root pointer-events-none fixed left-0 right-0 flex flex-col items-center"
					style:z-index={active ? 'var(--z-nav)' : 'var(--z-sheet)'}
				>
					<nav
						data-testid="nav-pill"
						data-links-from={linksFrom}
						aria-label={labels.nav}
						class="nav-pill pointer-events-auto flex items-center"
						class:nav-pill-compact={active}
						use:linksFit={{ paused: active }}
					>
						<Wordmark href={home} text={wordmark} autoPlay class="nav-wordmark" />

						{#if links.length}
							<span class="nav-divider nav-collapsible nav-links-part" class:nav-collapsed={active} aria-hidden="true"
							></span>
							<div inert={active} class="nav-links nav-collapsible nav-links-part" class:nav-collapsed={active}>
								{#each links as link (link.href)}
									<span data-priority={link.priority ?? 1} use:magnetic={{ strength: 6, radius: 50 }}>
										<a
											href={link.href}
											class="nav-pill-link inline-flex min-h-11 min-w-11 items-center justify-center px-1 transition-all {link.current
												? 'nav-link-active text-primary'
												: 'text-secondary-foreground hover:text-primary active:text-primary'}"
											aria-current={link.current ? 'page' : undefined}>{link.label}</a
										>
									</span>
								{/each}
							</div>
						{/if}

						{#if search}
							<div inert={active} class="nav-search nav-collapsible" class:nav-collapsed={active}>
								<span class="nav-divider" aria-hidden="true"></span>
								{@render search()}
							</div>
						{/if}

						<span class="nav-divider" aria-hidden="true"></span>
						{@render actions?.()}
						{#if !controlsInMenu}
							<span class="pill-controls" class:compact-controls={compactControls}>
								<ThemeToggle label={labels.theme} />
								{#if language}<LanguageToggle {...language} bind:ref={pillLanguageLink} />{/if}
							</span>
						{/if}
						<button
							bind:this={menuToggle}
							type="button"
							data-testid="nav-menu-toggle"
							class="menu-toggle"
							class:menu-toggle-open={active}
							aria-label={active ? labels.closeMenu : labels.openMenu}
							aria-expanded={menuOpen}
							aria-controls={contentId}
							onclick={toggleMenu}
						>
							<span class="menu-toggle-line menu-toggle-top"></span>
							<span class="menu-toggle-line menu-toggle-bottom"></span>
						</button>
					</nav>
				</header>

				{#if active}
					<div
						bind:this={overlay}
						class="menu-overlay"
						class:entering
						class:closing
						ontransitionend={(event) => {
							if (closing && event.target === overlay && event.propertyName === 'transform') finishClose();
						}}
					>
						<Dialog.Title class="sr-only">{labels.menu}</Dialog.Title>
						<nav class="menu-content" aria-label={labels.menu}>
							{#if indexedGroups !== undefined}
								{#each indexedGroups as group, groupIndex}
									<h3 class="menu-group-heading" id="{contentId}-group-{groupIndex}">{group.label}</h3>
									<ul aria-labelledby="{contentId}-group-{groupIndex}">
										{#each group.items as item, i (item.href)}
											<li>{@render menuItem(item, i, group.items, group.offset)}</li>
										{/each}
									</ul>
								{/each}
							{:else}
								{#each menuItems as item, i (item.href)}{@render menuItem(item, i, menuItems)}{/each}
							{/if}
						</nav>
						{#if controlsInMenu}
							<div class="menu-controls">
								<div><span aria-hidden="true">{labels.theme}</span><ThemeToggle label={labels.theme} /></div>
								{#if language && language.locales.length >= 2}
									<div>
										<span aria-hidden="true">{menuLanguageLabel}</span>
										<LanguageToggle {...language} label={menuLanguageLabel} bind:ref={languageLink} />
									</div>
								{/if}
							</div>
						{/if}
						{#if menuFooter}
							<div class="menu-footer">
								<span class="menu-footer-line"></span>
								<span class="menu-footer-label">{menuFooter}</span>
								<span class="menu-footer-line"></span>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		{/snippet}
	</Dialog.Content>
</Dialog.Root>

<style>
	.pill-controls { display: contents; }
	@container site-header (width < 600px) {
		.pill-controls.compact-controls { display: none; }
	}
	.menu-group-heading {
		margin-top: 24px;
		font-family: var(--font-body);
		font-size: var(--text-small);
		color: var(--muted-foreground);
	}
	.menu-content ul { list-style: none; padding: 0; margin: 0; }
	.menu-controls { padding-top: 24px; font-family: var(--font-body); }
	.menu-controls > div { display: flex; align-items: center; gap: 16px; }
	/* Off screen until focused, then above the header. */
	.skip-link {
		position: fixed;
		top: var(--nav-top);
		left: -9999px;
		z-index: var(--z-overlay);
		display: inline-flex;
		align-items: center;
		min-block-size: var(--size-tap-min);
		padding-inline: 1rem;
		border-radius: var(--radius-pill);
		background: var(--primary);
		color: var(--background);
		font-family: var(--font-body);
		font-weight: 600;
	}
	.skip-link:focus {
		left: 1rem;
	}

	/* ── Pill ── */
	.nav-root {
		top: var(--nav-top);
		padding-inline-end: var(--site-header-inset-end, 0px);
		container: site-header / inline-size;
		transition: padding-inline-end var(--site-header-inset-duration, var(--duration-normal)) var(--ease-default);
	}
	.nav-pill {
		background: color-mix(in srgb, var(--background) 92%, transparent);
		-webkit-backdrop-filter: blur(var(--glass-blur));
		backdrop-filter: blur(var(--glass-blur));
		border: var(--nav-border) solid var(--border-brand);
		border-radius: var(--radius-pill);
		box-shadow: var(--shadow-nav);
		padding: var(--nav-padding-y) 28px;
		transition:
			padding var(--duration-normal) var(--ease-default),
			box-shadow var(--duration-normal) var(--ease-default);
	}
	.nav-pill-compact {
		padding: var(--nav-padding-y) 20px;
		box-shadow: none;
		border-color: var(--border-brand-active);
	}

	/* Sized here so the compaction tiers can shrink it; the wordmark never wraps. */
	.nav-pill :global(.nav-wordmark) {
		font-size: var(--text-nav-brand-desktop);
	}
	.nav-pill-link {
		position: relative;
		font-size: var(--text-nav-link-desktop);
		font-weight: 500;
		white-space: nowrap;
	}
	.nav-pill-link:not(.nav-link-active):hover {
		text-shadow:
			0 0 8px color-mix(in srgb, var(--glow) 60%, transparent),
			0 0 20px color-mix(in srgb, var(--glow) 30%, transparent);
	}
	.nav-link-active {
		text-shadow:
			0 0 8px color-mix(in srgb, var(--glow) 50%, transparent),
			0 0 16px color-mix(in srgb, var(--glow) 20%, transparent);
	}
	/* "You are here" lamp: an amber dot, absolutely placed so it never shifts layout. */
	.nav-pill-link[aria-current='page']::after {
		content: '';
		position: absolute;
		left: 50%;
		bottom: 4px;
		width: 3px;
		height: 3px;
		border-radius: 50%;
		transform: translateX(-50%);
		background: var(--accent);
	}

	.nav-divider {
		display: inline-block;
		width: 2px;
		height: 18px;
		background: var(--border-brand);
		margin-inline: 20px;
		flex-shrink: 0;
	}
	.nav-links {
		display: flex;
		align-items: center;
		gap: 28px;
	}
	.nav-search {
		display: flex;
		align-items: center;
		min-width: 0;
	}

	/* Links that don't fit move to the menu (links-fit); this holds until it measures them. */
	@container site-header (width < 375px) {
		.nav-links-part {
			display: none;
		}
	}
	@container site-header (width < 500px) {
		.nav-links [data-priority='2'] {
			display: none;
		}
	}
	@container site-header (width < 1024px) {
		.nav-links [data-priority='3'],
		.nav-pill[data-links-from='3'] .nav-links-part,
		.nav-search {
			display: none;
		}
	}

	/* Compaction tiers squeeze decorative spacing, never the 44px hit areas. */
	@media (max-width: 767px) {
		.nav-pill {
			padding: var(--nav-padding-y) 16px;
		}
		.nav-pill-compact {
			padding: var(--nav-padding-y) 14px;
		}
		.nav-pill :global(.nav-wordmark) {
			font-size: var(--text-nav-brand-mobile);
		}
		.nav-divider {
			margin-inline: 10px;
		}
		.nav-links {
			gap: 18px;
		}
		.nav-pill-link {
			font-size: var(--text-nav-link-mobile);
		}
	}
	@media (max-width: 479px) {
		.nav-pill,
		.nav-pill-compact {
			padding: var(--nav-padding-y) 8px;
		}
		.nav-pill :global(.nav-wordmark) {
			font-size: var(--text-nav-brand-compact);
		}
		.nav-divider {
			margin-inline: 4px;
		}
		.nav-links {
			gap: 7px;
		}
		.nav-pill-link {
			font-size: var(--text-nav-link-compact);
		}
	}
	@media (max-width: 359px) {
		.nav-pill,
		.nav-pill-compact {
			padding: var(--nav-padding-y) 4px;
		}
		.nav-divider {
			margin-inline: 2px;
		}
		/* Only the wordmark-to-links divider stays at the 320px floor. */
		.nav-divider:not(.nav-collapsible) {
			display: none;
		}
		.nav-links {
			gap: 2px;
		}
		.nav-pill-link {
			padding-inline: 2px;
		}
	}

	/* The links (and search) fold away while the menu is open. */
	.nav-collapsible {
		overflow: visible;
		max-width: 300px;
		opacity: 1;
		transition:
			max-width var(--duration-slow) var(--ease-default),
			opacity var(--duration-normal) var(--ease-default),
			margin var(--duration-slow) var(--ease-default);
	}
	.nav-search.nav-collapsible {
		max-width: 40rem;
	}
	.nav-collapsible.nav-collapsed {
		overflow: hidden;
		max-width: 0;
		opacity: 0;
		margin-inline: 0;
	}

	/* Hamburger morphing to ✕. */
	.menu-toggle {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 5px;
		padding: 4px;
		min-height: 44px;
		min-width: 44px;
		cursor: pointer;
		background: none;
		border: none;
	}
	.menu-toggle-line {
		display: block;
		height: 1.5px;
		border-radius: var(--radius-pill);
		background: var(--secondary-foreground);
		transform-origin: center;
		transition:
			transform var(--duration-normal) var(--ease-default),
			width var(--duration-normal) var(--ease-default),
			background var(--duration-fast);
	}
	.menu-toggle-top {
		width: 16px;
	}
	.menu-toggle-bottom {
		width: 11px;
	}
	.menu-toggle:hover .menu-toggle-line {
		background: var(--foreground);
	}
	.menu-toggle-open {
		position: relative;
		z-index: var(--z-nav);
	}
	.menu-toggle-open .menu-toggle-top {
		width: 16px;
		transform: translateY(3.25px) rotate(45deg);
	}
	.menu-toggle-open .menu-toggle-bottom {
		width: 16px;
		transform: translateY(-3.25px) rotate(-45deg);
	}

	/* ── Menu ── */
	.menu-dialog {
		position: fixed;
		inset: 0;
		z-index: var(--z-sheet);
	}
	.menu-dialog-active {
		z-index: var(--z-menu);
		background: var(--background);
		background-image: radial-gradient(ellipse at 50% 0%, color-mix(in srgb, var(--glow) 4%, transparent) 0%, transparent 60%);
	}
	/* Light primary is muted, so the cast-from-above glow needs a stronger mix to read the same. */
	:global([data-theme='light']) .menu-dialog-active {
		background-image: radial-gradient(ellipse at 50% 0%, color-mix(in srgb, var(--glow) 16%, transparent) 0%, transparent 58%);
	}

	/* Starts below the pill. Auto margins on the list and footer centre them as a group but collapse to
	   zero when the group is taller than the overlay, so the first item never rides under the pill. */
	.menu-overlay {
		position: fixed;
		inset: 0;
		top: calc(var(--chrome-offset, var(--nav-clearance)) + 1rem);
		z-index: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
		padding: 0 24px calc(24px + env(safe-area-inset-bottom, 0px));
		overflow-y: auto;
		overscroll-behavior: contain;
		touch-action: pan-y;
		opacity: 1;
		transform: scaleY(1);
		transform-origin: top center;
		transition:
			opacity var(--duration-normal) var(--ease-default),
			transform var(--duration-slow) cubic-bezier(0.33, 1, 0.68, 1);
	}
	.menu-overlay.entering {
		opacity: 0;
		transform: scaleY(0);
		transition: none;
	}
	.menu-overlay.closing {
		opacity: 0;
		transform: scaleY(0);
		transition:
			opacity var(--duration-normal) ease-in,
			transform var(--duration-normal) cubic-bezier(0.32, 0, 0.67, 0);
	}

	.menu-content {
		position: relative;
		display: flex;
		flex-direction: column;
		width: fit-content;
		max-width: 100%;
		margin-top: auto;
	}
	/* Without a footer the list balances its own top margin. */
	.menu-content:last-child {
		margin-bottom: auto;
	}
	.menu-item {
		position: relative;
		display: flex;
		align-items: flex-start;
		gap: 20px;
		--menu-pad: 14px;
		padding-block: var(--menu-pad);
		font-size: var(--text-menu-label-mobile);
		text-decoration: none;
		opacity: 1;
		transform: translateY(0);
		transition:
			opacity var(--duration-normal) var(--ease-default) calc(var(--item-index) * 0.04s),
			transform var(--duration-normal) var(--ease-default) calc(var(--item-index) * 0.04s),
			color var(--duration-fast);
	}
	.menu-overlay.entering .menu-item {
		opacity: 0;
		transform: translateY(16px);
		transition: none;
	}
	.menu-overlay.closing .menu-item {
		opacity: 0;
		transform: translateY(-8px);
		transition:
			opacity 0.12s ease-in calc(var(--item-index) * 0.02s),
			transform 0.12s ease-in calc(var(--item-index) * 0.02s);
	}

	.menu-stop {
		position: relative;
		flex-shrink: 0;
		width: 14px;
		height: 14px;
		margin-top: 5px;
		border: 2px solid var(--border-subtle);
		border-radius: 50%;
		transition: border-color var(--duration-fast);
	}
	.menu-stop-active,
	.menu-item:hover .menu-stop {
		border-color: var(--primary);
	}
	.menu-stop-active {
		box-shadow: 0 0 12px color-mix(in srgb, var(--glow) 40%, transparent);
	}
	.menu-stop-fill {
		position: absolute;
		inset: 2px;
		border-radius: 50%;
		background: var(--primary);
	}
	/* Centred on the label's first line (line-height 1.5). */
	.menu-item :global(.menu-icon) {
		flex-shrink: 0;
		width: 24px;
		height: 24px;
		margin-top: calc(0.75em - 12px);
		color: var(--muted-foreground);
		stroke-width: 1.75;
		transition:
			color var(--duration-fast),
			fill var(--duration-fast);
	}
	.menu-item:hover :global(.menu-icon) {
		color: var(--primary);
	}
	.menu-item-active :global(.menu-icon) {
		color: var(--primary);
		fill: color-mix(in srgb, var(--primary) 25%, transparent);
		filter: drop-shadow(0 0 6px color-mix(in srgb, var(--glow) 50%, transparent));
	}
	.menu-line {
		position: absolute;
		left: 6px;
		top: calc(var(--menu-pad) + 19px);
		bottom: calc(-1 * var(--menu-pad));
		width: 2px;
		background: color-mix(in srgb, var(--foreground) 6%, transparent);
	}
	.menu-item:has(> :global(.menu-icon)) .menu-line {
		left: 11px;
		top: calc(var(--menu-pad) + 0.75em + 12px);
		bottom: calc(12px - 0.75em - var(--menu-pad));
	}
	.menu-line-active {
		background: linear-gradient(
			to bottom,
			color-mix(in srgb, var(--primary) 40%, transparent),
			color-mix(in srgb, var(--foreground) 6%, transparent)
		);
	}

	.menu-text {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
		overflow-wrap: anywhere;
	}
	.menu-label {
		font-family: var(--font-heading);
		font-weight: 600;
		line-height: 1.5;
		color: var(--secondary-foreground);
		transition:
			color var(--duration-fast),
			text-shadow var(--duration-fast);
	}
	@media (min-width: 768px) {
		.menu-item {
			font-size: var(--text-menu-label-desktop);
		}
	}
	.menu-item-active .menu-label {
		color: var(--primary);
		text-shadow: 0 0 8px color-mix(in srgb, var(--glow) 50%, transparent);
	}
	.menu-item:hover .menu-label {
		color: var(--primary);
		text-shadow:
			0 0 8px color-mix(in srgb, var(--glow) 60%, transparent),
			0 0 20px color-mix(in srgb, var(--glow) 30%, transparent);
	}
	.menu-subtitle {
		font-family: var(--font-mono);
		font-size: var(--text-menu-subtitle);
		color: var(--muted-foreground);
		letter-spacing: 0;
	}

	/* In flow, so it never overlaps the last item. */
	.menu-footer {
		display: flex;
		flex-shrink: 0;
		align-items: center;
		gap: 16px;
		margin-bottom: auto;
		padding-top: 24px;
	}
	.menu-footer-line {
		width: 40px;
		height: 1px;
		background: color-mix(in srgb, var(--primary) 20%, transparent);
	}
	.menu-footer-label {
		font-family: var(--font-mono);
		font-size: var(--text-menu-subtitle);
		letter-spacing: 0;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--primary) 85%, transparent);
		white-space: nowrap;
	}

	@media (max-height: 720px) {
		.menu-item {
			min-height: 44px;
			--menu-pad: 10px;
			font-size: clamp(1.5rem, 2vw, 1.75rem);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.nav-root,
		.nav-pill,
		.nav-collapsible,
		.menu-toggle-line,
		.menu-overlay,
		.menu-item,
		.menu-item :global(.menu-icon) {
			transition: none;
		}
	}
</style>
