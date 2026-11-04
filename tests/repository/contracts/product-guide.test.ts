import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const GALLERY = join(ROOT, 'apps/gallery');
const GUIDE = readFileSync(join(ROOT, 'docs/BUILD-A-YESID-PRODUCT.md'), 'utf8').replaceAll('\r\n', '\n');
const scratch: string[] = [];

function codeAfter(marker: string, language: string): string {
	const start = GUIDE.indexOf(marker);
	expect(start, `Missing guide example: ${marker}`).toBeGreaterThanOrEqual(0);
	const match = GUIDE.slice(start).match(new RegExp('```' + language + '\\n([\\s\\S]*?)```'));
	expect(match, `Missing ${language} block after ${marker}`).not.toBeNull();
	return match![1]!;
}

afterEach(() => {
	for (const root of scratch.splice(0)) rmSync(root, { recursive: true, force: true });
});

it('typechecks the guide config, composed hooks and complete Svelte examples on the installed Kit 3 stack', () => {
	const root = mkdtempSync(join(tmpdir(), 'yesid-product-guide-'));
	scratch.push(root);
	function write(path: string, source: string): void {
		const target = join(root, path);
		mkdirSync(dirname(target), { recursive: true });
		writeFileSync(target, source, 'utf8');
	}
	function link(name: string, target: string): void {
		const destination = join(root, 'node_modules', name);
		mkdirSync(dirname(destination), { recursive: true });
		symlinkSync(target, destination, process.platform === 'win32' ? 'junction' : 'dir');
	}
	const gallery: { dependencies: Record<string, string>; devDependencies: Record<string, string> } =
		JSON.parse(readFileSync(join(GALLERY, 'package.json'), 'utf8'));
	for (const name of Object.keys({ ...gallery.dependencies, ...gallery.devDependencies })) {
		if (name.startsWith('@yesid/')) continue;
		const local = join(GALLERY, 'node_modules', name);
		link(name, existsSync(local) ? local : join(ROOT, 'node_modules', name));
	}
	for (const name of ['analytics', 'config', 'i18n-core', 'motion', 'seo-kit', 'tokens', 'ui']) {
		link(`@yesid/${name}`, join(ROOT, 'packages', name));
	}
	link('@types/node', join(ROOT, 'node_modules/@types/node'));
	link('$app', join(GALLERY, 'node_modules/$app'));
	write('package.json', JSON.stringify({
		type: 'module',
		imports: { '#lib/*': './src/lib/*' },
		dependencies: { '@sveltejs/kit': gallery.devDependencies['@sveltejs/kit'] },
	}));
	write('kit.config.js', codeAfter('\n`kit.config.js`:', 'js'));
	write('vite.config.ts', codeAfter('\n`vite.config.ts`:', 'ts'));
	write('tsconfig.json', codeAfter("After `svelte-kit sync`", 'json'));
	write('src/lib/ui-initialization.ts', codeAfter('Create one shared initializer', 'ts'));
	write('src/hooks.client.ts', codeAfter('`src/hooks.client.ts`:', 'ts'));
	write('src/lib/site.ts', codeAfter('Add `src/lib/site.ts`:', 'ts'));
	write('src/hooks.server.ts', codeAfter('`src/hooks.server.ts` composes', 'ts'));
	write('src/app.css', '');
	const examples = [...GUIDE.matchAll(/```svelte\n([\s\S]*?)```/g)].map((match) => match[1]!);
	expect(examples.length).toBeGreaterThanOrEqual(3);
	for (const [index, source] of examples.entries()) {
		// Section 7's skeleton intentionally uses ellipsis props, not runnable code.
		if (source.includes('<SiteHeader … />')) continue;
		const filename = source.includes('const navigation = createNavigationLifecycle')
			? 'src/routes/+layout.svelte' : `src/Example${index}.svelte`;
		write(filename, source);
	}
	const result = spawnSync('bun', [
		join(GALLERY, 'node_modules/svelte-check/bin/svelte-check'), '--tsconfig', './tsconfig.json',
	], { cwd: root, encoding: 'utf8', timeout: 45_000 });
	expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
}, 60_000);
