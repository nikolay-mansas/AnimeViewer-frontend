<script lang="ts">
	import AnimeProfile from '$lib/components/AnimeProfile.svelte';
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
</script>

<AnimeProfile
	title={title}
	titleJp={titleJp}
	titles={titles}
	start_date={start_date}
	end_date={end_date}
	episodes={episodesTotal}
	imageUrl={imageUrl}
	description={description}
	genres={genres}
	episodesWatched={episodesWatched}
	animeGid={animeGid}
/>