import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkPreparedRelease, packRelease, prepareRelease } from './release-core.js';

interface ReleaseArguments {
	command: 'prepare' | 'check';
	version: string;
	tag?: string;
}

const USAGE = 'usage: bun tools/release.ts <prepare|check> --version <exact SemVer>, or pack --tag <tag> --repository <owner/name>';

function parseArguments(args: readonly string[]): ReleaseArguments {
	const normalized = args.filter((argument) => argument !== '--');
	const command = normalized[0];
	if (command !== 'prepare' && command !== 'check') {
		throw new Error(USAGE);
	}
	let version: string | undefined;
	let tag: string | undefined;
	for (let index = 1; index < normalized.length; index += 1) {
		const argument = normalized[index];
		if (argument !== '--version' && argument !== '--tag') {
			throw new Error(`Unknown release argument: ${argument}`);
		}
		const value = normalized[++index];
		if (!value || value.startsWith('--')) {
			throw new Error(`${argument} requires a value`);
		}
		if (argument === '--version') {
			if (version !== undefined) throw new Error('--version may only be provided once');
			version = value;
		} else {
			if (tag !== undefined) throw new Error('--tag may only be provided once');
			tag = value;
		}
	}
	if (!version) {
		throw new Error(`${command} requires --version followed by an exact SemVer`);
	}
	if (command === 'prepare' && tag !== undefined) throw new Error('prepare does not accept --tag');
	return tag === undefined ? { command, version } : { command, version, tag };
}

export function runReleaseCommand(
	args: readonly string[],
	repositoryRootInput: string,
): string {
	const repositoryRoot = resolve(repositoryRootInput);
	const normalized = args.filter((argument) => argument !== '--');
	if (normalized[0] === 'pack') {
		const options = new Map<string, string>();
		for (let index = 1; index < normalized.length; index += 2) {
			const key = normalized[index];
			const value = normalized[index + 1];
			if ((key !== '--tag' && key !== '--repository') || !value || value.startsWith('--') || options.has(key)) {
				throw new Error(USAGE);
			}
			options.set(key, value);
		}
		const tag = options.get('--tag');
		const repository = options.get('--repository');
		if (!tag || !repository) throw new Error(USAGE);
		const tarballs = packRelease(repositoryRoot, { tag, repository });
		return `Packed ${tarballs.length} packages for ${tag} into dist`;
	}
	const parsed = parseArguments(normalized);
	if (parsed.command === 'prepare') {
		prepareRelease(repositoryRoot, parsed.version);
		return `Release ${parsed.version} prepared`;
	}
	checkPreparedRelease(repositoryRoot, { version: parsed.version, tag: parsed.tag });
	return parsed.tag
		? `Release ${parsed.version} is prepared for ${parsed.tag}`
		: `Release ${parsed.version} is prepared`;
}

export function main(args = process.argv.slice(2)): void {
	const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
	console.log(runReleaseCommand(args, repositoryRoot));
}

if (import.meta.main) {
	try {
		main();
	} catch (error: unknown) {
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
	}
}
