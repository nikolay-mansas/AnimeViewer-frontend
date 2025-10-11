<script lang="ts">
	import AnimeCard from './AnimeCard.svelte';
	let { animes } = $props();
</script>

<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
	{#each animes as anime}
		<AnimeCard {...anime} />
	{/each}
</div>