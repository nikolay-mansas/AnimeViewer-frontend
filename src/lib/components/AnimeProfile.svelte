<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { PUBLIC_API_URL } from '$env/static/public';
	import { auth } from '$lib/stores/auth';

	type EpisodesWatched = Record<number, { progress: number; viewed: boolean }>;

	type WatcherItem = {
		series: number;
		viewed: boolean;
		percentage: number;
	};

	type WatcherResponse = {
		result: WatcherItem[];
	};

	type AnimeTitle = {
		gid: string;
		anime_gid: string;
		language: string;
		name: string;
		created_at: string;
		updated_at: string;
	};

	interface Props {
		title: string;
		titleJp: string;
		titles: AnimeTitle[];
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
		titles,
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

	let showAltTitles = $state(false);
	const altTitles = titles;

	function openEpisode(ep: number) {
		goto(`/anime/${titleJp}/${ep}`);
	}

	const epNumbers = Array.from({ length: episodes }, (_, i) => i + 1);

	onMount(async () => {
		if (!auth.hasToken()) return;

		const token = auth.getToken();
		if (!token) return;

		try {
			const res = await fetch(`${PUBLIC_API_URL}/api/v2/watcher/anime/${animeGid}`, {
				headers: {
					Authorization: `Bearer ${token}`,
					accept: 'application/json'
				}
			});

			if (!res.ok) return;

			const json = (await res.json()) as WatcherResponse;

			episodesWatchedClient = Object.fromEntries(
				(json.result ?? []).map((item) => [
					item.series,
					{ progress: item.percentage, viewed: item.viewed }
				])
			);
		} catch {}
	});
</script>

<article class="anime-profile mx-auto max-w-screen-xl p-4 sm:p-6">
	<div class="grid grid-cols-1 gap-5 sm:grid-cols-[auto_1fr] sm:gap-7">
		<div class="relative">
			<img
				src={imageUrl}
				alt={title}
				class="w-full rounded-xl object-cover shadow-[0_0_22px_rgba(139,109,232,0.18)] sm:w-60 md:w-64"
			/>
		</div>

		<div class="flex flex-col gap-5">
			<section
				class="rounded-2xl border border-white/10 bg-[#0e0b17]/70 p-4 backdrop-blur-sm sm:p-5"
			>
				<header class="mb-3">
					<h2 class="text-2xl font-bold tracking-wide text-white sm:text-3xl">{title}</h2>
					<p class="text-base text-purple-300/90 italic sm:text-lg">{titleJp}</p>
					{#if end_date}
						<p class="mt-2 mb-4 text-sm text-white/70">
							{start_date} - {end_date} · {episodes} эпизодов
						</p>
					{:else}
						<p class="mt-2 mb-4 text-sm text-white/70">{start_date} · {episodes} эпизодов</p>
					{/if}
				</header>

				<div class="mb-3">
					<p class="text-1xl mb-2 tracking-wider text-white/80">Жанры</p>
					<div class="flex flex-wrap gap-2">
						{#each genres as genre}
							<span class="rounded-full bg-[#1a112f] px-3 py-1 text-xs text-pink-200 sm:text-sm">
								{genre}
							</span>
						{/each}
					</div>
					{#if altTitles && altTitles.length}
						<div class="mt-1 sm:mt-2">
							<button
								type="button"
								class="inline-flex items-center gap-1 text-xs text-purple-300/80 transition-colors hover:text-purple-200 sm:text-sm"
								onclick={() => (showAltTitles = !showAltTitles)}
							>
								<span>
									{showAltTitles ? 'Альтернативные названия' : 'Альтернативные названия'}
								</span>
								<svg
									class={`h-3 w-3 transition-transform duration-200 sm:h-3.5 sm:w-3.5 ${showAltTitles ? 'rotate-180' : ''}`}
									viewBox="0 0 20 20"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
									aria-hidden="true"
								>
									<path
										d="M5 7.5L10 12.5L15 7.5"
										stroke="currentColor"
										stroke-width="1.6"
										stroke-linecap="round"
										stroke-linejoin="round"
									/>
								</svg>
							</button>

							{#if showAltTitles}
								<ul class="mt-1.5 space-y-0.5 text-xs text-purple-100/90 sm:mt-2 sm:text-sm">
									{#each altTitles as alt}
										<li class="flex flex-wrap items-baseline gap-1 sm:gap-1.5">
											{#if alt.language}
												<span
													class="rounded-full bg-white/5 px-1.5 py-0.5 text-[9px] tracking-wide text-purple-300/70 uppercase sm:text-[10px]"
												>
													{alt.language}
												</span>
											{/if}
											<span class="break-words">
												{alt.name}
											</span>
										</li>
									{/each}
								</ul>
							{/if}
						</div>
					{/if}
				</div>
				<p class="leading-relaxed text-white/80">
					{description}
				</p>
			</section>

			<section
				class="rounded-2xl border border-white/10 bg-[#0e0b17]/70 p-4 backdrop-blur-sm sm:p-5"
			>
				<h3 class="mb-3 text-lg font-semibold text-white">Серии</h3>

				<div class="grid grid-cols-[repeat(auto-fit,minmax(88px,1fr))] gap-3">
					{#each epNumbers as ep}
						<button
							class={`group episode-card min-h-[88px] min-w-[88px] rounded-xl border text-[clamp(12px,0.9vw,14px)] transition-all duration-200
								${
									episodesWatchedClient[ep]?.progress === 100
										? 'border-purple-400/25 bg-purple-400/10 text-white'
										: 'border-violet-300/20 bg-[#14101e] text-white/90 hover:bg-[#191428]'
								}
							`}
							aria-label={`Открыть серию ${ep}`}
							onclick={() => openEpisode(ep)}
						>
							<div class="flex h-full w-full flex-col items-center justify-center px-2">
								<div class="text-sm font-semibold">Эп. {ep}</div>

								{#if episodesWatchedClient[ep]?.progress === 100 || episodesWatchedClient[ep]?.viewed}
									<div
										class="mt-2 text-center text-[clamp(11px,0.75vw,13px)] leading-tight text-white/70"
									>
										просмотрено
									</div>
								{:else if episodesWatchedClient[ep]?.progress > 0 && episodesWatchedClient[ep]?.progress < 100}
									<div class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#261d42]">
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
