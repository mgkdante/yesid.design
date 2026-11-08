import { describe, expect, it } from 'vitest';
import { isCloudflareAddress, isIpAddress } from './cloudflare';

describe('isIpAddress', () => {
	it.each(['203.0.113.7', '0.0.0.0', '::', '::1', '2001:db8::1', '2001:0db8:0000:0000:0000:0000:0000:0001', '::ffff:203.0.113.7', ' 203.0.113.7 '])(
		'accepts %s',
		(text) => expect(isIpAddress(text)).toBe(true),
	);

	it.each([
		'',
		'cloudflare',
		'203.0.113',
		'203.0.113.256',
		'203.0.113.7.1',
		'1.2.3.-4',
		'2001:db8::1::2',
		'2001:db8:1:2:3:4:5',
		'2001:db8:1:2:3:4:5:6:7',
		'2001:db8::g',
		'12345::1',
		':1::',
		':::',
		'::ffff:203.0.113.999',
		'203.0.113.7, 198.51.100.1',
	])('refuses %j', (text) => expect(isIpAddress(text)).toBe(false));
});

describe('isCloudflareAddress', () => {
	it.each(['173.245.48.0', '173.245.63.255', '162.159.255.255', '172.71.255.255', '2405:8100::1', '2c0f:f248:ffff::1'])(
		'recognises %s',
		(text) => expect(isCloudflareAddress(text)).toBe(true),
	);

	it.each(['173.245.47.255', '162.160.0.0', '172.72.0.0', '8.8.8.8', '2001:db8::1', '2c0f:f249::1', '::ffff:8.8.8.8', 'nope'])(
		'refuses %s',
		(text) => expect(isCloudflareAddress(text)).toBe(false),
	);
});
