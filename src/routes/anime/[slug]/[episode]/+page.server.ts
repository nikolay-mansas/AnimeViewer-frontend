import { PRIVATE_API_URL } from '$env/static/private';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

type AnimeApiResponse = {
	gid: string;
	title: string;
	number_episodes: number;
};

type VideoMeta = {
	gid: string;
	anime_gid: string;
	series: number;
	path: string;
	opening: number | null;
	end: number | null;
	created_at: string;
	updated_at: string;
};

export const load: PageServerLoad = async ({ params, fetch }) => {
	const slug = params.slug;
	const episode = Number(params.episode ?? 1);

	const animeRes = await fetch(
		`${PRIVATE_API_URL}/api/v2/anime/?u=${encodeURIComponent(slug)}`
	);

	if (!animeRes.ok) {
		if (animeRes.status === 404) {
			throw error(404, 'Аниме не найдено');
		}

		throw error(500, 'Ошибка загрузки данных аниме');
	}

	const anime = (await animeRes.json()) as AnimeApiResponse;

	const animeId = anime.gid;
	const episodesTotal = anime.number_episodes;

	let src: string | undefined;
	let opening: number | null = null;
	let end: number | null = null;

	const videoRes = await fetch(
		`${PRIVATE_API_URL}/api/v2/video/anime/${animeId}/${episode}`
	);

	if (videoRes.ok) {
		const video = (await videoRes.json()) as VideoMeta;
		const path = video.path;

		src = path;
		opening = video.opening ?? null;
		end = video.end ?? null;
	}

	return {
		title: anime.title,
		episode,
		episodesTotal,
		basePath: `/anime/${slug}`,
		src,
		opening,
		end
	};
};