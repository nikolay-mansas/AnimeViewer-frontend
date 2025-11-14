<script lang="ts">
	import CardGrid from '$lib/components/CardGrid.svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import Pagination from '$lib/components/Pagination.svelte';
	import Footer from '$lib/components/Footer.svelte';

	let { data } = $props();
	const { animes, total, page, pageSize } = data;
</script>

<svelte:head>
	<title>Каталог аниме – AnimeViewer</title>
</svelte:head>

<div class="max-w-screen-xl mx-auto px-4 pt-10 space-y-6">
	<h1 class="text-3xl font-bold">Каталог аниме</h1>
	<SearchBar />
	<CardGrid {animes} />
	<Pagination currentPage={page} totalPages={Math.ceil(total / pageSize)} />
</div>

<Footer />