<script lang="ts">
	import CardGrid from '$lib/components/CardGrid.svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import Pagination from '$lib/components/Pagination.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import { clampText } from '$lib/seo';

	import { PUBLIC_API_URL } from '$env/static/public';

	let { data } = $props();
	const {
		animes: initialAnimes,
		total: initialTotal,
		page: initialPage,
		pageSize,
		text: initialText
	} = data;

	let animes = $state(
		initialAnimes.map((item: any) => ({
			id: item.gid,
			title: item.title,
			episodes: item.episodes,
			img: item.img,
			href: `/anime/${item.href}`
		}))
	);

	let total = $state(initialTotal);
	let page = $state(initialPage);
	let text = $state(initialText ?? '');

	async function fetchAnimes(query: string, pageNum = 1) {
		const params = new URLSearchParams();
		params.set('page', String(pageNum));
		params.set('page_size', String(pageSize));
		if (query.trim()) params.set('text', query.trim());

		const response = await fetch(PUBLIC_API_URL + `/api/v2/anime/search?${params.toString()}`);
		const json = await response.json();

		animes = (json.result ?? []).map((item: any) => ({
			id: item.gid,
			title: item.title,
			episodes: `0/${item.number_episodes}`,
			img: item.preview_path,
			href: `/anime/${item.url}`
		}));

		total = json.total;
		page = pageNum;
	}

	async function handleSearch(query: string) {
		text = query;
		await fetchAnimes(query, 1);
	}

	const pageTitle = $derived.by(() => {
		const q = text.trim();
		if (!q) return 'Смотреть аниме онлайн — каталог · AnimeViewer';
		return `Смотреть «${q}» — поиск аниме · AnimeViewer`;
	});

	const pageDesc = $derived.by(() => {
		const q = text.trim();
		if (!q)
			return clampText(
				'Каталог аниме: выбирайте тайтл, открывайте профиль и начинайте просмотр.',
				180
			);
		return clampText(
			`Поиск по запросу «${q}». Найдите нужное аниме и откройте страницу тайтла для просмотра.`,
			180
		);
	});

	const ld = $derived.by(() => ({
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		name: 'AnimeViewer',
		url: 'https://animeviewer.ru/',
		potentialAction: {
			'@type': 'SearchAction',
			target: 'https://animeviewer.ru/?text={search_term_string}',
			'query-input': 'required name=search_term_string'
		}
	}));
</script>

<Seo title={pageTitle} description={pageDesc} type="website" jsonLd={ld} />

<div class="mx-auto max-w-screen-xl space-y-6 px-4 pt-10">
	<h1 class="text-3xl font-bold">Каталог аниме</h1>

	<SearchBar bind:q={text} onSearch={handleSearch} />

	<CardGrid {animes} />

	<Pagination currentPage={page} totalPages={Math.ceil(total / pageSize)} />
</div>

<Footer />
