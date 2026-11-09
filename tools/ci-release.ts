import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstatSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Reproduce only merge-base code, never the PR's prepare script. No install is needed. */
export function releaseOnly(event: string, title: string, base: string, head: string,
	cwd = process.cwd(), timeout = 30_000): string | undefined {
	if (event !== 'pull_request') return undefined;
	let scratch: string | undefined;
	const deadline = Date.now() + timeout;
	const run = (program: string, args: string[], root = cwd) => {
		if (Date.now() >= deadline) throw new Error('Release reproduction timed out');
		return execFileSync(program, args, {
			cwd: root, encoding: 'utf8', timeout: Math.max(1, deadline - Date.now()),
			maxBuffer: 32 * 1024 * 1024,
		});
	};
	try {
		if (![base, head].every((sha) => /^[a-f0-9]{40}$/u.test(sha))) return undefined;
		const version: unknown = JSON.parse(run('git', ['show', `${head}:package.json`])).version;
		if (typeof version !== 'string' || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-rc\.[1-9]\d*)?$/u.test(version)) return undefined;
		if (title !== `chore(release): prepare v${version}` && (version.includes('-') || title !== `chore(release): promote v${version}`)) return undefined;
		const mergeBase = run('git', ['merge-base', base, head]).trim();
		const expected = run('git', ['ls-tree', '-r', '-z', head]).split('\0').filter(Boolean).sort();
		scratch = mkdtempSync(join(tmpdir(), 'ci-release-'));
		for (const attempt of ['first', 'second']) {
			const root = join(scratch, attempt);
			try {
				run('git', ['-c', 'core.autocrlf=false', 'worktree', 'add', '--detach', root, mergeBase]);
				if (run('bun', ['--version'], root).trim() !== readFileSync(join(root, '.bun-version'), 'utf8').trim()) return undefined;
				run('bun', ['run', 'release:prepare', '--', '--version', version], root);
				const actual: string[] = [];
				const visit = (directory: string, prefix = '') => {
					if (Date.now() >= deadline) throw new Error('Release reproduction timed out');
					for (const name of readdirSync(directory)) {
						if (prefix === '' && name === '.git') continue;
						const path = join(directory, name);
						const relative = `${prefix}${name}`;
						const stat = lstatSync(path);
						if (stat.isDirectory()) { visit(path, `${relative}/`); continue; }
						if (!stat.isFile() && !stat.isSymbolicLink()) throw new Error('Unsupported file');
						const bytes = stat.isSymbolicLink() ? Buffer.from(readlinkSync(path)) : readFileSync(path);
						const hash = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
						const mode = stat.isSymbolicLink() ? '120000' : stat.mode & 0o111 ? '100755' : '100644';
						actual.push(`${mode} blob ${hash}\t${relative}`);
					}
				};
				visit(root);
				if (JSON.stringify(actual.sort()) !== JSON.stringify(expected)) return undefined;
			} finally {
				execFileSync('git', ['worktree', 'remove', '--force', root], { cwd, timeout: 5_000 });
			}
		}
		return version;
	} catch (error) {
		console.warn('Release reproduction selected full CI:', error instanceof Error ? error.message : String(error));
		return undefined;
	} finally {
		try {
			if (scratch) rmSync(scratch, { recursive: true, force: true });
		} catch {
			console.warn('Release reproduction cleanup failed; selected full CI');
			return undefined;
		}
	}
}
