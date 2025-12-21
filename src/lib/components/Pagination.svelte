<script lang="ts">
	let { currentPage, totalPages } = $props();
</script>

<div class="mt-6 flex items-center justify-between">
	<button
		class="rounded bg-[#2a2a3c] px-3 py-1 hover:bg-[#3a3a4c] disabled:opacity-50"
		disabled={currentPage <= 1}
	>
		←
	</button>
	<p>Стр. {currentPage} из {totalPages}</p>
	<button
		class="rounded bg-[#2a2a3c] px-3 py-1 hover:bg-[#3a3a4c] disabled:opacity-50"
		disabled={currentPage >= totalPages}
	>
		→
	</button>
</div>
