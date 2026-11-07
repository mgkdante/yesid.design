import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { RELEASE_PACKAGES } from '../../../tools/release-core.js';

/** A real filesystem checkout, isolated from the working repository. */
export class TempCheckout {
	readonly root = mkdtempSync(join(tmpdir(), 'yesid-release-'));

	write(path: string, source: string): void {
		const target = join(this.root, path);
		mkdirSync(dirname(target), { recursive: true });
		writeFileSync(target, source);
	}

	read(path: string): string {
		return readFileSync(join(this.root, path), 'utf8');
	}

	git(...args: string[]): string {
		const result = spawnSync('git', args, { cwd: this.root, encoding: 'utf8' });
		if (result.status !== 0) throw new Error(result.stderr || String(result.error));
		return result.stdout.trim();
	}

	dispose(): void {
		rmSync(this.root, { recursive: true, force: true });
	}
}

export function createReleaseCheckout(version = '0.6.0'): TempCheckout {
	const checkout = new TempCheckout();
	checkout.write('package.json', `${JSON.stringify({ name: 'yesid.design', version, private: true }, null, '\t')}\n`);
	const workspaces: Record<string, unknown> = {
		'': { name: 'yesid.design' },
		'apps/gallery': { name: '@yesid/gallery', version: '0.1.0' },
	};
	for (const { name, directory } of RELEASE_PACKAGES) {
		const workspace = `packages/${directory}`;
		workspaces[workspace] = { name, version };
		checkout.write(`${workspace}/package.json`, `${JSON.stringify({ name, version, private: true }, null, 2)}\n`);
		checkout.write(`${workspace}/README.md`, `[Changelog](https://github.com/mgkdante/yesid.design/blob/v${version}/CHANGELOG.md)\n`);
	}
	checkout.write('apps/gallery/package.json', `${JSON.stringify({ name: '@yesid/gallery', version: '0.1.0', private: true }, null, '\t')}\n`);
	checkout.write('bun.lock', `${JSON.stringify({ lockfileVersion: 1, configVersion: 1, workspaces }, null, 2)}\n`);
	checkout.write('.changes/.gitkeep', '');
	return checkout;
}
