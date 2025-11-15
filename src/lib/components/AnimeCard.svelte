<script lang="ts">
	let { title, episodes, img, href, registerTitle } = $props();

	let titleEl: HTMLDivElement | undefined;
	let cardEl: HTMLDivElement | undefined;

	$effect(() => {
		if (!registerTitle || !titleEl || !cardEl) return;
		const cleanup = registerTitle(titleEl, cardEl);
		return () => cleanup?.();
	});
</script>

<a href={href} class="block h-full">
	<div
		bind:this={cardEl}
		class="relative h-full bg-[#1e1e2e] rounded-lg overflow-hidden shadow-lg hover:scale-105 transition-transform grid grid-rows-[auto,1fr]"
	>
		<div class="w-full aspect-[2/3]">
			<img src={img} alt={title} class="block w-full h-full object-cover" />
		</div>

		<div class="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">{episodes}</div>

		<div bind:this={titleEl} class="p-3 text-sm leading-snug break-words min-h-0">
			{title}
		</div>
	</div>
</a>