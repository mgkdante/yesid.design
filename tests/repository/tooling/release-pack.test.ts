import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { RELEASE_PACKAGES, packRelease } from '../../../tools/release-core.js';
import { runReleaseCommand } from '../../../tools/release.js';
import { createReleaseCheckout, TempCheckout } from './temp-checkout.js';

const checkouts: TempCheckout[] = [];
afterEach(() => { for (const checkout of checkouts.splice(0)) checkout.dispose(); });

function checkout(version = '1.2.3'): TempCheckout {
	const checkout = createReleaseCheckout(version);
	checkouts.push(checkout);
	checkout.write('LICENSE', 'Root license\n');
	checkout.write('NOTICE', 'Root notice\n');
	checkout.write('CHANGELOG.md', `# Changelog\n\n## ${version}\n\n<!-- release-fragment: packed -->\n`);
	for (const { name, directory } of RELEASE_PACKAGES) {
		checkout.write(`packages/${directory}/package.json`, JSON.stringify({
			name, version, private: true, files: ['src', 'NOTICE'],
			peerDependencies: name === '@yesid/ui' ? { '@yesid/tokens': 'workspace:*', svelte: '^5' } : {},
			devDependencies: name === '@yesid/tokens' ? { '@yesid/gates': 'workspace:*' } : {},
		}));
		checkout.write(`packages/${directory}/src/index.ts`, 'export const value = 1;\n');
	}
	return checkout;
}

function tarballFile(path: string, entry: string): string {
	const result = spawnSync('tar', ['-xOf', path, `package/${entry}`], { encoding: 'utf8' });
	if (result.status !== 0) throw new Error(result.stderr);
	return result.stdout;
}

describe('release packing', () => {
	it('runs the workflow packing command from its own revision against pre-refactor tagged source', () => {
		const tagged = checkout('0.32.2');
		const root = fileURLToPath(new URL('../../..', import.meta.url));
		// Frozen verbatim from v0.32.2:tools/release.ts. Keep this fixture independent of Git depth/tags in CI.
		const legacyCli = readFileSync(new URL('./fixtures/release-v0.32.2.ts.txt', import.meta.url), 'utf8');
		tagged.write('tools/release.ts', legacyCli);
		tagged.write('packages/ui/src/index.ts', 'export const source = "requested older tag";\n');
		const originalManifest = tagged.read('packages/ui/package.json');
		const runner = join(tagged.root, '.release-runner', 'tools');
		mkdirSync(runner, { recursive: true });
		for (const file of ['release.ts', 'release-core.ts']) cpSync(join(root, 'tools', file), join(runner, file));
		// The old CLI imports the same prepare/check exports, but cannot dispatch pack.
		cpSync(join(root, 'tools/release-core.ts'), join(tagged.root, 'tools/release-core.ts'));
		const legacy = spawnSync('bun', ['tools/release.ts', 'pack', '--tag', 'v0.32.2', '--repository', 'example/design'], {
			cwd: tagged.root, encoding: 'utf8',
		});
		expect(legacy.status).toBe(1);
		expect(legacy.stderr).toContain('usage: bun tools/release.ts <prepare|check>');

		const workflow = readFileSync(join(root, '.github/workflows/release.yml'), 'utf8');
		const command = workflow.match(/- name: Pack\r?\n\s+run: (.+)/u)?.[1];
		if (!command) throw new Error('release.yml must have one Pack command');
		const values: Record<string, string> = {
			GITHUB_WORKSPACE: tagged.root, TAG: 'v0.32.2', GITHUB_REPOSITORY: 'example/design',
		};
		const [program, ...args] = [...command.matchAll(/"([^"]*)"|(\S+)/gu)].map((match) =>
			(match[1] ?? match[2]!).replace(/\$(\w+)/gu, (_match, name: string) => values[name] ?? ''),
		);
		const packed = spawnSync(program!, args, { cwd: tagged.root, encoding: 'utf8' });
		expect(packed.status, packed.stderr).toBe(0);
		expect(packed.stdout).toContain(`Packed ${RELEASE_PACKAGES.length} packages for v0.32.2`);
		expect(workflow).toMatch(/ref: \$\{\{ github\.sha \}\}\s+path: \.release-runner/u);
		expect(readdirSync(join(tagged.root, 'dist'))).toHaveLength(RELEASE_PACKAGES.length);
		const ui = join(tagged.root, 'dist/yesid-ui-0.32.2.tgz');
		expect(tarballFile(ui, 'src/index.ts')).toBe('export const source = "requested older tag";\n');
		expect(JSON.parse(tarballFile(ui, 'package.json')).peerDependencies['@yesid/tokens']).toBe(
			'https://github.com/example/design/releases/download/v0.32.2/yesid-tokens-0.32.2.tgz',
		);
		expect(tagged.read('packages/ui/package.json')).toBe(originalManifest);
		expect(tagged.read('tools/release.ts')).toBe(legacyCli);
		expect(existsSync(join(tagged.root, '.release-runner/dist'))).toBe(false);
	}, 30_000);

	it('packs only the release inventory with exact sibling URLs and legal files, restoring checkout bytes', () => {
		const repo = checkout();
		repo.write('packages/ui/NOTICE', 'Existing package notice\n');
		repo.write('packages/private-experiment/package.json', '{"name":"private-experiment"}');
		const before = repo.read('packages/ui/package.json');
		const paths = packRelease(repo.root, { tag: 'v1.2.3', repository: 'example/design' });
		expect(paths).toHaveLength(RELEASE_PACKAGES.length);
		expect(readdirSync(join(repo.root, 'dist')).sort()).toEqual(
			RELEASE_PACKAGES.map(({ directory }) => `yesid-${directory}-1.2.3.tgz`).sort(),
		);
		const ui = join(repo.root, 'dist/yesid-ui-1.2.3.tgz');
		expect(JSON.parse(tarballFile(ui, 'package.json')).peerDependencies).toEqual({
			'@yesid/tokens': 'https://github.com/example/design/releases/download/v1.2.3/yesid-tokens-1.2.3.tgz',
			svelte: '^5',
		});
		const tokens = join(repo.root, 'dist/yesid-tokens-1.2.3.tgz');
		expect(JSON.parse(tarballFile(tokens, 'package.json')).devDependencies['@yesid/gates']).toBe(
			'https://github.com/example/design/releases/download/v1.2.3/yesid-gates-1.2.3.tgz',
		);
		expect(tarballFile(ui, 'LICENSE')).toBe('Root license\n');
		expect(tarballFile(ui, 'NOTICE')).toBe('Root notice\n');
		expect(repo.read('packages/ui/package.json')).toBe(before);
		expect(repo.read('packages/ui/NOTICE')).toBe('Existing package notice\n');
		expect(existsSync(join(repo.root, 'packages/ui/LICENSE'))).toBe(false);
	}, 30_000);

	it('restores checkout bytes and removes partial output if Bun packing fails', () => {
		const repo = checkout();
		const path = 'packages/ui/package.json';
		const manifest = JSON.parse(repo.read(path));
		manifest.scripts = { prepack: 'node -e "process.exit(1)"' };
		repo.write(path, JSON.stringify(manifest));
		const before = repo.read(path);
		expect(() => packRelease(repo.root, { tag: 'v1.2.3', repository: 'example/design' })).toThrow('Packing @yesid/ui failed');
		expect(repo.read(path)).toBe(before);
		for (const { directory } of RELEASE_PACKAGES) {
			expect(existsSync(join(repo.root, `packages/${directory}/LICENSE`))).toBe(false);
			expect(existsSync(join(repo.root, `packages/${directory}/NOTICE`))).toBe(false);
		}
		expect(existsSync(join(repo.root, 'dist'))).toBe(false);
	}, 30_000);

	it('rejects mismatched tags, unknown sibling peers, and existing output before changing files', () => {
		const repo = checkout();
		expect(() => packRelease(repo.root, { tag: 'v1.2.4', repository: 'example/design' })).toThrow('Prepared release version');
		const manifest = JSON.parse(repo.read('packages/ui/package.json'));
		manifest.peerDependencies['@yesid/unknown'] = 'workspace:*';
		repo.write('packages/ui/package.json', JSON.stringify(manifest));
		expect(() => packRelease(repo.root, { tag: 'v1.2.3', repository: 'example/design' })).toThrow('unknown');
		expect(existsSync(join(repo.root, 'dist'))).toBe(false);
		delete manifest.peerDependencies['@yesid/unknown'];
		repo.write('packages/ui/package.json', JSON.stringify(manifest));
		repo.write('dist/keep.txt', 'Existing output');
		expect(() => packRelease(repo.root, { tag: 'v1.2.3', repository: 'example/design' })).toThrow();
		expect(repo.read('dist/keep.txt')).toBe('Existing output');
	}, 30_000);

	it('exposes packing through the portable release command', () => {
		const repo = checkout();
		expect(runReleaseCommand(['pack', '--tag', 'v1.2.3', '--repository', 'example/design'], repo.root))
			.toBe(`Packed ${RELEASE_PACKAGES.length} packages for v1.2.3 into dist`);
	}, 30_000);
});
