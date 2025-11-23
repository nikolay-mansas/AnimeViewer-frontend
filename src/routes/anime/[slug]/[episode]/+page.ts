import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	const slug = params.slug;
	const episode = Number(params.episode ?? 1);
	const episodesTotal = 12;
	const titleMap: Record<string, string> = {
		'shingeki-no-kyojin': 'Атака титанов'
	};

	return {
		title: titleMap[slug] ?? 'Аниме',
		episode,
		episodesTotal,
		basePath: `/anime/${slug}`
	};
};