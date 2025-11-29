<script lang="ts">
	import AnimePlayer from '$lib/components/AnimePlayer.svelte';
	import Footer from '$lib/components/Footer.svelte';

	interface PageData {
		title: string;
		episode: number;
		episodesTotal: number;
		basePath: string;
	}

	interface PageProps {
		data: PageData;
	}

	let { data }: PageProps = $props();

	const { title, episode, episodesTotal, basePath } = data;
</script>

<div class="container mx-auto max-w-5xl px-4 py-6">
	<AnimePlayer {title} {episode} {episodesTotal} {basePath} />
</div>

<Footer />