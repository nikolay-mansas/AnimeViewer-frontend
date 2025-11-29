import type { PageLoad } from './$types';

const titleMap: Record<string, string> = {
	'shingeki-no-kyojin': 'Атака титанов'
};

// мапа slug -> anime_gid из вашего API
const animeIdMap: Record<string, string> = {
	'shingeki-no-kyojin': '5fc52cc7-9677-449b-8e70-a6b49614fcdf'
};

export const load: PageLoad = async ({ params, fetch }) => {
	const slug = params.slug;
	const episode = Number(params.episode ?? 1);
	const episodesTotal = 12;

	const animeId = animeIdMap[slug];

	let src: string | undefined;
	let opening: number | null = null;
	let end: number | null = null;

	if (animeId) {
		try {
			const res = await fetch(
				`http://127.0.0.1:7999/api/v2/video/anime/${animeId}/${episode}`
			);

			if (res.ok) {
				const data = await res.json();
				src = data.path || undefined;
				opening = data.opening ?? null;
				end = data.end ?? null;
			}
		} catch (e) {
			console.error('Failed to load video meta', e);
		}
	}

	return {
		title: titleMap[slug] ?? 'Аниме',
		episode,
		episodesTotal,
		basePath: `/anime/${slug}`,
		src,
		opening,
		end
	};
};