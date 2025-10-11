<script lang="ts">
	import Input from './Input.svelte';

	let q = $state('');

	function onSearch() {
		// подставь свой роутинг/запрос
		console.log('search:', q);
	}
</script>

<div class="flex items-stretch gap-2">
	<Input placeholder="Поиск аниме" bind:value={q} />

	<!-- твоя улучшенная кнопка -->
	<button class="btn-custom" onclick={onSearch}>Найти</button>
</div>
