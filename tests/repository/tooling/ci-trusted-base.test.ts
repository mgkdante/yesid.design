import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { TempCheckout } from './temp-checkout.js';

const source = new URL('../../../', import.meta.url);
const workflow = readFileSync(new URL('.github/workflows/ci.yml', source), 'utf8').replaceAll('\r\n', '\n');
function script(name: string, job = 'classify') {
	const block = workflow.split(`  ${job}:`)[1]?.split(/\n  [\w-]+:/u)[0] ?? '';
	const step = block.split(`      - name: ${name}\n`)[1]?.split(/\n      - /u)[0] ?? '';
	const run = step.split('        run: |\n')[1];
	if (!run) throw new Error(`Missing workflow runner: ${name}`);
	return run.split('\n').map((line) => line.replace(/^          /u, '')).join('\n');
}
const repos: TempCheckout[] = [];
afterEach(() => { for (const repo of repos.splice(0)) repo.dispose(); });
function fixture() {
	const repo = new TempCheckout(); repos.push(repo);
	for (const path of ['tools/ci-policy.ts', 'tools/ci-release.ts', '.bun-version']) {
		repo.write(path, readFileSync(new URL(path, source), 'utf8'));
	}
	repo.write('package.json', '{"version":"1.0.0"}');
	repo.git('init', '-b', 'main');
	repo.git('config', 'core.autocrlf', 'false');
	repo.git('config', 'user.name', 'Test');
	repo.git('config', 'user.email', 'test@example.com');
	repo.git('config', 'commit.gpgsign', 'false');
	const commit = () => { repo.git('add', '-A'); repo.git('commit', '-m', 'fixture'); return repo.git('rev-parse', 'HEAD'); };
	const base = commit();
	repo.git('remote', 'add', 'origin', repo.root);
	repo.git('checkout', '-b', 'pr');
	return { repo, base, commit };
}
function run(repo: TempCheckout, input: string, env: Record<string, string>) {
	const bash = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash';
	return spawnSync(bash, ['--noprofile', '--norc', '-eo', 'pipefail'], {
		cwd: repo.root, input, encoding: 'utf8',
		env: { ...process.env, GITHUB_WORKSPACE: repo.root.replaceAll('\\', '/'), ...env },
	});
}
function materialize(repo: TempCheckout, base: string, job = 'classify', event = 'pull_request') {
	const scratch = new TempCheckout(); repos.push(scratch);
	const output = join(scratch.root, 'output').replaceAll('\\', '/');
	scratch.write('output', '');
	const result = run(repo, script('Materialize trusted policy', job), {
		BASE_SHA: base, GITHUB_EVENT_NAME: event, GITHUB_OUTPUT: output,
		RUNNER_TEMP: scratch.root.replaceAll('\\', '/'),
	});
	const outputs = Object.fromEntries(readFileSync(output, 'utf8').trim().split('\n').map((line) => line.split('=')));
	return { result, outputs, output };
}

describe('trusted workflow policy runner', { timeout: 30_000 }, () => {
	it.each(['entry', 'import'])('ignores a forged %s and checkout Bun preload config', (attack) => {
		const { repo, base, commit } = fixture();
		if (attack === 'entry') repo.write('tools/ci-policy.ts', `import { appendFileSync } from 'node:fs';
appendFileSync(process.env.GITHUB_OUTPUT!, 'browser=false\\nrelease-only=true\\nversion=1.0.0\\n');
console.log('FORGED'); process.exit(0);`);
		else repo.write('tools/ci-release.ts', 'export function releaseOnly() { console.log("FORGED"); return "1.0.0"; }');
		repo.write('bunfig.toml', 'preload = ["./evil.ts"]\n');
		repo.write('evil.ts', 'console.log("FORGED"); process.exit(0);');
		repo.write('.bun-version', '0.0.0');
		const head = commit();
		const { result, outputs, output } = materialize(repo, base);
		expect(result.status, result.stderr).toBe(0);
		expect(outputs['bun-version']).toBe(readFileSync(new URL('.bun-version', source), 'utf8').trim());
		const selected = run(repo, script('Select CI lane'), {
			TRUSTED_POLICY: outputs.directory!, BASE_SHA: base, HEAD_SHA: head,
			GITHUB_EVENT_NAME: 'pull_request', PR_TITLE: 'chore(release): prepare v1.0.0', GITHUB_OUTPUT: output,
		});
		expect(selected.status, selected.stderr).toBe(0);
		expect(selected.stdout + selected.stderr).not.toContain('FORGED');
		expect(readFileSync(output, 'utf8')).toContain('browser=true\nrelease-only=false\nversion=\n');
	});
	it('rejects a base commit not reachable from origin/main in both jobs', () => {
		const { repo, commit } = fixture();
		repo.write('untrusted', 'branch only'); const base = commit();
		for (const job of ['classify', 'ci']) {
			const { result } = materialize(repo, base, job);
			expect(result.status).not.toBe(0);
			expect(result.stderr).toContain('PR base is not reachable from origin/main');
		}
	});
	it('dispatch uses main policy even when the branch policy is forged', () => {
		const { repo, commit } = fixture();
		repo.write('tools/ci-policy.ts', 'throw new Error("FORGED");'); commit();
		const { result, outputs, output } = materialize(repo, '', 'classify', 'workflow_dispatch');
		expect(result.status, result.stderr).toBe(0);
		const selected = run(repo, script('Select CI lane'), {
			TRUSTED_POLICY: outputs.directory!, GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_OUTPUT: output,
		});
		expect(selected.status, selected.stderr).toBe(0);
		expect(readFileSync(output, 'utf8')).toContain('browser=true\nrelease-only=false');
	});
	it('runs the base aggregate successfully despite a forged checkout policy', () => {
		const { repo, base, commit } = fixture();
		repo.write('tools/ci-policy.ts', 'throw new Error("FORGED");'); commit();
		const { result, outputs } = materialize(repo, base, 'ci');
		expect(result.status, result.stderr).toBe(0);
		const needs = {
			classify: { result: 'success', outputs: { browser: 'true', 'release-only': 'false' } },
			check: { result: 'success' }, 'browser-authority': { result: 'success' },
			'token-outputs-windows': { result: 'success' }, 'token-byte-parity': { result: 'success' },
		};
		const aggregate = run(repo, script('Require selected jobs to succeed', 'ci'), {
			TRUSTED_POLICY: outputs.directory!, CI_NEEDS: JSON.stringify(needs),
		});
		expect(aggregate.status, aggregate.stderr).toBe(0);
		expect(aggregate.stdout + aggregate.stderr).not.toContain('FORGED');
	});
	it.each(['failure', 'cancelled'])('aggregate rejects an unknown need with %s', (result) => {
		const { repo, base } = fixture();
		const { outputs } = materialize(repo, base, 'ci');
		const needs = {
			classify: { result: 'success', outputs: { browser: 'true', 'release-only': 'false' } },
			check: { result: 'success' }, 'browser-authority': { result: 'success' },
			'token-outputs-windows': { result: 'success' }, 'token-byte-parity': { result: 'success' },
			extra: { result },
		};
		const aggregate = run(repo, script('Require selected jobs to succeed', 'ci'), {
			TRUSTED_POLICY: outputs.directory!, CI_NEEDS: JSON.stringify(needs),
		});
		expect(aggregate.status).not.toBe(0);
		expect(aggregate.stderr).toContain('A CI dependency failed or was cancelled');
	});
});
