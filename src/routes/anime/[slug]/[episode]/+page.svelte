<script lang="ts">
	import AnimePlayer from '$lib/components/AnimePlayer.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import { clampText } from '$lib/seo';

	interface PageData {
		animeId: string;
		title: string;
		episode: number;
		episodesTotal: number;
		basePath: string;
		src: string;
		opening_start?: number | null;
		opening_end?: number | null;
		end?: number | null;
	}

	interface PageProps {
		data: PageData;
	}

	let { data }: PageProps = $props();

	const canonical = `https://animeviewer.ru${data.basePath}/${data.episode}`;
	const pageTitle = `Смотреть «${data.title}» — серия ${data.episode} · AnimeViewer`;
	const pageDesc = clampText(`Смотреть «${data.title}» — серия ${data.episode}.`, 180);

	const ld = {
		'@context': 'https://schema.org',
		'@type': 'TVEpisode',
		name: `${data.title} — серия ${data.episode}`,
		url: canonical,
		partOfSeries: {
			'@type': 'TVSeries',
			name: data.title,
			url: `https://animeviewer.ru${data.basePath}`
		}
	};
</script>

<Seo
	title={pageTitle}
	description={pageDesc}
	type="video.episode"
	canonical={canonical}
	noindex={true}
	jsonLd={ld}
/>

<div class="container mx-auto max-w-5xl px-4 py-6">
	{#key data.episode}
		<AnimePlayer
			animeGid={data.animeId}
			title={data.title}
			episode={data.episode}
			episodesTotal={data.episodesTotal}
			basePath={data.basePath}
			src={data.src}
			opening_start={data.opening_start}
			opening_end={data.opening_end}
			end={data.end}
		/>
	{/key}
</div>

<Footer />