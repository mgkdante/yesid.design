import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import ErrorPage, { type ErrorPageProps } from './ErrorPage.svelte';

const props: ErrorPageProps = {
	status: 404,
	label: 'ROUTE NOT FOUND',
	heading: 'This page is under construction',
	body: 'The page you want has not been built yet.',
	suggestions: [
		{ href: '/docs', label: 'Docs' },
		{ href: '/guides', label: 'Guides' },
	],
	suggestionsLabel: 'Where to next',
	statusNote: '# no such route',
	signLabel: 'SAMPLE',
};

const page = (overrides: Partial<ErrorPageProps> = {}) => render(ErrorPage, { props: { ...props, ...overrides } });
type View = ReturnType<typeof page>;

const signText = (view: View) =>
	[...view.getByTestId('construction-scene').querySelectorAll('text')].map((text) => text.textContent);
const terminal = (view: View) => view.queryByTestId('terminal-line')?.textContent?.replace(/\s+/g, ' ').trim();

describe('404', () => {
	it('shows the hazard rule, scene, label, heading, body and destinations', () => {
		const view = page();
		expect(view.getAllByTestId('hazard-tape')).toHaveLength(1);
		expect(view.getByTestId('construction-scene')).toBeInTheDocument();
		expect(view.getByTestId('error-label').textContent).toBe('ROUTE NOT FOUND');
		expect(view.container.querySelectorAll('h1')).toHaveLength(1);
		expect(view.getByRole('heading', { level: 1 }).textContent).toBe('This page is under construction');
		expect(view.getByText('The page you want has not been built yet.')).toBeInTheDocument();
		expect(view.queryByRole('alert')).toBeNull();
	});

	it('shows the status command with the note on the terminal line', () => {
		const line = terminal(page());
		expect(line).toContain('route --status 404');
		expect(line).toContain('# no such route');
	});
});

describe('other statuses', () => {
	it('announces the status, keeps the destinations and detail, and never signs the scene as 404', () => {
		const view = page({
			status: 500,
			heading: 'Something went wrong',
			detail: 'Database unavailable',
			suggestions: [{ href: '/', label: 'Home' }],
		});
		expect(view.getByRole('alert').textContent).toContain('500');
		expect(view.getByRole('heading', { level: 1 }).textContent).toBe('Something went wrong');
		expect(view.getByText('Database unavailable')).toBeInTheDocument();
		expect(view.getByRole('link', { name: 'Home' }).getAttribute('href')).toBe('/');
		expect(view.getByTestId('construction-scene')).toBeInTheDocument();
		expect(signText(view)).not.toContain('404');
		expect(terminal(view)).toContain('route --status 500');
	});
});

describe('illustration sign', () => {
	it.each([
		[404, 'SAMPLE', ['SAMPLE', '404']],
		[404, undefined, ['404']],
		[500, 'SAMPLE', ['SAMPLE']],
		[500, undefined, []],
	])('for status %i with signLabel %j shows %j', (status, signLabel, expected) => {
		expect(signText(page({ status, signLabel }))).toEqual(expected);
	});
});

describe('suggestions', () => {
	it('lists the destinations in order in a navigation named by suggestionsLabel', () => {
		const view = page();
		const nav = view.getByRole('navigation', { name: 'Where to next' });
		const items = view.getAllByTestId('error-suggestion-link');
		expect(items.map((link) => [link.textContent?.trim(), link.getAttribute('href')])).toEqual([
			['Docs', '/docs'],
			['Guides', '/guides'],
		]);
		expect(items.every((link) => nav.contains(link))).toBe(true);
	});

	it('styles only the first destination as primary', () => {
		const items = page().getAllByTestId('error-suggestion-link');
		expect(items.map((link) => link.classList.contains('suggestion-primary'))).toEqual([true, false]);
	});

	it.each([undefined, ''])('names the navigation by the heading when suggestionsLabel is %j', (suggestionsLabel) => {
		const view = page({ suggestionsLabel });
		const nav = view.getByRole('navigation', { name: 'This page is under construction' });
		expect(nav.getAttribute('aria-labelledby')).toBe(view.getByRole('heading', { level: 1 }).id);
		expect(nav.hasAttribute('aria-label')).toBe(false);
	});

	it.each([[[]], [undefined]])('renders no navigation for suggestions=%j', (suggestions) => {
		expect(page({ suggestions }).queryByRole('navigation')).toBeNull();
	});
});

describe('terminal line', () => {
	it('renders only when statusNote is given', () => {
		expect(page({ statusNote: undefined }).queryByTestId('terminal-line')).toBeNull();
		expect(page().queryByTestId('terminal-line')).not.toBeNull();
	});
});

describe('options', () => {
	const order = (view: View) =>
		[...view.container.querySelectorAll('.error-page-content > *')].map((part) =>
			part.matches('.error-illustration')
				? part.classList.contains('error-illustration--small')
					? 'small scene'
					: 'large scene'
				: part.matches('.error-copy')
					? 'copy'
					: part.matches('nav')
						? 'links'
						: 'status line',
		);

	it("keeps today's page by default: tape, label, then a large scene before the copy", () => {
		const view = page();
		expect(view.getAllByTestId('hazard-tape')).toHaveLength(1);
		expect(view.getByTestId('error-label').textContent).toBe('ROUTE NOT FOUND');
		expect(order(view)).toEqual(['large scene', 'copy', 'links', 'status line']);
	});

	it('places a small scene after the heading, body, destinations and status line', () => {
		const view = page({ illustration: 'small-after' });
		expect(order(view)).toEqual(['copy', 'links', 'status line', 'small scene']);
		expect(signText(view)).toEqual(['SAMPLE', '404']);
	});

	it('drops the scene with illustration="none"', () => {
		const view = page({ illustration: 'none' });
		expect(view.queryByTestId('construction-scene')).toBeNull();
		expect(order(view)).toEqual(['copy', 'links', 'status line']);
	});

	it('drops the hazard tape with tape={false}', () => {
		expect(page({ tape: false }).queryByTestId('hazard-tape')).toBeNull();
	});

	it('starts with the heading when label is omitted', () => {
		const view = page({ label: undefined, illustration: 'small-after', tape: false });
		expect(view.queryByTestId('error-label')).toBeNull();
		const copy = view.container.querySelector('.error-copy')!;
		expect(copy.firstElementChild?.tagName).toBe('H1');
		expect(view.container.querySelector('.error-page')!.firstElementChild).toBe(
			view.container.querySelector('.error-page-content'),
		);
	});

	it('keeps the status announcement for other statuses without a label', () => {
		const view = page({ status: 500, label: undefined, illustration: 'none' });
		expect(view.getByRole('alert').textContent).toContain('500');
	});
});
