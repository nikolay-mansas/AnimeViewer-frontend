<script lang="ts">
	import Input from './Input.svelte';

	let { q = $bindable(''), onSearch } = $props();

	function triggerSearch() {
		const value = q.trim();
		if (!value) return;

		onSearch?.(value);

		if (typeof document !== 'undefined') {
			const active = document.activeElement;
			if (active instanceof HTMLElement) active.blur();
		}
	}

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		triggerSearch();
	}
</script>

<form class="flex items-stretch gap-2" onsubmit={handleSubmit}>
	<Input placeholder="Поиск аниме" bind:value={q} />

	<button
		type="submit"
		class="btn-custom disabled:cursor-not-allowed disabled:opacity-40"
		disabled={q.trim() === ''}
	>
		Найти
	</button>
</form>
