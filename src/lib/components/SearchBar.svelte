<script lang="ts">
	import Input from './Input.svelte';

	let { q = $bindable('')} = $props();

	function onSearch() {
		console.log('search:', q.trim());
	}
</script>

<div class="flex items-stretch gap-2">
	<Input placeholder="Поиск аниме" bind:value={q} />

	<button
		class="btn-custom disabled:opacity-40 disabled:cursor-not-allowed"
		onclick={onSearch}
		disabled={q.trim() === ''}
		>Найти
	</button>
</div>
