<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { PUBLIC_API_URL } from '$env/static/public';
	import { auth } from '$lib/stores/auth';

	type EpisodesWatched = Record<number, { progress: number, viewed: boolean; }>;

	type WatcherItem = {
		series: number;
		viewed: boolean;
		percentage: number;
	};

	type WatcherResponse = {
		result: WatcherItem[];
	};

	interface Props {
		title: string;
		titleJp: string;
		start_date: number;
		end_date: number | null;
		episodes: number;
		imageUrl: string;
		genres: string[];
		description: string;
		episodesWatched?: EpisodesWatched;
		animeGid: string;
	}

	let {
		title,
		titleJp,
		start_date,
		end_date,
		episodes,
		imageUrl,
		genres = [],
		description,
		episodesWatched = {},
		animeGid
	}: Props = $props();

	let episodesWatchedClient = $state<EpisodesWatched>({ ...episodesWatched });

	function openEpisode(ep: number) {
		goto(`/anime/${titleJp}/${ep}`);
	}

	const epNumbers = Array.from({ length: episodes }, (_, i) => i + 1);

	onMount(async () => {
		if (!auth.hasToken()) return;

		const token = auth.getToken();
		if (!token) return;

		try {
			const res = await fetch(
				`${PUBLIC_API_URL}/api/v2/watcher/anime/${animeGid}`,
				{
					headers: {
						Authorization: `Bearer ${token}`,
						accept: 'application/json'
					}
				}
			);

			if (!res.ok) return;

			const json = (await res.json()) as WatcherResponse;

			episodesWatchedClient = Object.fromEntries(
				(json.result ?? []).map((item) => [
					item.series,
					{ progress: item.percentage, viewed: item.viewed }
				])
			);
			console.log(episodesWatchedClient);
		} catch {
		}
	});
</script>

<article class="anime-profile max-w-screen-xl mx-auto p-4 sm:p-6">
	<div class="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-5 sm:gap-7">
		<div class="relative">
			<img
				src={imageUrl}
				alt={title}
				class="w-full sm:w-60 md:w-64 rounded-xl object-cover shadow-[0_0_22px_rgba(139,109,232,0.18)]"
			/>
		</div>

		<div class="flex flex-col gap-5">
			<section class="rounded-2xl border border-white/10 bg-[#0e0b17]/70 backdrop-blur-sm p-4 sm:p-5">
				<header class="mb-3">
					<h2 class="text-2xl sm:text-3xl font-bold text-white tracking-wide">{title}</h2>
					<p class="text-base sm:text-lg text-purple-300/90 italic">{titleJp}</p>
					{#if end_date}
						<p class="text-sm text-white/70 mt-2 mb-4">{start_date} - {end_date} · {episodes} эпизодов</p>
					{:else}
						<p class="text-sm text-white/70 mt-2 mb-4">{start_date} · {episodes} эпизодов</p>
					{/if}
				</header>

				<div class="mb-3">
					<p class="text-1xl tracking-wider text-white/80 mb-2">Жанры</p>
					<div class="flex flex-wrap gap-2">
						{#each genres as genre}
							<span class="bg-[#1a112f] text-pink-200 text-xs sm:text-sm px-3 py-1 rounded-full">
								{genre}
							</span>
						{/each}
					</div>
				</div>

				<p class="text-white/80 leading-relaxed">
					{description}
				</p>
			</section>

			<section class="rounded-2xl border border-white/10 bg-[#0e0b17]/70 backdrop-blur-sm p-4 sm:p-5">
				<h3 class="text-lg font-semibold mb-3 text-white">Серии</h3>

				<div
					class="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-3"
				>
					{#each epNumbers as ep}
						<button
							class={`group episode-card rounded-xl border transition-all duration-200
								${episodesWatchedClient[ep]?.progress === 100
									? 'border-purple-400/25 bg-purple-400/10 text-white'
									: 'border-violet-300/20 bg-[#14101e] text-white/90 hover:bg-[#191428]'
								}
							`}
							style="height: 88px"
							aria-label={`Открыть серию ${ep}`}
							onclick={() => openEpisode(ep)}
						>
							<div class="h-full w-full flex flex-col items-center justify-center px-2">
								<div class="text-sm font-semibold">Эп. {ep}</div>

								{#if episodesWatchedClient[ep]?.progress === 100 || episodesWatchedClient[ep]?.viewed}
									<div class="mt-2 text-[13px] text-white/70">просмотрено</div>
								{:else if episodesWatchedClient[ep]?.progress > 0 && episodesWatchedClient[ep]?.progress < 100}
									<div class="mt-2 w-full h-1.5 bg-[#261d42] rounded-full overflow-hidden">
										<div
											class="h-full rounded-full bg-gradient-to-r from-pink-300 via-fuchsia-300 to-violet-300 transition-all duration-300"
											style="width: {episodesWatchedClient[ep].progress}%"
										></div>
									</div>
								{/if}
							</div>
						</button>
					{/each}
				</div>
			</section>
		</div>
	</div>
</article>

<style>
	.anime-profile {
		background: radial-gradient(60% 60% at 10% 0%, rgba(20, 16, 30, 0.7), transparent);
	}
</style>