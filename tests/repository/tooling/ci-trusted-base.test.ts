import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { TempCheckout } from './temp-checkout.js';

const source = new URL('../../../', import.meta.url);
const workflow = readFileSync(new URL('.github/workflows/ci.yml', source), 'utf8').replaceAll('\r\n', '\n');
const secretWorkflow = readFileSync(new URL('.github/workflows/secret-scan.yml', source), 'utf8').replaceAll('\r\n', '\n');
function script(name: string, job = 'classify', yaml = workflow) {
	const block = yaml.split(`  ${job}:`)[1]?.split(/\n  [\w-]+:/u)[0] ?? '';
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
		BASE_SHA: base, HEAD_SHA: repo.git('rev-parse', 'HEAD'), GITHUB_EVENT_NAME: event, GITHUB_OUTPUT: output,
		RUNNER_TEMP: scratch.root.replaceAll('\\', '/'),
	});
	const outputs = Object.fromEntries(readFileSync(output, 'utf8').trim().split('\n').map((line) => line.split('=')));
	return { result, outputs, output };
}

describe('trusted workflow policy runner', { timeout: 30_000 }, () => {
	it.each(['classify', 'ci'])('merge group rejects an unreadable base in %s', (job) => {
		const { repo, commit } = fixture();
		repo.write('untrusted', 'branch only'); commit();
		for (const base of ['', '0'.repeat(40)]) {
			const { result } = materialize(repo, base, job, 'merge_group');
			expect(result.status).not.toBe(0);
		}
	});
	it.each(['classify', 'ci'])('non-first merge group bootstraps main policy in %s', (job) => {
		const { repo, base: main, commit } = fixture();
		const trusted = repo.read('tools/ci-policy.ts');
		repo.write('tools/ci-policy.ts', 'throw new Error("UNTRUSTED_QUEUE_POLICY");');
		repo.write('tools/ci-release.ts', 'throw new Error("UNTRUSTED_QUEUE_IMPORT");');
		repo.write('.bun-version', '0.0.0');
		const previousGroup = commit();
		repo.write('queued-entry', 'second group'); const head = commit();
		expect(repo.git('rev-parse', 'main')).toBe(main);
		const { result, outputs, output } = materialize(repo, previousGroup, job, 'merge_group');
		expect(result.status, result.stderr).toBe(0);
		expect(readFileSync(join(outputs.directory!, 'tools/ci-policy.ts'), 'utf8')).toBe(trusted);
		expect(outputs['bun-version']).toBe(readFileSync(new URL('.bun-version', source), 'utf8').trim());
		const selected = run(repo, script('Select CI lane'), {
			TRUSTED_POLICY: outputs.directory!, BASE_SHA: previousGroup, HEAD_SHA: head,
			GITHUB_EVENT_NAME: 'merge_group', PR_TITLE: 'chore(release): prepare v1.0.0', GITHUB_OUTPUT: output,
		});
		expect(selected.status, selected.stderr).toBe(0);
		expect(readFileSync(output, 'utf8')).toContain('browser=true\nrelease-only=false\nversion=\n');
		if (job === 'ci') {
			const needs = {
				classify: { result: 'success', outputs: { browser: 'true', 'release-only': 'false' } },
				check: { result: 'success' }, 'browser-authority': { result: 'success' },
				'token-outputs-windows': { result: 'success' }, 'token-byte-parity': { result: 'success' },
			};
			const aggregate = run(repo, script('Require selected jobs to succeed', 'ci'), {
				TRUSTED_POLICY: outputs.directory!, CI_NEEDS: JSON.stringify(needs),
			});
			expect(aggregate.status, aggregate.stderr).toBe(0);
		}
	});
	it.each(['classify', 'ci'])('merge group rejects a base outside its queued ancestry in %s', (job) => {
		const { repo, commit } = fixture();
		repo.write('previous-entry', 'other temporary group'); const previousGroup = commit();
		repo.git('checkout', '-b', 'other-group', 'main');
		repo.write('queued-entry', 'unrelated group'); commit();
		expect(materialize(repo, previousGroup, job, 'merge_group').result.status).not.toBe(0);
	});
	it.each(['classify', 'ci'])('merge group rejects fallback policy outside queued ancestry in %s', (job) => {
		const { repo, commit } = fixture();
		repo.write('previous-entry', 'temporary group'); const previousGroup = commit();
		repo.git('checkout', 'main');
		repo.write('new-main', 'not part of this stale group'); commit();
		repo.git('checkout', 'pr');
		expect(materialize(repo, previousGroup, job, 'merge_group').result.status).not.toBe(0);
	});
	it('merge group uses its base policy and full CI despite a forged checkout and release title', () => {
		const { repo, base, commit } = fixture();
		repo.write('tools/ci-policy.ts', 'throw new Error("FORGED");');
		const head = commit();
		// Main may advance after the group was created; policy still belongs to its base.
		repo.git('update-ref', 'refs/heads/main', head);
		const { result, outputs, output } = materialize(repo, base, 'classify', 'merge_group');
		expect(result.status, result.stderr).toBe(0);
		const selected = run(repo, script('Select CI lane'), {
			TRUSTED_POLICY: outputs.directory!, BASE_SHA: base, HEAD_SHA: head,
			GITHUB_EVENT_NAME: 'merge_group', PR_TITLE: 'chore(release): prepare v1.0.0', GITHUB_OUTPUT: output,
		});
		expect(selected.status, selected.stderr).toBe(0);
		expect(readFileSync(output, 'utf8')).toContain('browser=true\nrelease-only=false\nversion=\n');
		const unreadable = run(repo, script('Select CI lane'), {
			TRUSTED_POLICY: outputs.directory!, BASE_SHA: base, HEAD_SHA: '0'.repeat(40),
			GITHUB_EVENT_NAME: 'merge_group', GITHUB_OUTPUT: output,
		});
		expect(unreadable.status).not.toBe(0);
	});
	it('merge group fails when its trusted base policy is missing', () => {
		const { repo, commit } = fixture();
		repo.git('rm', 'tools/ci-policy.ts'); const base = commit();
		repo.git('update-ref', 'refs/heads/main', base);
		for (const job of ['classify', 'ci']) {
			expect(materialize(repo, base, job, 'merge_group').result.status).not.toBe(0);
		}
	});
	it('wires merge-group events, SHAs and API approval without renaming required checks', () => {
		for (const yaml of [workflow, secretWorkflow]) expect(yaml).toContain('\n  merge_group:\n');
		expect(workflow).toContain('\n  ci:\n');
		expect(secretWorkflow).toContain('    name: gitleaks\n');
		expect(workflow).toContain('HEAD_SHA: ${{ github.event.merge_group.head_sha || github.event.pull_request.head.sha }}');
		const approval = workflow.split('      - name: API report approval\n')[1]!.split('\n      - name:')[0]!;
		expect(approval).toContain("if: github.event_name == 'pull_request' || github.event_name == 'merge_group'");
		expect(approval).toContain('API_BASE_SHA: ${{ github.event.merge_group.base_sha || github.event.pull_request.base.sha }}');
		expect(approval).toContain('bun run api:approve -- --base "$API_BASE_SHA"');
	});
	it('scans exactly the merge-group range and propagates scan and range failures', () => {
		const { repo, base, commit } = fixture();
		repo.write('group', 'queued change'); const head = commit();
		const scan = script('Scan merge group range', 'gitleaks', secretWorkflow);
		const env = { BASE_SHA: base, HEAD_SHA: head };
		const result = run(repo, `gitleaks() { printf '%s\\n' "$@"; }\n${scan}`, env);
		expect(result.status, result.stderr).toBe(0);
		expect(result.stdout.trim().split('\n')).toEqual(['detect', '--redact', '--log-opts', `${base}..${head}`]);
		expect(run(repo, `gitleaks() { return 7; }\n${scan}`, env).status).toBe(7);
		for (const missing of ['', '0'.repeat(40)]) {
			const invalid = run(repo, `gitleaks() { echo SCANNED; }\n${scan}`, { ...env, HEAD_SHA: missing });
			expect(invalid.status).not.toBe(0);
			expect(invalid.stdout).not.toContain('SCANNED');
		}
	});
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
	it.each(['workflow_dispatch', 'push'])('%s uses main policy even when the branch policy is forged', (event) => {
		const { repo, commit } = fixture();
		repo.write('tools/ci-policy.ts', 'throw new Error("FORGED");'); commit();
		const { result, outputs, output } = materialize(repo, '', 'classify', event);
		expect(result.status, result.stderr).toBe(0);
		const selected = run(repo, script('Select CI lane'), {
			TRUSTED_POLICY: outputs.directory!, GITHUB_EVENT_NAME: event, GITHUB_OUTPUT: output,
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
