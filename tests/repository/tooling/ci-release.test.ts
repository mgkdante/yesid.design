import { cpSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';
import { releaseOnly } from '../../../tools/ci-release.js';
import { prepareRelease } from '../../../tools/release-core.js';
import { createReleaseCheckout, type TempCheckout } from './temp-checkout.js';

const scratch: TempCheckout[] = [];
afterEach(() => { for (const repo of scratch.splice(0)) repo.dispose(); });
const source = fileURLToPath(new URL('../../..', import.meta.url));
function fixture(version = '0.6.0') {
	const repo = createReleaseCheckout(version);
	scratch.push(repo);
	const manifest = JSON.parse(repo.read('package.json'));
	manifest.dependencies = { example: '1.0.0' };
	manifest.scripts = { 'release:prepare': 'bun tools/release.ts prepare' };
	repo.write('package.json', JSON.stringify(manifest, null, 2) + '\n');
	repo.write('.bun-version', readFileSync(join(source, '.bun-version'), 'utf8'));
	repo.write('tools/placeholder', '');
	repo.write('packages/tokens/tokens.json', '{"token": 1}');
	repo.write('.github/workflows/ci.yml', 'name: fixture\n');
	for (const file of ['release.ts', 'release-core.ts']) cpSync(join(source, 'tools', file), join(repo.root, 'tools', file));
	repo.git('init', '-b', 'main');
	repo.git('config', 'core.autocrlf', 'false');
	repo.git('config', 'user.name', 'Test');
	repo.git('config', 'user.email', 'test@example.com');
	repo.git('config', 'commit.gpgsign', 'false');
	return repo;
}
function commit(repo: TempCheckout) {
	repo.git('add', '-A'); repo.git('commit', '-m', 'fixture'); return repo.git('rev-parse', 'HEAD');
}
function fragment(repo: TempCheckout, id: string) {
	repo.write(`.changes/${id}.md`, '---\n"@yesid/ui": minor\n---\n\nRelease change.\n');
}
function select(repo: TempCheckout, base: string, version: string, title = `chore(release): prepare v${version}`) {
	return releaseOnly('pull_request', title, base, repo.git('rev-parse', 'HEAD'), repo.root);
}

describe('release-only reproduction', { timeout: 60_000 }, () => {
	it('accepts a fragment release and excludes main-only changes using the merge base', () => {
		const repo = fixture(); fragment(repo, 'stable'); const base = commit(repo);
		prepareRelease(repo.root, '0.7.0'); const head = commit(repo);
		repo.git('checkout', '-b', 'advanced-main', base);
		repo.write('source.ts', 'main only'); const advanced = commit(repo);
		expect(releaseOnly('pull_request', 'chore(release): prepare v0.7.0', advanced, head, repo.root)).toBe('0.7.0');
	});
	it('accepts rc.1, fragment-backed rc.2 and fragment-free stable promotion', () => {
		const repo = fixture();
		for (const [version, id] of [['0.7.0-rc.1', 'first'], ['0.7.0-rc.2', 'fix'], ['0.7.0', undefined]] as const) {
			if (id) fragment(repo, id);
			const base = id ? commit(repo) : repo.git('rev-parse', 'HEAD');
			prepareRelease(repo.root, version); commit(repo);
			expect(select(repo, base, version, `chore(release): ${id ? 'prepare' : 'promote'} v${version}`)).toBe(version);
			if (id) expect(select(repo, base, version, `chore(release): promote v${version}`)).toBeUndefined();
		}
	});
	it.each(['packages/ui/src/extra.ts', 'package.json', 'packages/tokens/tokens.json', '.github/workflows/ci.yml', 'CHANGELOG.md', 'bun.lock', '.changes/extra.md'])('rejects extra edits to %s', (path) => {
		const repo = fixture(); fragment(repo, 'first'); const base = commit(repo);
		prepareRelease(repo.root, '0.7.0');
		if (path === 'package.json') {
			const manifest = JSON.parse(repo.read(path)); manifest.dependencies = { example: '9.9.9' };
			repo.write(path, JSON.stringify(manifest));
		} else repo.write(path, path === 'CHANGELOG.md' ? repo.read(path).replace('Release change.', 'Hand edited.') : 'extra change');
		commit(repo); expect(select(repo, base, '0.7.0')).toBeUndefined();
	});
	it('rejects prepare failure', () => {
		const repo = fixture(); const base = commit(repo);
		const manifest = JSON.parse(repo.read('package.json')); manifest.version = '0.7.0';
		repo.write('package.json', JSON.stringify(manifest)); commit(repo);
		expect(select(repo, base, '0.7.0')).toBeUndefined();
	});
	it('rejects nondeterministic prepare output', () => {
		const repo = fixture(); fragment(repo, 'random');
		repo.write('tools/release-core.ts', repo.read('tools/release-core.ts').replace('let nextLockfile = state.lockfile;', 'nextChangelog += crypto.randomUUID(); let nextLockfile = state.lockfile;'));
		const base = commit(repo);
		execFileSync('bun', ['run', 'release:prepare', '--', '--version', '0.7.0'], { cwd: repo.root }); commit(repo);
		expect(select(repo, base, '0.7.0')).toBeUndefined();
	});
	it('rejects a prepare that agrees once and differs on a second clean copy', () => {
		const repo = fixture(); fragment(repo, 'varying');
		repo.write('tools/release-core.ts', repo.read('tools/release-core.ts').replace('let nextLockfile = state.lockfile;', "if (process.cwd().endsWith('second')) nextChangelog += 'different'; let nextLockfile = state.lockfile;"));
		const base = commit(repo); prepareRelease(repo.root, '0.7.0'); commit(repo);
		expect(select(repo, base, '0.7.0')).toBeUndefined();
	});
	it('fails closed on missing objects, invalid titles, non-PR events and timeout', () => {
		const repo = fixture(); fragment(repo, 'first'); const base = commit(repo);
		prepareRelease(repo.root, '0.7.0'); const head = commit(repo);
		expect(select(repo, base, '0.7.0', 'Unrelated title')).toBeUndefined();
		for (const event of ['workflow_dispatch', 'merge_group', 'push', '']) expect(releaseOnly(event, 'chore(release): prepare v0.7.0', base, head, repo.root)).toBeUndefined();
		expect(select(repo, '0'.repeat(40), '0.7.0')).toBeUndefined();
		expect(releaseOnly('pull_request', 'chore(release): prepare v0.7.0', base, head, repo.root, 1)).toBeUndefined();
	});
});
