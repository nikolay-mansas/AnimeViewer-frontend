import { PRIVATE_API_URL } from '$env/static/private';
import type { PageServerLoad } from './$types';

type ApiAnimeItem = {
	gid: number;
	title: string;
	number_episodes: number;
	preview_path: string;
	url: string;
};

type ApiResponse = {
	result?: ApiAnimeItem[];
	total: number;
};

type Anime = {
	id: number;
	title: string;
	episodes: string;
	img: string;
	href: string;
	priority: boolean;
};

const IMAGE_BASE = 'https://s3.animeviewer.ru';
const PREVIEW_WIDTH = 336;
const PREVIEW_QUALITY = 60;
const IMG_OPTS = `${PREVIEW_WIDTH}x,q${PREVIEW_QUALITY}`;

function makeImgUrl(previewPath: string): string {
	const url = new URL(previewPath, IMAGE_BASE);
	const parts = url.pathname.split('/');
	if (parts.length < 4) return previewPath;
	const id = parts[2];
	let file = parts[3];

	const dot = file.lastIndexOf('.');
	if (dot !== -1) file = file.slice(0, dot) + '.webp';

	return `${IMAGE_BASE}/api/${IMG_OPTS}/${id}/${file}`;
}

export const load: PageServerLoad = async ({ fetch, url }) => {
	const page = Number(url.searchParams.get('page') ?? '1');
	const pageSize = Number(url.searchParams.get('page_size') ?? '12');
	const text = url.searchParams.get('text') ?? '';

	const params = new URLSearchParams();
	params.set('page', String(page));
	params.set('page_size', String(pageSize));
	if (text) params.set('text', text);

	const response = await fetch(`${PRIVATE_API_URL}/v2/anime/search?${params.toString()}`);

	const json = (await response.json()) as ApiResponse;

	const animes: Anime[] = (json.result ?? []).map((item, index) => ({
		id: item.gid,
		title: item.title,
		episodes: `0/${item.number_episodes}`,
		img: makeImgUrl(item.preview_path),
		href: item.url,
		priority: index < 4
	}));

	return {
		animes,
		total: json.total,
		page,
		pageSize,
		text
	};
};
