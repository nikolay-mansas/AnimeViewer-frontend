<script lang="ts">
	import AnimeCard from './AnimeCard.svelte';
	let { animes } = $props();

	let grid: HTMLDivElement | undefined;

	type RegItem = { el: HTMLDivElement; card: HTMLElement };
	const registry = new Set<RegItem>();

	let raf: number | null = null;
	function scheduleEqualize() {
		if (raf != null) cancelAnimationFrame(raf);
		raf = requestAnimationFrame(() => {
			raf = null;
			equalize();
		});
	}

	function registerTitle(el: HTMLDivElement, card: HTMLElement) {
		const item: RegItem = { el, card };
		registry.add(item);
		scheduleEqualize();
		return () => {
			registry.delete(item);
			scheduleEqualize();
		};
	}

	function equalize() {
		if (!registry.size) return;

		for (const { el } of registry) el.style.minHeight = '0px';

		const rows = new Map<number, HTMLDivElement[]>();
		const EPS = 2;

		const getKey = (top: number) => {
			for (const k of rows.keys()) if (Math.abs(k - top) <= EPS) return k;
			return top;
		};

		for (const { el, card } of registry) {
			const key = getKey(card.offsetTop);
			const group = rows.get(key) ?? [];
			group.push(el);
			rows.set(key, group);
		}

		for (const group of rows.values()) {
			let max = 0;
			for (const el of group) max = Math.max(max, el.scrollHeight);
			for (const el of group) el.style.minHeight = `${max}px`;
		}
	}

	$effect(() => {
		const onResize = () => scheduleEqualize();
		window.addEventListener('resize', onResize, { passive: true });

		const ro = new ResizeObserver(() => scheduleEqualize());
		if (grid) ro.observe(grid);

		for (const img of grid?.querySelectorAll('img') ?? []) {
			if (!img.complete) {
				img.addEventListener('load', scheduleEqualize, { once: true });
				img.addEventListener('error', scheduleEqualize, { once: true });
			}
		}

		scheduleEqualize();

		return () => {
			window.removeEventListener('resize', onResize);
			ro.disconnect();
		};
	});
</script>

<div bind:this={grid} class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 items-stretch">
	{#each animes as anime}
		<AnimeCard {...anime} registerTitle={registerTitle} />
	{/each}
</div>