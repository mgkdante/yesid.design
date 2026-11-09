<script lang="ts" module>
	import { tv, type VariantProps } from 'tailwind-variants';
	import { twMergeConfig } from '../../cn/index.js';

	export const sheetVariants = tv(
		{
			base: 'bg-popover text-popover-foreground shadow-sheet fixed flex flex-col gap-4 transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 motion-safe:data-[state=open]:animate-in motion-safe:data-[state=closed]:animate-out motion-reduce:transition-none',
			variants: {
				side: {
					right:
						'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full w-3/4 max-w-sm border-l border-border',
					bottom:
						'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 max-h-[90svh] w-full rounded-t-xl border-t border-border',
				},
			},
			defaultVariants: {
				// Bottom drawer is the mobile-first default.
				side: 'bottom',
			},
		},
		{ twMergeConfig },
	);

	export type SheetSide = VariantProps<typeof sheetVariants>['side'];
</script>

<script lang="ts">
	import { Dialog as SheetPrimitive } from 'bits-ui';
	import XIcon from '@lucide/svelte/icons/x';
	import type { Snippet } from 'svelte';
	import SheetOverlay from './sheet-overlay.svelte';
	import { cssSize, validateDetents, type SheetDetent } from './detents.js';
	import { sheetDrag } from './drag.js';
	import {
		cn,
		type WithoutChildren,
		type WithoutChildrenOrChild,
	} from '../../cn/index.js';

	export type SheetContentProps = WithoutChildrenOrChild<SheetPrimitive.ContentProps> & {
		modal?: boolean;
		detent?: string;
		ondetentchange?: (id: string) => void;
		portalProps?: WithoutChildren<SheetPrimitive.PortalProps>;
		children: Snippet;
	} & (
		| { detents: readonly SheetDetent[]; handleLabel: string; side?: 'bottom' }
		| { detents?: undefined; handleLabel?: never; side?: SheetSide }
	) & (
		| { showCloseButton?: boolean; closeLabel: string }
		| { showCloseButton: false; closeLabel?: string }
	);

	let {
		ref = $bindable(null),
		class: className,
		side = 'bottom',
		modal = true,
		detents,
		detent = $bindable(),
		ondetentchange,
		handleLabel,
		portalProps,
		showCloseButton = true,
		closeLabel,
		children,
		...restProps
	}: SheetContentProps = $props();
	let dragHeight = $state<number>();
	let dismiss: HTMLButtonElement | null = $state(null);
	const index = $derived(Math.max(0, detents?.findIndex(d => d.id === detent) ?? 0));
	const active = $derived(detents?.[index]);
	$effect(() => {
		if (!detents) return;
		if (side !== 'bottom') throw new Error('Sheet detents require side="bottom"');
		validateDetents(detents, window.innerHeight);
		if (!detents.some(d => d.id === detent)) detent = detents[0].id;
	});
	function change(next: number) {
		const id = detents?.[next]?.id;
		if (id === undefined || id === detent) return;
		detent = id;
		ondetentchange?.(id);
	}
	function handleKey(e: KeyboardEvent) {
		if (!detents) return;
		let next: number;
		switch (e.key) {
			case 'ArrowUp': case 'ArrowRight': case 'PageUp': next = Math.min(index + 1, detents.length - 1); break;
			case 'ArrowDown': case 'ArrowLeft': case 'PageDown': next = Math.max(index - 1, 0); break;
			case 'Home': next = 0; break;
			case 'End': next = detents.length - 1; break;
			case 'Enter': case ' ': next = (index + 1) % detents.length; break;
			default: return;
		}
		e.preventDefault();
		change(next);
	}
	function nonModalKey(e: KeyboardEvent & { currentTarget: EventTarget & HTMLDivElement }) {
		restProps.onkeydowncapture?.(e);
		if (e.defaultPrevented) return;
		restProps.onkeydown?.(e);
		if (e.key === 'Tab') e.stopImmediatePropagation();
		if (e.defaultPrevented || e.key !== 'Escape' || restProps.escapeKeydownBehavior !== undefined) return;
		restProps.onEscapeKeydown?.(e);
		if (!e.defaultPrevented) { e.stopPropagation(); dismiss?.click(); }
	}
</script>

{#snippet body()}
	{#if detents && active}
		<div data-sheet-handle role="slider" tabindex="0" aria-label={handleLabel}
			aria-orientation="vertical" aria-valuemin={0} aria-valuemax={detents.length - 1}
			aria-valuenow={index} aria-valuetext={active.label}
			class="flex h-11 w-full shrink-0 items-center justify-center focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
			onkeydown={handleKey} onclick={() => change((index + 1) % detents.length)}>
			<span class="bg-border-strong rounded-pill h-1 w-9" aria-hidden="true"></span>
		</div>
	{/if}
	{@render children?.()}
	{#if !modal}<SheetPrimitive.Close bind:ref={dismiss} hidden tabindex={-1} aria-hidden="true" />{/if}
	{#if showCloseButton}
		<SheetPrimitive.Close class="ring-offset-background focus-visible:ring-ring text-muted-foreground hover:text-foreground absolute top-0.5 right-0.5 inline-flex size-11 items-center justify-center rounded-sm opacity-80 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:outline-none disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
			<XIcon aria-hidden="true" /><span class="sr-only">{closeLabel}</span>
		</SheetPrimitive.Close>
	{/if}
{/snippet}

<SheetPrimitive.Portal {...portalProps}>
	{#if modal}<SheetOverlay />{/if}
	<SheetPrimitive.Content
		bind:ref
		data-slot="sheet-content"
		style="z-index: calc(var(--z-index-sheet) + 1);"
		class={cn(sheetVariants({ side }), showCloseButton && '[&_[data-slot=sheet-header]]:pr-12', className)}
		{...(!modal ? { trapFocus: false, preventScroll: false, interactOutsideBehavior: 'ignore' as const, escapeKeydownBehavior: 'ignore' as const } : {})}
		{...restProps}
	>
		{#snippet child({ props })}
			{#if detents}
				<!-- Bits supplies aria-modal and a Tab loop after caller props; override on the element. -->
				<div {...props} aria-modal={modal ? 'true' : 'false'}
					onkeydown={modal ? restProps.onkeydown : undefined}
					onkeydowncapture={!modal ? nonModalKey : restProps.onkeydowncapture}
					data-detent={active?.id} data-sheet-detents={detents ? '' : undefined}
					class={cn(sheetVariants({ side }), showCloseButton && '[&_[data-slot=sheet-header]]:pr-12', detents && 'max-h-none gap-0 overflow-hidden', className)}
					style:height={active ? dragHeight === undefined ? cssSize(active.size) : `${dragHeight}px` : undefined}
					style:touch-action={detents ? 'none' : undefined}
					style:transition-property={detents ? 'height' : undefined}
					style:transition-duration={detents ? dragHeight === undefined ? 'var(--duration-normal)' : '0s' : undefined}
					style:transition-timing-function={detents ? 'var(--ease-out)' : undefined}
					use:sheetDrag={() => ({ detents: detents ?? [], change, height: value => dragHeight = value })}>
					{@render body()}
				</div>
			{:else if !modal}
				<div {...props} aria-modal="false" onkeydown={undefined} onkeydowncapture={nonModalKey}>
					{@render body()}
				</div>
			{:else}
				<div {...props}>{@render body()}</div>
			{/if}
		{/snippet}
	</SheetPrimitive.Content>
</SheetPrimitive.Portal>

<style>
	@media (prefers-reduced-motion: reduce) {
		:global([data-sheet-detents]) { transition-duration: 0s !important; }
	}
</style>
