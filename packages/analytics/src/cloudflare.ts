// Cloudflare's published edge ranges, from https://www.cloudflare.com/ips-v4 and /ips-v6
// (API etag 38f79d050aa027e3be3865e495dcc9bc, read 2026-11-08). Cloudflare rarely changes them;
// refresh this list from those URLs when it does.
const CLOUDFLARE_RANGES = [
	'173.245.48.0/20',
	'103.21.244.0/22',
	'103.22.200.0/22',
	'103.31.4.0/22',
	'141.101.64.0/18',
	'108.162.192.0/18',
	'190.93.240.0/20',
	'188.114.96.0/20',
	'197.234.240.0/22',
	'198.41.128.0/17',
	'162.158.0.0/15',
	'104.16.0.0/13',
	'104.24.0.0/14',
	'172.64.0.0/13',
	'131.0.72.0/22',
	'2400:cb00::/32',
	'2606:4700::/32',
	'2803:f800::/32',
	'2405:b500::/32',
	'2405:8100::/32',
	'2a06:98c0::/29',
	'2c0f:f248::/32',
];

interface Address {
	bits: 32 | 128;
	value: bigint;
}

function parseIPv4(text: string): bigint | undefined {
	const parts = text.split('.');
	if (parts.length !== 4) return undefined;
	let value = 0n;
	for (const part of parts) {
		if (!/^\d{1,3}$/.test(part) || Number(part) > 255) return undefined;
		value = (value << 8n) | BigInt(part);
	}
	return value;
}

function parseIPv6(text: string): bigint | undefined {
	let groupsText = text;
	// An IPv4 tail, such as ::ffff:203.0.113.7, stands for the last two groups.
	const lastColon = text.lastIndexOf(':');
	let v4 = 0n;
	if (text.slice(lastColon + 1).includes('.')) {
		const parsed = parseIPv4(text.slice(lastColon + 1));
		if (parsed === undefined) return undefined;
		v4 = parsed;
		groupsText = `${text.slice(0, lastColon + 1)}0:0`;
	}
	const halves = groupsText.split('::');
	if (halves.length > 2) return undefined;
	const split = (half: string) => (half === '' ? [] : half.split(':'));
	const head = split(halves[0] ?? '');
	const tail = halves.length === 2 ? split(halves[1] ?? '') : [];
	const count = head.length + tail.length;
	if (halves.length === 1 ? count !== 8 : count > 7) return undefined;
	let value = 0n;
	for (const group of [...head, ...Array<string>(8 - count).fill('0'), ...tail]) {
		if (!/^[0-9a-f]{1,4}$/i.test(group)) return undefined;
		value = (value << 16n) | BigInt(parseInt(group, 16));
	}
	return value | v4;
}

function parseAddress(text: string): Address | undefined {
	const trimmed = text.trim();
	if (!trimmed.includes(':')) {
		const value = parseIPv4(trimmed);
		return value === undefined ? undefined : { bits: 32, value };
	}
	const value = parseIPv6(trimmed);
	if (value === undefined) return undefined;
	// IPv4-mapped IPv6 (::ffff:a.b.c.d) is the IPv4 address.
	if (value >> 32n === 0xffffn) return { bits: 32, value: value & 0xffffffffn };
	return { bits: 128, value };
}

const RANGES = CLOUDFLARE_RANGES.map((range) => {
	const [base = '', prefix = ''] = range.split('/');
	const address = parseAddress(base);
	if (!address) throw new Error(`Invalid Cloudflare range ${range}`);
	const shift = BigInt(address.bits - Number(prefix));
	return { bits: address.bits, shift, network: address.value >> shift };
});

/** Whether the text is an IPv4 or IPv6 address. */
export function isIpAddress(text: string): boolean {
	return parseAddress(text) !== undefined;
}

/** Whether the address belongs to one of Cloudflare's published edge ranges. */
export function isCloudflareAddress(text: string): boolean {
	const address = parseAddress(text);
	if (!address) return false;
	return RANGES.some((range) => range.bits === address.bits && address.value >> range.shift === range.network);
}
