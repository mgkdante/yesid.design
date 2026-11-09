import { describe, expect, it } from 'vitest';
import { aggregatePasses, selectBrowser } from '../../../tools/ci-policy.js';

describe('browser selection', () => {
	it('skips documentation-only changes', () => {
		expect(selectBrowser('pull_request', () => ['README.md', 'CONTRIBUTING.md', 'DECISIONS.md'])).toBe(false);
	});
	it.each(['apps/gallery/src/app.html', 'DESIGN.md', 'CHANGELOG.md', '.changes/fix.md',
		'packages/ui/README.md', 'api-reports/ui.api.md', '.github/workflows/ci.yml',
		'bun.lock', 'unknown.md', 'tools/ci-policy.ts', 'tests/new.test.ts', 'package.json'])('runs for %s', (path) => {
		expect(selectBrowser('pull_request', () => ['README.md', path])).toBe(true);
	});
	it('runs on an empty diff', () => expect(selectBrowser('pull_request', () => [])).toBe(true));
	it('runs on errors including git failures', () => {
		expect(selectBrowser('pull_request', () => { throw new Error('git failed'); })).toBe(true);
	});
	it('dispatch runs everything without reading the diff', () => {
		expect(selectBrowser('workflow_dispatch', () => { throw new Error('must not read'); })).toBe(true);
	});
});

function results(browser = 'true') {
	return {
		classify: { result: 'success', outputs: { browser } },
		check: { result: 'success' },
		'browser-authority': { result: browser === 'false' ? 'skipped' : 'success' },
		'token-outputs-windows': { result: 'success' },
		'token-byte-parity': { result: 'success' },
	};
}

describe('required aggregate', () => {
	it('passes when all jobs succeed', () => expect(aggregatePasses(results())).toBe(true));
	it('passes a selected browser skip', () => expect(aggregatePasses(results('false'))).toBe(true));
	for (const selection of ['true', 'false']) {
		for (const job of Object.keys(results())) {
			const rejected = selection === 'false' && job === 'browser-authority'
				? ['failure', 'cancelled'] : ['failure', 'cancelled', 'skipped'];
			it.each(rejected)(`${selection}: rejects ${job} %s`, (result) => {
				expect(aggregatePasses({ ...results(selection), [job]: { result } })).toBe(false);
			});
		}
	}
	it('rejects missing jobs and invalid selection', () => {
		expect(aggregatePasses({})).toBe(false);
		expect(aggregatePasses(results(''))).toBe(false);
	});
});
