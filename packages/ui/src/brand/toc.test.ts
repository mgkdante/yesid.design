import { expect, it } from 'vitest';
import * as toc from './toc.js';
import type { TocEntry } from './toc.js';
const entry = (id: string, children: TocEntry[] = [], badge?: TocEntry['badge']): TocEntry => ({ id, title: id, level: 2, badge, children });

it('resolveTocCounter follows badge numbers for a flat numbered run and counts positions otherwise', () => {
	const run = [entry('a', [], { kind: 'number', value: 2 }), entry('b', [], { kind: 'number', value: 8 })];
	expect(toc.resolveTocCounter(run, 'a')).toEqual({ current: 2, total: 8 });
	expect(toc.resolveTocCounter(run, 'unknown')).toEqual({ current: 2, total: 8 });

	const mixed = [entry('a', [], { kind: 'icon', name: 'eye' }), entry('b', [], { kind: 'number', value: 4 })];
	expect(toc.resolveTocCounter(mixed, 'b')).toEqual({ current: 2, total: 2 });
	expect(toc.resolveTocCounter([entry('a', [entry('a1')]), entry('b')], 'b')).toEqual({ current: 3, total: 3 });
});
