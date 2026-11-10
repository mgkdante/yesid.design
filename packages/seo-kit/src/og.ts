import tokens from '@yesid/tokens/tokens.json';
import { renderSatoriPng, type SvgRasterizer } from './satori.js';
import type { ShareCopySelection } from './share-copy.js';

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;
/** Selected card text never shrinks below this size; unfit input rejects without clipping. */
export const OG_LINE_MIN_FONT_SIZE = 24;

const dark = tokens.color.dark;

/** Cards always sit on the dark board. */
export const OG_PALETTE = {
	background: dark.background.$value,
	foreground: dark.foreground.$value,
	muted: dark['muted-foreground'].$value,
	accent: dark.primary.$value,
	accentText: dark['accent-text'].$value,
} as const;

export interface OgFont {
	name: 'Inter' | 'JetBrains Mono';
	data: ArrayBuffer;
	weight: 500 | 900;
	style: 'normal';
}

export interface OgCardInput {
	/** Mono overline, set in capitals. */
	eyebrow: string;
	/** The product name; the card adds the accent dot. */
	wordmark: string;
	/** Legacy title line, or content selected by `resolveShareCopy`. */
	title: string | ShareCopySelection;
	/** Bottom left, usually the host. */
	handle: string;
	/** Bottom right, usually the city. */
	location: string;
}

function el(type: string, style: Record<string, unknown>, children?: unknown) {
	return { type, props: { style, children } };
}

const mono = {
	fontFamily: 'JetBrains Mono',
	fontSize: '18px',
	fontWeight: 500,
	letterSpacing: '0.12em',
	textTransform: 'uppercase',
};

/** Centered 1px grid strips stay out of the content's flex layout. */
function grid() {
	const lines = [];
	for (let x = 40; x < OG_WIDTH; x += 40) {
		lines.push(el('div', {
			position: 'absolute', left: x - 0.5, top: 0, width: 1, height: OG_HEIGHT,
			backgroundColor: OG_PALETTE.accent, opacity: x % 200 === 0 ? 0.07 : 0.04,
		}));
	}
	for (let y = 40; y < OG_HEIGHT; y += 40) {
		lines.push(el('div', {
			position: 'absolute', left: 0, top: y - 0.5, width: OG_WIDTH, height: 1,
			backgroundColor: OG_PALETTE.accent, opacity: y % 200 === 0 ? 0.07 : 0.04,
		}));
	}
	return lines;
}

function ogCard({ eyebrow, wordmark, title, handle, location }: OgCardInput, descriptionSize = 32) {
	return el(
		'div',
		{
			position: 'relative',
			width: `${OG_WIDTH}px`,
			height: `${OG_HEIGHT}px`,
			display: 'flex',
			flexDirection: 'column',
			justifyContent: 'space-between',
			padding: '80px',
			backgroundColor: OG_PALETTE.background,
			color: OG_PALETTE.foreground,
			fontFamily: 'Inter',
		},
		[
			...grid(),
			el('div', { ...mono, color: OG_PALETTE.accent }, eyebrow),
			el('div', { display: 'flex', flexDirection: 'column', gap: '24px' }, [
				el(
					'div',
					{
						display: 'flex',
						alignItems: 'baseline',
						fontWeight: 900,
						fontSize: typeof title === 'string' ? '180px' : '120px',
						letterSpacing: '-0.04em',
						lineHeight: 1,
					},
					[el('span', {}, wordmark), el('span', { color: OG_PALETTE.accent }, '.')],
				),
				el(
					'div',
					{
						fontWeight: 500,
						fontSize: typeof title === 'string' ? '48px' : `${descriptionSize}px`,
						...(typeof title === 'string' ? {} : { wordBreak: 'break-word' }),
						letterSpacing: '-0.01em',
						lineHeight: 1.15,
						maxWidth: '1040px',
						color: OG_PALETTE.muted,
					},
					typeof title === 'string' ? title : title.ogLine,
				),
			]),
			el(
				'div',
				{
					...mono,
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'flex-end',
					color: OG_PALETTE.muted,
				},
				[
					el('div', { display: 'flex', flexDirection: 'column', gap: '16px' }, [
						el('div', { width: '120px', height: '3px', backgroundColor: OG_PALETTE.accent }, ''),
						el('span', {}, handle),
					]),
					el('span', {}, location),
				],
			),
		],
	);
}

function renderSelectedOgPng<Bytes extends Uint8Array>(
	card: OgCardInput & { title: ShareCopySelection },
	fonts: readonly OgFont[],
	rasterize: SvgRasterizer<Bytes>,
	fontSize = 32,
): Promise<Bytes> {
	let fits = true;
	let measuredLine = false;
	return renderSatoriPng(ogCard(card, fontSize), {
		width: OG_WIDTH, height: OG_HEIGHT, fonts: [...fonts],
		onNodeDetected(node) {
			if (!node.textContent) return;
			fits &&= node.top >= 80 && node.top + node.height <= OG_HEIGHT - 80
				&& node.left >= 80 && node.left + node.width <= OG_WIDTH - 80;
			if (node.textContent !== card.title.ogLine) return;
			measuredLine = true;
			// Reserve room for the eyebrow, 120px wordmark, 24px gap and footer
			// within the 470px padded height. Measure wrapping with the actual fonts.
			fits &&= node.height <= 240 && node.width <= 1040;
		},
	}, (svg) => {
		if (fits && measuredLine) return rasterize(svg);
		if (fontSize === OG_LINE_MIN_FONT_SIZE) throw new RangeError('Share line cannot fit inside the OG card at the minimum legible size');
		return renderSelectedOgPng(card, fonts, rasterize, Math.max(OG_LINE_MIN_FONT_SIZE, fontSize - 2));
	});
}

/** Renders the yesid share card; the consumer rasterizes Satori's SVG (resvg, for example). */
export function renderOgPng<Bytes extends Uint8Array = Uint8Array>(
	card: OgCardInput,
	fonts: readonly OgFont[],
	rasterize: SvgRasterizer<Bytes>,
): Promise<Bytes> {
	if (typeof card.title !== 'string') {
		return renderSelectedOgPng({ ...card, title: card.title }, fonts, rasterize);
	}
	return renderSatoriPng(ogCard(card), { width: OG_WIDTH, height: OG_HEIGHT, fonts: [...fonts] }, rasterize);
}
