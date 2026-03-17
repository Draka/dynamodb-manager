import { paraglideMiddleware } from '$lib/paraglide/server';

/** @param {{ event: import('@sveltejs/kit').RequestEvent; resolve: (event: import('@sveltejs/kit').RequestEvent, opts?: any) => Promise<Response> }} opts */
const handleParaglide = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;

		return resolve(event, {
			/** @param {{ html: string }} chunk */
			transformPageChunk: ({ html }) => html.replace('%paraglide.lang%', locale)
		});
	});

export const handle = handleParaglide;
