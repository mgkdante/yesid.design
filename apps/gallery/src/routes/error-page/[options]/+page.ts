import { error } from '@sveltejs/kit';
import type { EntryGenerator, PageLoad } from './$types';
import { OPTION_SEGMENTS, parseOptions } from '../options';

export const entries: EntryGenerator = () => OPTION_SEGMENTS.map((options) => ({ options }));

export const load: PageLoad = ({ params }) => {
	const options = parseOptions(params.options);
	if (!options) error(404, 'Unknown error page options');
	return { options };
};
