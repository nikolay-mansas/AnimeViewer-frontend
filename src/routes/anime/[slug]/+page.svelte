<script lang="ts">
    import AnimeProfile from "$lib/components/AnimeProfile.svelte";

    export let data: {
		title: string;
		titleJp: string;
		year: number;
		episodesTotal: number;
        imageUrl: string;
        description: string;
        genres: Array<string>;
        episodesWatched: Record<number, { progress: number }>;
	};

	const { title, titleJp, year, episodesTotal, imageUrl, description, genres, episodesWatched } = data;
</script>

<AnimeProfile
	title={title}
	titleJp={titleJp}
	year={year}
	episodes={episodesTotal}
	imageUrl={imageUrl}
	description={description}
	genres={genres}
	episodesWatched={episodesWatched}
/>