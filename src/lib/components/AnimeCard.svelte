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

<a {href} class="block h-full">
	<div
		bind:this={cardEl}
		class="relative grid h-full grid-rows-[auto,1fr] overflow-hidden rounded-lg bg-[#1e1e2e] shadow-lg transition-transform hover:scale-105"
	>
		<div class="aspect-[2/3] w-full">
			<img src={img} alt={title} class="block h-full w-full object-cover" />
		</div>

		<div class="absolute top-2 right-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
			{episodes}
		</div>

		<div bind:this={titleEl} class="min-h-0 p-3 text-sm leading-snug break-words">
			{title}
		</div>
	</div>
</a>
