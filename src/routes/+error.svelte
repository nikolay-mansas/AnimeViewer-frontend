<script lang="ts">
	import { page } from '$app/state';

	const status = $derived.by(() => page.status ?? 500);
	const error = $derived.by(() => page.error as (Error & { message?: string }) | null);

	let displayCode = $state('');
	let displayTitle = $state('');
	let displayHint = $state('');
	let isAnimating = $state(false);

	const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-=+/*';

	const finalCode = $derived.by(() => {
		if (status === 404) return '404';
		if (status === 500) return '500';
		if (status) return String(status);
		return '???';
	});

	const finalTitle = $derived.by(() =>
		status === 404
			? 'Страница не найдена'
			: status === 500
				? 'Ошибка сервера'
				: 'Что-то пошло не так'
	);

	const finalHint = $derived.by(() => {
		if (status === 404) {
			return 'Возможно, это адреса не существует или написан не правильно...';
		}
		if (status === 500) {
			return 'Ошибка сервера. Попробуйте обновить страницу чуть позже.';
		}
		return error?.message || 'Попробуйте обновить страницу или вернуться на главную.';
	});

	function scramble(
		target: string,
		setter: (value: string) => void,
		opts?: { duration?: number; steps?: number; delay?: number }
	) {
		const duration = opts?.duration ?? 2200;
		const steps = opts?.steps ?? 32;
		const delay = opts?.delay ?? 0;

		let frame = 0;
		let intervalId: number | undefined;

		const start = () => {
			intervalId = window.setInterval(() => {
				frame++;
				const progress = frame / steps;
				let out = '';

				const stableFrom = Math.floor(target.length * progress * 0.8);

				for (let i = 0; i < target.length; i++) {
					if (i < stableFrom) {
						out += target[i];
					} else {
						out += charset[Math.floor(Math.random() * charset.length)];
					}
				}

				setter(out);

				if (frame >= steps) {
					clearInterval(intervalId);
					setter(target);
				}
			}, duration / steps);
		};

		if (delay > 0) {
			const timeoutId = window.setTimeout(start, delay);
			return () => {
				clearTimeout(timeoutId);
				if (intervalId) clearInterval(intervalId);
			};
		} else {
			start();
			return () => {
				if (intervalId) clearInterval(intervalId);
			};
		}
	}

	$effect(() => {
		if (typeof window === 'undefined') {
			displayCode = finalCode;
			displayTitle = finalTitle;
			displayHint = finalHint;
			isAnimating = false;
			return;
		}

		const code = finalCode;
		const title = finalTitle;
		const hint = finalHint;

		isAnimating = true;
		displayCode = '???';
		displayTitle = 'Загрузка аниме...';
		displayHint = '';

		const cleanupCode = scramble(code, (v) => (displayCode = v), {
			duration: 1800,
			steps: 28
		});

		const cleanupTitle = scramble(title, (v) => (displayTitle = v), {
			duration: 2200,
			steps: 34,
			delay: 250
		});

		const hintTimeout = window.setTimeout(() => {
			displayHint = hint;
		}, 900);

		const stopAnimTimeout = window.setTimeout(() => {
			isAnimating = false;
		}, 2500);

		return () => {
			cleanupCode?.();
			cleanupTitle?.();
			clearTimeout(hintTimeout);
			clearTimeout(stopAnimTimeout);
		};
	});

	function goBack() {
		if (history.length > 1) {
			history.back();
		} else {
			location.href = '/';
		}
	}
</script>

<svelte:head>
	<title>
		{status === 404
			? '404 – Страница не найдена · AnimeViewer'
			: status === 500
				? '500 – Ошибка сервера · AnimeViewer'
				: 'Ошибка · AnimeViewer'}
	</title>
</svelte:head>

<div class="max-w-screen-xl mx-auto px-4 py-12 md:py-16">
	<div class="flex flex-col items-center justify-center min-h-[70vh] gap-8">
		<article
			class="relative w-full max-w-2xl rounded-2xl bg-[#0e0b17]/80 border border-white/10 shadow-[0_0_40px_rgba(124,58,237,0.35)] overflow-hidden"
		>
			<div class="grid grid-cols-1 sm:grid-cols-[minmax(0,160px)_1fr]">
				<div class="relative bg-gradient-to-b from-purple-600/70 via-indigo-700/70 to-slate-900">
					<div class="aspect-[2/3] w-full flex items-center justify-center">
						<div class="text-center">
							<div class="text-[10px] uppercase tracking-[0.25em] text-white/60 mb-1">
								код
							</div>
							<div
								class="text-4xl sm:text-5xl font-black text-white drop-shadow-[0_0_15px_rgba(191,99,255,0.7)] tabular-nums"
							>
								{displayCode}
							</div>
						</div>
					</div>

					<div class="absolute inset-0 pointer-events-none opacity-40 mix-blend-screen" aria-hidden="true">
						<div
							class="absolute inset-0 bg-[radial-gradient(circle_at_0_0,#a855f7_0,transparent_55%),radial-gradient(circle_at_100%_0,#4f46e5_0,transparent_55%)]"
						></div>
						<div
							class="absolute inset-0 bg-[linear-gradient(transparent_0,rgba(0,0,0,0.6)_40%,transparent_100%),repeating-linear-gradient(0deg,rgba(255,255,255,0.08)_0,rgba(255,255,255,0.08)_1px,transparent_1px,transparent_3px)] mix-blend-soft-light"
						></div>
					</div>

					{#if isAnimating}
						<div
							class="absolute bottom-3 left-4 text-[9px] uppercase tracking-[0.25em] text-white/55 flex items-center gap-2"
						>
							<span
								class="h-1 w-6 rounded-full bg-gradient-to-r from-pink-400 via-fuchsia-400 to-purple-400 animate-pulse"
							></span>
							<span>декодирование ошибки</span>
						</div>
					{/if}
				</div>

				<div class="p-4 sm:p-6 flex flex-col gap-4">
					<!-- <p class="text-[11px] uppercase tracking-[0.25em] text-purple-300/70">
						{#if status === 404}
							страница не найдена
						{:else if status === 500}
							сбой сервера
						{:else}
							системная ошибка
						{/if}
					</p> -->

					<h1 class="text-xl sm:text-2xl md:text-3xl font-bold text-white leading-tight">
						{displayTitle}
					</h1>

					<p
						class={`text-sm sm:text-base text-white/70 leading-relaxed whitespace-pre-line transition-all duration-500 ease-out ${
							displayHint ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
						}`}
					>
						{displayHint}
					</p>

					<div class="mt-4 flex flex-wrap gap-3">
						<button type="button" class="btn-custom text-sm sm:text-base" onclick={goBack}>
							Назад
						</button>

						<a
							href="/"
							class="btn-custom text-sm sm:text-base bg-transparent border border-purple-400/60 hover:bg-purple-500/10"
						>
							На главную
						</a>
					</div>
				</div>
			</div>

			<div class="absolute -inset-px pointer-events-none border border-purple-500/10 rounded-2xl"></div>
		</article>

		<!-- <p class="text-xs sm:text-sm text-white/40 text-center max-w-lg">
			Если вы попали сюда из закладок, проверьте, что аниме всё ещё доступно на сайте.
		</p> -->
	</div>
</div>

<style>
	:global(body) {
		background: radial-gradient(
				60% 60% at 10% 0%,
				rgba(41, 18, 80, 0.4),
				transparent
			),
			#0a0a12;
	}
</style>