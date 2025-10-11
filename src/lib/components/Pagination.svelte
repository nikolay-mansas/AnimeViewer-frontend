<script lang="ts">
	let { currentPage, totalPages } = $props();
</script>

<div class="flex justify-between items-center mt-6">
	<button class="px-3 py-1 bg-[#2a2a3c] rounded hover:bg-[#3a3a4c] disabled:opacity-50" disabled={currentPage <= 1}>
		←
	</button>
	<p>Стр. {currentPage} из {totalPages}</p>
	<button class="px-3 py-1 bg-[#2a2a3c] rounded hover:bg-[#3a3a4c] disabled:opacity-50" disabled={currentPage >= totalPages}>
		→
	</button>
</div>