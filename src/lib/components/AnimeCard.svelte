<script lang="ts">
	let { title, episodes, img } = $props();
</script>

<div class="relative bg-[#1e1e2e] rounded-lg overflow-hidden shadow-lg hover:scale-105 transition-transform">
	<div class="aspect-auto w-full">
		<img src={img} alt={title} class="w-full h-full object-cover" />
	</div>
	<div class="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">{episodes}</div>
	<div class="p-3 text-sm truncate">{title}</div>
</div>