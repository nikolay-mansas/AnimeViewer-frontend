import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	const slug = params.slug;
	const titleMap: Record<string, string> = {
		'shingeki-no-kyojin': 'Атака титанов'
	};

	let title = titleMap[slug] ?? 'Аниме';
	let titleJp = slug;
	let year = 2013;
	let episodesTotal = 12;
	let imageUrl = '/images/Attack_on_Titan_s3_p1.webp';
	let description = 'Тут должно быть описание аниме';
	let genres = ['Экшен', 'Драма', 'Фэнтези'];
	let episodesWatched = {
		1: { progress: 100 },
		2: { progress: 60 },
		3: { progress: 0 },
		4: { progress: 20 }
	};

	return {
		title,
		titleJp,
		year,
		episodesTotal,
		imageUrl,
		description,
		genres,
		episodesWatched
	};
};