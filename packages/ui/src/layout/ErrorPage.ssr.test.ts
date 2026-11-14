// @vitest-environment node
import { render } from 'svelte/server';
import { expect, it } from 'vitest';
import ErrorPage from './ErrorPage.svelte';

const props = {
	label: 'ROUTE NOT FOUND',
	heading: 'This page is under construction',
	body: 'The page you want has not been built yet.',
	suggestions: [{ href: '/docs', label: 'Docs' }],
	suggestionsLabel: 'Where to next',
	statusNote: '# no such route',
};

it.each([404, 500])('server markup of a %i has the scene, copy, destinations and terminal line', (status) => {
	const { body } = render(ErrorPage, { props: { ...props, status } });

	expect(body).toContain('data-testid="construction-scene"');
	expect(body).toContain('ROUTE NOT FOUND');
	expect(body).toContain('This page is under construction');
	expect(body).toContain('The page you want has not been built yet.');
	expect(body).toContain('href="/docs"');
	expect(body).toContain('aria-label="Where to next"');
	expect(body).toContain('data-testid="terminal-line"');
	expect(body.includes('role="alert"')).toBe(status !== 404);
});

it('server markup with the quiet options has no tape or label and puts the scene last', () => {
	const { body } = render(ErrorPage, {
		props: { ...props, status: 404, label: undefined, tape: false, illustration: 'small-after', suggestionsLabel: undefined },
	});

	expect(body).not.toContain('data-testid="hazard-tape"');
	expect(body).not.toContain('data-testid="error-label"');
	expect(body.indexOf('data-testid="terminal-line"')).toBeLessThan(body.indexOf('data-testid="construction-scene"'));
	const headingId = /<h1 id="([^"]+)"/.exec(body)?.[1];
	expect(headingId).toBeTruthy();
	expect(body).toContain(`aria-labelledby="${headingId}"`);
});
