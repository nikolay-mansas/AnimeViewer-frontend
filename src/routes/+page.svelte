<script lang="ts">
	import AnimeCard from '$lib/components/AnimeCard.svelte';
	import CardGrid from '$lib/components/CardGrid.svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import Pagination from '$lib/components/Pagination.svelte';
	import Footer from '$lib/components/Footer.svelte';

	let animes = [
		{ title: 'Атака титанов 3', episodes: '0/12', img: '/images/Attack_on_Titan_s3_p1.webp' },
		{ title: 'Шарлотта', episodes: '0/13', img: '/images/Charlotte.webp' },
		{ title: 'Госпожа Кагуя: в любви как на войне', episodes: '0/4', img: '/images/Kaguya_sama_Love_is_War_s1.webp' },
		{ title: 'Госпожа Кагуя: в любви как на войне 2', episodes: '0/12', img: '/images/Kaguya_sama_Love_is_War_s2.webp' },
		{ title: 'Ванпанчмен 2', episodes: '0/12', img: '/images/One_Punch_Man_s2.webp' },
		{ title: 'Атака титанов 3. Часть 2', episodes: '0/10', img: '/images/Attack_on_Titan_s3_p2.webp' }
	];
</script>

<svelte:head>
	<title>Каталог аниме – AnimeViewer</title>
</svelte:head>

<!-- Header -->
<header class="flex justify-between items-center px-4 py-4 border-b border-white/10">
	<h1 class="text-xl sm:text-2xl font-bold text-white tracking-wide">
		<span class="text-purple-400">β</span> AnimeViewer
	</h1>
	<button class="text-sm sm:text-base px-4 py-2 btn-custom">
		Вход
	</button>
</header>

<div class="max-w-screen-xl mx-auto px-4 pt-10 space-y-6">
	<h1 class="text-3xl font-bold">Каталог аниме</h1>
	<SearchBar />
	<CardGrid {animes} />
	<Pagination currentPage={2} totalPages={2} />
</div>

<Footer />