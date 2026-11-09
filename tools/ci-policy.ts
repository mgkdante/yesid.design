import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

// Exact repository documentation paths, never package or generated documentation.
const DOCUMENTATION = new Set(['README.md', 'CONTRIBUTING.md', 'DECISIONS.md']);

export function selectBrowser(event: string, changedFiles: () => readonly string[]): boolean {
	if (event !== 'pull_request') return true;
	try {
		const files = changedFiles();
		return files.length === 0 || files.some((path) => !DOCUMENTATION.has(path));
	} catch {
		return true;
	}
}

export function changedFiles(base: string, head: string): string[] {
	if (![base, head].every((sha) => /^[a-f0-9]{40}$/u.test(sha))) {
		throw new Error('Expected base and head commit SHAs');
	}
	for (const sha of [base, head]) {
		execFileSync('git', ['fetch', '--no-tags', '--depth=1', 'origin', sha]);
	}
	// Disable rename detection so both sides of moves must be allowed.
	const diff = execFileSync('git', ['diff', '--no-renames', '--name-only', '-z', base, head], {
		encoding: 'utf8',
	});
	return diff === '' ? [] : diff.slice(0, -1).split('\0');
}

type Need = { result?: string; outputs?: Record<string, string> };
export function aggregatePasses(needs: Record<string, Need>): boolean {
	const required = ['classify', 'check', 'browser-authority', 'token-outputs-windows', 'token-byte-parity'];
	if (required.some((job) => !needs[job])) return false;
	const selection = needs.classify?.outputs?.browser;
	if (selection !== 'true' && selection !== 'false') return false;
	return Object.entries(needs).every(([job, need]) => {
		if (job === 'browser-authority') {
			return need.result === (selection === 'false' ? 'skipped' : 'success');
		}
		return need.result === 'success';
	});
}

if (import.meta.main) {
	if (process.argv[2] === 'classify') {
		const browser = selectBrowser(process.env.GITHUB_EVENT_NAME ?? '', () =>
			changedFiles(process.env.BASE_SHA ?? '', process.env.HEAD_SHA ?? ''),
		);
		appendFileSync(process.env.GITHUB_OUTPUT!, `browser=${browser}\n`);
	} else if (process.argv[2] === 'aggregate') {
		const needs = JSON.parse(process.env.CI_NEEDS ?? '{}') as Record<string, Need>;
		if (!aggregatePasses(needs)) {
			console.error('Required CI job results or browser selection did not match policy', needs);
			process.exitCode = 1;
		}
	} else {
		throw new Error('Expected classify or aggregate');
	}
}
