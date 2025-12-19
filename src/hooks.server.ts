import type { Handle } from '@sveltejs/kit';

const NOINDEX_ROUTES = [
	/^\/admin(?:\/|$)/,
	/^\/login(?:\/|$)/,
	/^\/register(?:\/|$)/,
	/^\/anime\/[^/]+\/\d+\/?$/
];

export const handle: Handle = async ({ event, resolve }) => {
	const res = await resolve(event);

	const path = event.url.pathname;

	if (NOINDEX_ROUTES.some((r) => r.test(path))) {
		res.headers.set('X-Robots-Tag', 'noindex, nofollow');
	}

	return res;
};
