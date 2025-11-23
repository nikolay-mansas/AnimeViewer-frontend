import { PRIVATE_API_URL } from '$env/static/private';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

type AnimeTitle = {
	gid: string;
	anime_gid: string;
	language: string;
	name: string;
	created_at: string;
	updated_at: string;
};

type AnimeApiResponse = {
	gid: string;
	status: string;
	age: string;
	type: string;
	title: string;
	url: string;
	start_date: number;
	end_date: number | null;
	preview_path: string;
	number_episodes: number;
	description: string | null;
	enable: boolean;
	created_at: string;
	updated_at: string;
	genres: Array<string | { name: string }>;
	titles: AnimeTitle[];
};

type EpisodesWatched = Record<number, { progress: number, viewed: boolean }>;

export const load: PageServerLoad = async ({ params, fetch }) => {
	const slug = params.slug;

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

	const title = anime.title;
	const titleJp = slug;
	const titles = anime.titles;
	const start_date = anime.start_date;
	const end_date = anime.end_date;
	const episodesTotal = anime.number_episodes;

	const imageUrl = anime.preview_path.startsWith('http')
		? anime.preview_path
		: `${PRIVATE_API_URL}${anime.preview_path}`;

	const genres: string[] = (anime.genres ?? []).map((g) =>
		typeof g === 'string' ? g : g.name
	);

	const episodesWatched: EpisodesWatched = {};

	return {
		title,
		titleJp,
		titles,
		start_date,
		end_date,
		episodesTotal,
		imageUrl,
		description: anime.description ?? 'Описание пока отсутствует',
		genres,
		episodesWatched,
		animeGid: anime.gid
	};
};