import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
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
	// A bare file name: GNU tar reads a Windows drive path such as C:\... as a remote host.
	const result = spawnSync('tar', ['-xOf', basename(path), `package/${entry}`], { cwd: dirname(path), encoding: 'utf8' });
	if (result.status !== 0) throw new Error(result.stderr);
	return result.stdout;
}

function addTargetOnlyPackage(repo: TempCheckout, name = '@yesid/retired-widget'): void {
	const workspace = 'packages/historic-widget';
	repo.write(`${workspace}/package.json`, JSON.stringify({
		name, version: '1.2.3', private: true, files: ['src', 'NOTICE'],
	}));
	repo.write(`${workspace}/README.md`, '[contract](https://example.com/blob/v1.2.3/README.md)\n');
	repo.write(`${workspace}/src/index.ts`, 'export const historical = true;\n');
	const lock = JSON.parse(repo.read('bun.lock'));
	lock.workspaces[workspace] = { name, version: '1.2.3' };
	repo.write('bun.lock', JSON.stringify(lock, null, 2));
}

describe('release packing', () => {
	it('packs every sibling dependency at the canonical owner even when source URLs predate a transfer', () => {
		const repo = checkout();
		for (const { directory } of RELEASE_PACKAGES) {
			const path = `packages/${directory}/package.json`;
			const manifest = JSON.parse(repo.read(path));
			manifest.peerDependencies['@yesid/tokens'] =
				'https://github.com/mgkdante/yesid.design/releases/download/v1.2.2/yesid-tokens-1.2.2.tgz';
			repo.write(path, JSON.stringify(manifest));
		}
		const paths = packRelease(repo.root, { tag: 'v1.2.3', repository: 'yesid-dev/yesid.design' });
		for (const path of paths) {
			const packed = JSON.parse(tarballFile(path, 'package.json'));
			for (const section of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
				for (const [name, value] of Object.entries(packed[section] ?? {})) {
					if (!name.startsWith('@yesid/')) continue;
					expect(value).toBe(
						`https://github.com/yesid-dev/yesid.design/releases/download/v1.2.3/yesid-${name.slice('@yesid/'.length)}-1.2.3.tgz`,
					);
				}
			}
		}
	}, 30_000);

	it('allows releases from the canonical repository', () => {
		const workflow = readFileSync(new URL('../../../.github/workflows/release.yml', import.meta.url), 'utf8');
		expect(workflow).toContain("if: github.repository == 'yesid-dev/yesid.design'");
	});
	it('rehearses prepare, check and real packing through rc.1, rc.2 and stable without publishing', () => {
		const repo = checkout('1.2.3');
		const root = fileURLToPath(new URL('../../..', import.meta.url));
		// Keep the fixture's package contents small, but exercise the current sibling peer graph.
		for (const { directory } of RELEASE_PACKAGES) {
			const path = `packages/${directory}/package.json`;
			const current = JSON.parse(readFileSync(join(root, path), 'utf8'));
			const fixture = JSON.parse(repo.read(path));
			fixture.peerDependencies = current.peerDependencies ?? {};
			repo.write(path, `${JSON.stringify(fixture, null, 2)}\n`);
		}
		for (const [version, fragment] of [
			['1.3.0-rc.1', 'candidate'],
			['1.3.0-rc.2', 'candidate-fix'],
			['1.3.0', undefined],
		] as const) {
			if (fragment) {
				repo.write(`.changes/${fragment}.md`, `---\n"@yesid/ui": minor\n---\n\n${fragment}.\n`);
			}
			expect(runReleaseCommand(['prepare', '--version', version], repo.root))
				.toBe(`Release ${version} prepared`);
			expect(runReleaseCommand(['check', '--version', version, '--tag', `v${version}`], repo.root))
				.toBe(`Release ${version} is prepared for v${version}`);
			const paths = ['package.json', 'bun.lock', 'CHANGELOG.md', ...RELEASE_PACKAGES.flatMap(({ directory }) => [
				`packages/${directory}/package.json`, `packages/${directory}/README.md`,
			])];
			const before = paths.map((path) => repo.read(path));
			expect(runReleaseCommand(['pack', '--tag', `v${version}`, '--repository', 'example/design'], repo.root))
				.toBe(`Packed ${RELEASE_PACKAGES.length} packages for v${version} into dist`);
			expect(readdirSync(join(repo.root, 'dist')).sort()).toEqual(
				RELEASE_PACKAGES.map(({ directory }) => `yesid-${directory}-${version}.tgz`).sort(),
			);
			for (const { directory } of RELEASE_PACKAGES) {
				const asset = join(repo.root, `dist/yesid-${directory}-${version}.tgz`);
				const packed = JSON.parse(tarballFile(asset, 'package.json'));
				const source = JSON.parse(repo.read(`packages/${directory}/package.json`));
				expect(packed.version).toBe(version);
				expect(packed.peerDependencies).toEqual(Object.fromEntries(
					Object.entries(source.peerDependencies).map(([name, range]) => [name,
						name.startsWith('@yesid/')
							? `https://github.com/example/design/releases/download/v${version}/yesid-${name.slice('@yesid/'.length)}-${version}.tgz`
							: range,
					]),
				));
				expect(tarballFile(asset, 'src/index.ts')).toBe('export const value = 1;\n');
			}
			expect(paths.map((path) => repo.read(path))).toEqual(before);
			expect(JSON.parse(repo.read('apps/gallery/package.json')).version).toBe('0.1.0');
			rmSync(join(repo.root, 'dist'), { recursive: true });
		}
		const changelog = repo.read('CHANGELOG.md');
		expect(changelog).toContain('## 1.3.0\n');
		expect(changelog).not.toContain('## 1.3.0-rc.2\n');
		for (const id of ['candidate', 'candidate-fix']) {
			expect(changelog.match(new RegExp(`<!-- release-fragment: ${id} -->`, 'gu'))).toHaveLength(1);
		}
	}, 30_000);

	it('recovers a target predating a package added to the runner inventory', () => {
		const target = checkout();
		rmSync(join(target.root, 'packages/analytics'), { recursive: true });
		const lock = JSON.parse(target.read('bun.lock'));
		delete lock.workspaces['packages/analytics'];
		target.write('bun.lock', JSON.stringify(lock, null, 2));
		const paths = packRelease(target.root, { tag: 'v1.2.3', repository: 'example/design' });
		expect(paths).toHaveLength(RELEASE_PACKAGES.length - 1);
		expect(readdirSync(join(target.root, 'dist')).sort()).toEqual(
			RELEASE_PACKAGES.filter(({ name }) => name !== '@yesid/analytics')
				.map(({ directory }) => `yesid-${directory}-1.2.3.tgz`).sort(),
		);
	}, 30_000);

	it('includes a target package removed from the runner inventory instead of accepting an incomplete set', () => {
		const target = checkout();
		addTargetOnlyPackage(target);
		const paths = packRelease(target.root, { tag: 'v1.2.3', repository: 'example/design' });
		expect(paths).toHaveLength(RELEASE_PACKAGES.length + 1);
		expect(readdirSync(join(target.root, 'dist')).sort()).toEqual([
			...RELEASE_PACKAGES.map(({ directory }) => `yesid-${directory}-1.2.3.tgz`),
			'yesid-retired-widget-1.2.3.tgz',
		].sort());
		expect(tarballFile(join(target.root, 'dist/yesid-retired-widget-1.2.3.tgz'), 'src/index.ts'))
			.toBe('export const historical = true;\n');
	}, 30_000);

	it.each(['retired-widget', 'retired.widget_2'])('rewrites target-only sibling %s using its manifest name rather than directory name', (suffix) => {
		const target = checkout();
		const name = `@yesid/${suffix}`;
		addTargetOnlyPackage(target, name);
		const ui = JSON.parse(target.read('packages/ui/package.json'));
		ui.peerDependencies[name] = 'workspace:*';
		target.write('packages/ui/package.json', JSON.stringify(ui));
		packRelease(target.root, { tag: 'v1.2.3', repository: 'example/design' });
		const manifest = JSON.parse(tarballFile(join(target.root, 'dist/yesid-ui-1.2.3.tgz'), 'package.json'));
		expect(manifest.peerDependencies[name]).toBe(
			`https://github.com/example/design/releases/download/v1.2.3/yesid-${suffix}-1.2.3.tgz`,
		);
	}, 30_000);

	it('validates the version of target-only packages before creating output', () => {
		const target = checkout();
		addTargetOnlyPackage(target);
		const manifest = JSON.parse(target.read('packages/historic-widget/package.json'));
		manifest.version = '1.2.4';
		target.write('packages/historic-widget/package.json', JSON.stringify(manifest));
		expect(() => packRelease(target.root, { tag: 'v1.2.3', repository: 'example/design' }))
			.toThrow('Lockstep version drift: packages/historic-widget/package.json is 1.2.4; expected 1.2.3');
		expect(existsSync(join(target.root, 'dist'))).toBe(false);
	}, 30_000);

	it('reads target workspace JSONC without confusing comments or quoted URLs with structure', () => {
		const target = checkout();
		const lock = JSON.parse(target.read('bun.lock'));
		lock.workspaces['packages/ui'].dependencies = { example: 'https://example.test/a,}/*literal*/' };
		target.write('bun.lock', JSON.stringify(lock, null, 2)
			.replace('"workspaces": {', '"workspaces": { /* closing brace in comment: } */')
			.replace(/\}\n\}$/u, '},\n}'));
		expect(packRelease(target.root, { tag: 'v1.2.3', repository: 'example/design' }))
			.toHaveLength(RELEASE_PACKAGES.length);
	}, 30_000);

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
