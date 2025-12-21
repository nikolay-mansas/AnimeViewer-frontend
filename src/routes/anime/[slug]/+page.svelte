<script lang="ts">
	import AnimeProfile from '$lib/components/AnimeProfile.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import { clampText } from '$lib/seo';
	import type { PageData } from './$types';

	export let data: PageData;

	const {
		title,
		titleJp,
		titles,
		start_date,
		end_date,
		episodesTotal,
		imageUrl,
		description,
		genres,
		episodesWatched,
		animeGid
	} = data;

	const canonical = `https://animeviewer.ru/anime/${titleJp}`;
	const pageTitle = `Смотреть «${title}» онлайн · AnimeViewer`;
	const pageDesc = clampText(description || `Смотреть «${title}» онлайн.`, 180);

	const ld = {
		'@context': 'https://schema.org',
		'@type': 'TVSeries',
		name: title,
		url: canonical,
		image: imageUrl,
		numberOfEpisodes: episodesTotal,
		genre: genres,
		description: description || undefined
	};
</script>

<Seo
	title={pageTitle}
	description={pageDesc}
	image={imageUrl}
	type="video.tv_show"
	{canonical}
	jsonLd={ld}
/>

<AnimeProfile
	{title}
	{titleJp}
	{titles}
	{start_date}
	{end_date}
	episodes={episodesTotal}
	{imageUrl}
	{description}
	{genres}
	{episodesWatched}
	{animeGid}
/>

<Footer />
