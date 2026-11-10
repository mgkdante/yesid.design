import { describe, expect, it, vi } from 'vitest';
import { OG_HEIGHT, OG_PALETTE, OG_WIDTH, renderOgPng } from '../og.js';
import { ogFonts } from '../og-fonts.js';
import { readOgFonts } from '../og-files.js';
import { resolveShareCopy } from '../share-copy.js';
import * as satori from '../satori.js';

const card = { eyebrow: 'Blog', wordmark: 'yesid', title: 'A share card', handle: 'example.com', location: 'Montréal' };

const longDescription = 'A practical guide to building accessible interfaces for everyday readers. '
	+ 'Learn how careful content choices keep publishing workflows clear, useful and easier to maintain for teams and their readers.';

describe('share card', () => {
	it.each([
		longDescription,
		`${'WWW '.repeat(49)}WWW.`,
		`${'W'.repeat(199)}.`,
		('W'.repeat(34) + ' ').repeat(5) + 'W'.repeat(25),
		('W'.repeat(18) + ' ').repeat(10) + 'W'.repeat(10),
		`${'ÉlargissementÀÖÜ '.repeat(6)}https://example.com/${'W'.repeat(78)}`,
	])(
		'keeps long selected descriptions and the footer inside the padded image', async (description) => {
			const copy = resolveShareCopy({ locales: ['en'], candidates: [{ id: 'excerpt', text: { en: description } }] }).en!;
			if (copy.status !== 'selected') throw new Error('Expected usable content');
			const render = vi.spyOn(satori, 'renderSatoriPng');
			let call: (typeof render.mock.calls)[number];
			try {
				await renderOgPng({ ...card, title: copy }, readOgFonts(), () => new Uint8Array());
				call = render.mock.calls.at(-1)!;
			} finally {
				render.mockRestore();
			}
			const bounds: { text: string; top: number; bottom: number; left: number; right: number }[] = [];
			await satori.renderSatoriPng(call[0], {
				...call[1],
				onNodeDetected(node) {
					if (node.textContent) bounds.push({
						text: node.textContent, top: node.top, bottom: node.top + node.height,
						left: node.left, right: node.left + node.width,
					});
				},
			}, () => new Uint8Array());
			expect(bounds.some(({ text }) => text === copy.ogLine)).toBe(true);
			expect(bounds.some(({ text }) => text === card.handle)).toBe(true);
			expect(bounds.some(({ text }) => text === card.location)).toBe(true);
			expect(Math.min(...bounds.map(({ top }) => top))).toBeGreaterThanOrEqual(80);
			expect(Math.max(...bounds.map(({ bottom }) => bottom))).toBeLessThanOrEqual(OG_HEIGHT - 80);
			expect(Math.min(...bounds.map(({ left }) => left))).toBeGreaterThanOrEqual(80);
			expect(Math.max(...bounds.map(({ right }) => right))).toBeLessThanOrEqual(OG_WIDTH - 80);
		},
	);

	it('draws the complete content-derived OG line in place of the legacy title line', async () => {
		const text = 'A practical guide to building accessible interfaces for everyday readers.';
		const copy = resolveShareCopy({ locales: ['en'], candidates: [{ id: 'excerpt', text: { en: text } }] }).en!;
		if (copy.status !== 'selected') throw new Error('Expected usable content');
		const render = vi.spyOn(satori, 'renderSatoriPng');
		try {
			await renderOgPng({ ...card, title: copy }, readOgFonts(), () => new Uint8Array());
			// Satori embeds glyph outlines in SVG; inspect its actual input for the full text.
			const tree = JSON.stringify(render.mock.calls[0]![0]);
			expect(tree).toContain(JSON.stringify(copy.ogLine));
			expect(tree).not.toContain(JSON.stringify(card.title));
		} finally {
			render.mockRestore();
		}
	});

	it('hands the rasterizer a token-backed card with the grid behind its foreground', async () => {
		let svg = '';
		const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
		const result = await renderOgPng(card, readOgFonts(), (rendered) => {
			svg = rendered;
			return png;
		});
		expect(result).toBe(png);
		expect(svg).toContain(`width="${OG_WIDTH}"`);
		expect(svg).toContain(`height="${OG_HEIGHT}"`);
		expect(svg.toLowerCase()).toContain(OG_PALETTE.background.toLowerCase());
		const grid = [...svg.matchAll(/<rect\b[^>]*fill-opacity="0\.(?:04|07)"[^>]*\/>/gu)]
			.map(([rectangle]) => rectangle);
		expect(grid).toEqual(expect.arrayContaining([
			expect.stringContaining(`width="1" height="${OG_HEIGHT}"`),
			expect.stringContaining(`width="${OG_WIDTH}" height="1"`),
		]));
		expect(grid.every((rectangle) => rectangle.includes(`fill="${OG_PALETTE.accent}"`))).toBe(true);
		expect(svg.indexOf(grid.at(-1)!)).toBeLessThan(svg.indexOf('<path'));
	});

	it('loads the same fonts for request-time and build-time rendering', () => {
		const read = readOgFonts();
		expect(ogFonts.map(({ data, ...face }) => face)).toEqual(read.map(({ data, ...face }) => face));
		for (const [index, face] of read.entries()) {
			expect(face.data.byteLength).toBeGreaterThan(0);
			expect(Buffer.from(ogFonts[index]!.data).equals(Buffer.from(face.data))).toBe(true);
		}
	});
});
