<script lang="ts">
	import { goto } from '$app/navigation';
	import HlsVideoPlayer from '$lib/components/HlsVideoPlayer.svelte';

	interface Props {
		animeGid: string;
		title: string;
		episode: number;
		episodesTotal: number;
		basePath: string;
		src: string;
		poster?: string;
		opening_start?: number | null;
		opening_end?: number | null;
		end?: number | null;
	}

	let {
		animeGid,
		title = 'Аниме',
		episode = 1,
		episodesTotal = 1,
		basePath = '/anime/example',
		src,
		poster,
		opening_start = null,
		opening_end = null,
		end = null
	}: Props = $props();

	let prevUrl = $derived.by(() => (episode > 1 ? `${basePath}/${episode - 1}` : null));
	let nextUrl = $derived.by(() => (episode < episodesTotal ? `${basePath}/${episode + 1}` : null));
	let allEpisodesUrl = $derived.by(() => basePath);

	function go(url: string | null) {
		if (url) goto(url);
	}

	function goNextFromPlayer() {
		go(nextUrl);
	}
</script>

<section
	class="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 to-white/[0.03] px-4 pt-2 pb-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_20px_60px_rgba(0,0,0,0.45)] sm:pt-3 sm:pb-5"
>
	<div class="mb-3 px-1">
		<div class="flex flex-wrap items-baseline gap-2 sm:gap-3">
			<h2 class="text-[clamp(22px,3.6vw,34px)] leading-tight font-extrabold tracking-wide">
				{title}
			</h2>

			<span
				class="rounded-xl border border-white/10 bg-white/10 px-2.5 py-1.5 text-sm font-semibold text-white/80 backdrop-blur-[2px] sm:text-[15px]"
			>
				Серия {episode}
			</span>
		</div>
	</div>

	<div class="aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black">
		<HlsVideoPlayer
			{animeGid}
			series={episode}
			{src}
			{poster}
			{opening_start}
			{opening_end}
			{end}
			onNext={goNextFromPlayer}
		/>
	</div>

	<div class="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
		<button
			class="btn-custom flex h-16 w-16 items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-60"
			onclick={() => go(prevUrl)}
			aria-label="Предыдущая серия"
			disabled={!prevUrl}
		>
			<svg viewBox="0 0 24 24" class="h-6 w-6" fill="currentColor">
				<path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
			</svg>
		</button>

		<button
			class="btn-custom flex h-14 min-w-40 items-center justify-center border border-white/10 bg-white/10 px-6 font-bold text-white/80 backdrop-blur-sm"
			onclick={() => go(allEpisodesUrl)}
		>
			Все серии
		</button>

		<button
			class="btn-custom flex h-16 w-16 items-center justify-center justify-self-end rounded-full disabled:cursor-not-allowed disabled:opacity-60"
			onclick={() => go(nextUrl)}
			aria-label="Следующая серия"
			disabled={!nextUrl}
		>
			<svg viewBox="0 0 24 24" class="h-6 w-6" fill="currentColor">
				<path d="m8.59 16.59 4.58-4.59-4.58-4.59L10 6l6 6-6 6z" />
			</svg>
		</button>
	</div>
</section>
