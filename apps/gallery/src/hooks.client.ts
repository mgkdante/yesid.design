import type { ClientInit } from '@sveltejs/kit/hooks';
import { initializeUi } from '#lib/ui-initialization.js';

export const init: ClientInit = () => {
	initializeUi();
};
