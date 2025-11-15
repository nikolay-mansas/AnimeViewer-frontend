import { PRIVATE_API_URL } from '$env/static/private';

export async function load({ fetch, url }) {
	const page = Number(url.searchParams.get('page') ?? '1');
	const pageSize = Number(url.searchParams.get('page_size') ?? '12');
	const text = url.searchParams.get('text') ?? '';

	const params = new URLSearchParams();
	params.set('page', String(page));
	params.set('page_size', String(pageSize));
	if (text) params.set('text', text);

	const response = await fetch(
		PRIVATE_API_URL + `/api/v2/anime/search?${params.toString()}`
	);

	const json = await response.json();

	const animes = (json.result ?? []).map((item) => ({
		id: item.gid,
		title: item.title,
		episodes: `0/${item.number_episodes}`,
		img: item.preview_path
	}));

	return {
		animes,
		total: json.total,
		page,
		pageSize,
		text
	};
}
