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

	let prevUrl = $derived.by(() =>
		episode > 1 ? `${basePath}/${episode - 1}` : null
	);
	let nextUrl = $derived.by(() =>
		episode < episodesTotal ? `${basePath}/${episode + 1}` : null
	);
	let allEpisodesUrl = $derived.by(() => basePath);

	function go(url: string | null) {
		if (url) goto(url);
	}

	function goNextFromPlayer() {
		go(nextUrl);
	}
</script>

<section
	class="relative border border-white/10 rounded-3xl px-4 pt-2 sm:pt-3 pb-4 sm:pb-5 bg-gradient-to-b from-white/5 to-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_20px_60px_rgba(0,0,0,0.45)] overflow-hidden"
>
	<div class="mb-3 px-1">
		<div class="flex flex-wrap items-baseline gap-2 sm:gap-3">
			<h2 class="font-extrabold tracking-wide text-[clamp(22px,3.6vw,34px)] leading-tight">
				{title}
			</h2>

			<span
				class="font-semibold text-sm sm:text-[15px] px-2.5 py-1.5 rounded-xl text-white/80 border border-white/10 bg-white/10 backdrop-blur-[2px]"
			>
				Серия {episode}
			</span>
		</div>
	</div>

	<div class="aspect-video w-full rounded-2xl overflow-hidden border border-white/10 bg-black">
		<HlsVideoPlayer
			animeGid={animeGid}
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
			class="btn-custom w-16 h-16 rounded-full flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
			onclick={() => go(prevUrl)}
			aria-label="Предыдущая серия"
			disabled={!prevUrl}
		>
			<svg viewBox="0 0 24 24" class="w-6 h-6" fill="currentColor">
				<path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
			</svg>
		</button>

		<button
			class="btn-custom min-w-40 h-14 px-6 font-bold border border-white/10 text-white/80 bg-white/10 backdrop-blur-sm flex items-center justify-center"
			onclick={() => go(allEpisodesUrl)}
		>
			Все серии
		</button>

		<button
			class="btn-custom w-16 h-16 rounded-full flex items-center justify-center justify-self-end disabled:opacity-60 disabled:cursor-not-allowed"
			onclick={() => go(nextUrl)}
			aria-label="Следующая серия"
			disabled={!nextUrl}
		>
			<svg viewBox="0 0 24 24" class="w-6 h-6" fill="currentColor">
				<path d="m8.59 16.59 4.58-4.59-4.58-4.59L10 6l6 6-6 6z" />
			</svg>
		</button>
	</div>
</section>