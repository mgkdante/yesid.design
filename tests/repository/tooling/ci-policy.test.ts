import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { aggregatePasses, changedFiles, selectBrowser } from '../../../tools/ci-policy.js';

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

const repositories: string[] = [];
afterEach(() => {
	for (const root of repositories.splice(0)) rmSync(root, { recursive: true, force: true });
});

function repository() {
	const root = mkdtempSync(join(tmpdir(), 'ci-policy-'));
	repositories.push(root);
	const git = (...args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
	git('init', '-b', 'main');
	git('config', 'user.name', 'Test');
	git('config', 'user.email', 'test@example.com');
	git('config', 'commit.gpgsign', 'false');
	const commit = (files: Record<string, string>) => {
		for (const [path, content] of Object.entries(files)) writeFileSync(join(root, path), content);
		git('add', '-A');
		git('commit', '-m', 'test');
		return git('rev-parse', 'HEAD');
	};
	const initial = commit({ 'README.md': 'initial', 'app.ts': 'initial' });
	return { root, git, commit, initial };
}

// Real git process startup and commits can exceed the unit-test default on Windows.
describe('PR changes from real git history', { timeout: 30_000 }, () => {
	it('includes code changed identically on diverged branches', () => {
		const repo = repository();
		const base = repo.commit({ 'app.ts': 'shared change' });
		repo.git('checkout', '-b', 'pr', repo.initial);
		const head = repo.commit({ 'app.ts': 'shared change', 'README.md': 'docs' });
		const files = changedFiles(base, head, repo.root);
		expect(files.sort()).toEqual(['README.md', 'app.ts']);
		expect(selectBrowser('pull_request', () => files)).toBe(true);
	});
	it('excludes main-only code changes from a behind documentation PR', () => {
		const repo = repository();
		const base = repo.commit({ 'app.ts': 'main only' });
		repo.git('checkout', '-b', 'pr', repo.initial);
		const head = repo.commit({ 'README.md': 'docs' });
		const files = changedFiles(base, head, repo.root);
		expect(files).toEqual(['README.md']);
		expect(selectBrowser('pull_request', () => files)).toBe(false);
	});
	it('includes both paths of a rename', () => {
		const repo = repository();
		repo.git('mv', 'app.ts', 'DECISIONS.md');
		const head = repo.commit({});
		const files = changedFiles(repo.initial, head, repo.root);
		expect(files.sort()).toEqual(['DECISIONS.md', 'app.ts']);
		expect(selectBrowser('pull_request', () => files)).toBe(true);
	});
	it('includes deleted code', () => {
		const repo = repository();
		repo.git('rm', 'app.ts');
		const head = repo.commit({});
		expect(changedFiles(repo.initial, head, repo.root)).toEqual(['app.ts']);
		expect(selectBrowser('pull_request', () => changedFiles(repo.initial, head, repo.root))).toBe(true);
	});
	it('fails closed for a missing commit object', () => {
		const repo = repository();
		const read = () => changedFiles(repo.initial, '0'.repeat(40), repo.root);
		expect(read).toThrow();
		expect(selectBrowser('pull_request', read)).toBe(true);
	});
});
