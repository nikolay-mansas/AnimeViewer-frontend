<script lang="ts">
	import AnimePlayer from '$lib/components/AnimePlayer.svelte';
	import Footer from '$lib/components/Footer.svelte';

	interface PageData {
		animeId: string;
		title: string;
		episode: number;
		episodesTotal: number;
		basePath: string;
		src: string;
		opening?: number | null;
		end?: number | null;
	}

	interface PageProps {
		data: PageData;
	}

	let { data }: PageProps = $props();
</script>

<div class="container mx-auto max-w-5xl px-4 py-6">
	{#key data.episode}
		<AnimePlayer
			animeGid={data.animeId}
			title={data.title}
			episode={data.episode}
			episodesTotal={data.episodesTotal}
			basePath={data.basePath}
			src={data.src}
			opening={data.opening}
			end={data.end}
		/>
	{/key}
</div>

<Footer />