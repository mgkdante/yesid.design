<script lang="ts" module>
	import { cn, twMergeConfig, type WithElementRef } from '../../cn/index.js';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
	import { type VariantProps, tv } from 'tailwind-variants';

	// tv() runs its own tailwind-merge before cn() ever sees the classes — feed
	// it the same @theme vocabulary (via { twMergeConfig }) so brand font-size
	// utilities (text-body, text-small, ...) survive next to real color classes
	// and dataviz color names aren't misread as font-sizes.
	//
	// `conversion` is the yellow "talk to us" signage action: at most one per view, never data.
	export const buttonVariants = tv(
		{
			base: "focus-visible:border-ring focus-visible:ring-ring/50 rounded-lg border border-transparent bg-clip-padding text-sm font-medium focus-visible:ring-3 active:not-aria-[haspopup]:translate-y-px [&_svg:not([class*='size-'])]:size-4 group/button inline-flex shrink-0 items-center justify-center whitespace-nowrap transition-all outline-none select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
			variants: {
				variant: {
					default:
						'bg-primary text-primary-foreground hover:bg-primary-hover [a]:hover:bg-primary/80',
					conversion: 'bg-accent text-signage-bg hover:bg-accent-hover [a]:hover:bg-accent-hover',
					outline:
						'border-border-subtle bg-transparent text-foreground hover:border-primary hover:text-primary aria-expanded:border-primary aria-expanded:text-primary',
					ghost:
						'hover:bg-muted hover:text-foreground dark:hover:bg-muted/50 aria-expanded:bg-muted aria-expanded:text-foreground',
				},
				size: {
					default:
						'h-8 gap-1.5 px-2.5',
					sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] [&_svg:not([class*='size-'])]:size-3.5",
					'icon-tap': 'size-11',
					'cta-sm': 'gap-2 px-5 py-2.5 text-small font-semibold',
					cta: 'gap-2 px-6 py-3 text-body font-semibold',
					'cta-lg': 'gap-2 px-8 py-4 text-subheading font-semibold',
				},
			},
			compoundVariants: [
				{
					variant: 'default',
					size: ['cta-sm', 'cta', 'cta-lg'],
					class: 'hover:-translate-y-px hover:shadow-glow-sm',
				},
				{
					variant: 'conversion',
					size: ['cta-sm', 'cta', 'cta-lg'],
					class:
						'hover:-translate-y-px hover:shadow-[0_0_6px_color-mix(in_srgb,var(--accent)_35%,transparent)]',
				},
			],
			defaultVariants: {
				variant: 'default',
				size: 'default',
			},
		},
		{ twMergeConfig },
	);

	export type ButtonVariant = VariantProps<typeof buttonVariants>['variant'];
	export type ButtonSize = VariantProps<typeof buttonVariants>['size'];

	type ButtonOwnProps = {
		variant?: ButtonVariant;
		size?: ButtonSize;
	};
	type ForbidProps<Keys extends PropertyKey> = { [Key in Keys]?: never };
	type AnchorOnlyProps = Exclude<keyof HTMLAnchorAttributes, keyof HTMLButtonAttributes>;
	type ButtonOnlyProps = Exclude<keyof HTMLButtonAttributes, keyof HTMLAnchorAttributes>;

	type ButtonElementProps =
		| (WithElementRef<HTMLButtonAttributes, HTMLButtonElement> &
				ForbidProps<Exclude<AnchorOnlyProps, 'href'>> & {
				href?: null | undefined;
		  })
		| (WithElementRef<HTMLAnchorAttributes, HTMLAnchorElement> &
				ForbidProps<Exclude<ButtonOnlyProps, 'disabled'>> & {
				href: string;
				disabled?: boolean;
		  });

	export type ButtonProps = ButtonOwnProps & ButtonElementProps;
</script>

<script lang="ts">
	// pressBounce is touch-only; pointer presses use the base active:translate-y-px, so no
	// .tap-press here (it would double the press).
	import { pressBounce } from '@yesid/motion';

	let {
		class: className,
		variant = 'default',
		size = 'default',
		ref = $bindable(null),
		...elementProps
	}: ButtonProps = $props();
</script>

{#if elementProps.href != null}
	{@const { href, disabled, children, ...anchorProps } = elementProps}
	<a
		data-slot="button"
		{...anchorProps}
		bind:this={ref}
		class={cn(buttonVariants({ variant, size }), className)}
		href={disabled ? undefined : href}
		aria-disabled={disabled || undefined}
		role={disabled ? 'link' : undefined}
		tabindex={disabled ? -1 : undefined}
		use:pressBounce
	>
		{@render children?.()}
	</a>
{:else}
	{@const { href: _href, type = 'button', disabled, children, ...buttonProps } = elementProps}
	<button
		data-slot="button"
		{...buttonProps}
		bind:this={ref}
		class={cn(buttonVariants({ variant, size }), className)}
		{type}
		{disabled}
		use:pressBounce
	>
		{@render children?.()}
	</button>
{/if}
