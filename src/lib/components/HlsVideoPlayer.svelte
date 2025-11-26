<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Hls from 'hls.js';

	import PlayIcon from '@iconify-svelte/material-symbols/play-arrow-rounded';
	import PauseIcon from '@iconify-svelte/material-symbols/pause-rounded';
	import SettingsIcon from '@iconify-svelte/material-symbols/settings-rounded';
	import FullscreenIcon from '@iconify-svelte/material-symbols/fullscreen-rounded';
	import FullscreenExitIcon from '@iconify-svelte/material-symbols/fullscreen-exit-rounded';

	const DEFAULT_SRC =
		'https://files.vidstack.io/sprite-fight/hls/stream.m3u8';

	const DEFAULT_POSTER =
		'https://i.ytimg.com/vi/AZSTT9BLRB8/hq720.jpg?sqp=-oaymwEcCNAFEJQDSFXyq4qpAw4IARUAAIhCGAFwAcABBg==&rs=AOn4CLAzSm4d9RtjDqyyJaVkXXpt5NoPBw';

	// дискретные скорости и метки для ползунка
	const SPEED_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
	const SPEED_MIN = SPEED_STEPS[0];
	const SPEED_MAX = SPEED_STEPS[SPEED_STEPS.length - 1];
	const SPEED_STEP = SPEED_STEPS.length > 1 ? SPEED_STEPS[1] - SPEED_STEPS[0] : 0.25;

	let {
		src = DEFAULT_SRC,
		poster = DEFAULT_POSTER,
		autoHideMs = 5000
	} = $props<{
		src?: string;
		poster?: string;
		autoHideMs?: number;
	}>();

	let playerEl: HTMLDivElement | null = null;
	let videoEl: HTMLVideoElement | null = null;
	let hls: Hls | null = null;

	let playing = $state(false);
	let duration = $state(0);
	let current = $state(0);
	let buffered = $state(0);

	let speed = $state(1);

	let qualities = $state<{ index: number; label: string; bitrate: number }[]>([]);
	let quality = $state<'auto' | number>('auto');
	let currentQualityIndex = $state<number | null>(null);

	let showSettings = $state(false);
	let initialOverlay = $state(true);

	let lastTapTime = 0;
	let lastTapSide: 'left' | 'right' | null = null;
	let singleTapTimeout: ReturnType<typeof setTimeout> | null = null;

	let seekDirection = $state<'left' | 'right' | null>(null);
	let seekTimeout: ReturnType<typeof setTimeout> | null = null;

	let isFullscreen = $state(false);
	let removeFullscreenListener: (() => void) | null = null;

	let controlsVisible = $state(true);
	let hideControlsTimeout: ReturnType<typeof setTimeout> | null = null;
	let removeActivityListeners: (() => void) | null = null;

	let isBuffering = $state(false);
	let errorMessage = $state<string | null>(null);

	let speedActive = $state(false);

	let currentQualityLabel = $derived.by(() => {
		if (!qualities.length) {
			return quality === 'auto' ? 'Auto' : String(quality);
		}

		if (typeof quality === 'number') {
			return (
				qualities.find((q) => q.index === quality)?.label ??
				`Level ${quality}`
			);
		}

		if (currentQualityIndex != null) {
			const level = qualities.find((q) => q.index === currentQualityIndex);
			if (level) return `Auto • ${level.label}`;
		}
		return 'Auto';
	});

	function initHls() {
		if (!videoEl) return;

		if (Hls.isSupported()) {
			hls = new Hls({
				enableWorker: true,
				lowLatencyMode: true,
				startLevel: -1,
				capLevelToPlayerSize: true
			});
			hls.loadSource(src);
			hls.attachMedia(videoEl);

			hls.on(Hls.Events.MANIFEST_PARSED, (_, data: any) => {
				qualities = data.levels.map((l: any, i: number) => ({
					index: i,
					label: l.height
						? `${l.height}p`
						: `${Math.round(l.bitrate / 1000)} kbps`,
					bitrate: l.bitrate
				}));

				quality = 'auto';
				hls!.autoLevelEnabled = true;
				currentQualityIndex = null;
			});

			hls.on(Hls.Events.LEVEL_SWITCHED, (_, data: any) => {
				currentQualityIndex = typeof data.level === 'number' ? data.level : null;
			});

			hls.on(Hls.Events.LEVEL_LOADED, () => {
				isBuffering = false;
			});

			hls.on(Hls.Events.ERROR, (_, data: any) => {
				isBuffering = true;

				if (data.fatal) {
					switch (data.type) {
						case Hls.ErrorTypes.NETWORK_ERROR:
							hls?.startLoad();
							break;
						case Hls.ErrorTypes.MEDIA_ERROR:
							hls?.recoverMediaError();
							break;
						default:
							errorMessage = 'Не удалось загрузить видео.';
							hls?.destroy();
							hls = null;
					}
				}
			});
		} else {
			videoEl.src = src;
		}
	}

	function showSeekIndicator(side: 'left' | 'right') {
		if (seekTimeout) {
			clearTimeout(seekTimeout);
			seekTimeout = null;
		}
		seekDirection = side;
		seekTimeout = setTimeout(() => {
			seekDirection = null;
			seekTimeout = null;
		}, 400);
	}

	onMount(() => {
		if (!videoEl) return;

		initHls();

		videoEl.addEventListener('loadedmetadata', () => {
			duration = videoEl?.duration || 0;
		});

		videoEl.addEventListener('timeupdate', () => {
			current = videoEl?.currentTime || 0;
			const b = videoEl?.buffered;
			if (b && b.length > 0) buffered = b.end(b.length - 1);
		});

		videoEl.addEventListener('play', () => {
			playing = true;
			isBuffering = false;
		});
		videoEl.addEventListener('pause', () => (playing = false));

		videoEl.addEventListener('waiting', () => (isBuffering = true));
		videoEl.addEventListener('canplay', () => (isBuffering = false));
		videoEl.addEventListener('canplaythrough', () => (isBuffering = false));
		videoEl.addEventListener('seeking', () => (isBuffering = true));
		videoEl.addEventListener('seeked', () => (isBuffering = false));
		videoEl.addEventListener('stalled', () => (isBuffering = true));
		videoEl.addEventListener('error', () => {
			isBuffering = false;
			if (!errorMessage) {
				errorMessage = 'Ошибка загрузки видео.';
			}
		});

		if (typeof document !== 'undefined') {
			// следим за фуллскрином
			const fullscreenHandler = () => {
				if (!playerEl) {
					isFullscreen = !!document.fullscreenElement;
				} else {
					isFullscreen = document.fullscreenElement === playerEl;
				}
			};
			document.addEventListener('fullscreenchange', fullscreenHandler);

			// горячие клавиши
			const keyHandler = (event: KeyboardEvent) => {
				const target = event.target as HTMLElement | null;
				if (
					target &&
					(['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
						target.isContentEditable)
				) {
					return;
				}

				const key = event.key;
				const lower = key.toLowerCase();

				// F / А — фуллскрин + закрыть настройки
				if (lower === 'f' || lower === 'а') {
					event.preventDefault();
					showSettings = false;
					toggleFullscreen();
					return;
				}

				// стрелки — +/- 10 сек
				if (key === 'ArrowRight' || key === 'ArrowLeft') {
					if (!videoEl || !isFinite(videoEl.duration)) return;
					event.preventDefault();

					const delta = key === 'ArrowRight' ? 10 : -10;
					const next = Math.max(
						0,
						Math.min(videoEl.duration || Infinity, (videoEl.currentTime || 0) + delta)
					);
					videoEl.currentTime = next;

					const side = key === 'ArrowRight' ? 'right' : 'left';
					showSeekIndicator(side);
				}
			};

			document.addEventListener('keydown', keyHandler);

			// клик вне плеера — закрыть настройки
			const outsideClickHandler = (event: MouseEvent) => {
				if (!showSettings) return;
				if (!playerEl) return;
				const target = event.target as Node | null;
				if (!target) return;
				if (!playerEl.contains(target)) {
					showSettings = false;
				}
			};
			document.addEventListener('pointerdown', outsideClickHandler, true);

			removeFullscreenListener = () => {
				document.removeEventListener('fullscreenchange', fullscreenHandler);
				document.removeEventListener('keydown', keyHandler);
				document.removeEventListener('pointerdown', outsideClickHandler, true);
			};
		}

		if (playerEl) {
			const handleActivity = () => {
				if (initialOverlay) return;
				showControls();
			};

			playerEl.addEventListener('mousemove', handleActivity);
			playerEl.addEventListener('pointermove', handleActivity);
			playerEl.addEventListener('touchstart', handleActivity);
			playerEl.addEventListener('keydown', handleActivity);

			removeActivityListeners = () => {
				playerEl?.removeEventListener('mousemove', handleActivity);
				playerEl?.removeEventListener('pointermove', handleActivity);
				playerEl?.removeEventListener('touchstart', handleActivity);
				playerEl?.removeEventListener('keydown', handleActivity);
			};
		}
	});

	onDestroy(() => {
		hls?.destroy();
		removeFullscreenListener?.();
		removeActivityListeners?.();
		if (hideControlsTimeout) clearTimeout(hideControlsTimeout);
		if (singleTapTimeout) clearTimeout(singleTapTimeout);
		if (seekTimeout) clearTimeout(seekTimeout);
	});

	function scheduleHideControls() {
		if (hideControlsTimeout) clearTimeout(hideControlsTimeout);
		if (!playing || initialOverlay) return;
		hideControlsTimeout = setTimeout(() => {
			controlsVisible = false;
		}, autoHideMs);
	}

	function showControls() {
		controlsVisible = true;
		scheduleHideControls();
	}

	$effect(() => {
		if (!initialOverlay && playing) {
			controlsVisible = true;
			scheduleHideControls();
		} else {
			controlsVisible = true;
			if (hideControlsTimeout) {
				clearTimeout(hideControlsTimeout);
				hideControlsTimeout = null;
			}
		}
	});

	function toggle() {
		if (!videoEl) return;
		if (videoEl.paused) {
			videoEl.play();
		} else {
			videoEl.pause();
		}
	}

	function seek(v: number) {
		if (videoEl) videoEl.currentTime = v;
	}

	function tap(e: MouseEvent) {
		if (initialOverlay) return;
		if (!videoEl) return;

		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const side = e.clientX < rect.width / 2 ? 'left' : 'right';
		const now = Date.now();
		const double = now - lastTapTime < 300 && side === lastTapSide;

		if (double) {
			if (singleTapTimeout) {
				clearTimeout(singleTapTimeout);
				singleTapTimeout = null;
			}

			const delta = side === 'left' ? -10 : 10;
			const next = Math.max(
				0,
				Math.min(videoEl.duration || Infinity, videoEl.currentTime + delta)
			);
			videoEl.currentTime = next;

			showSeekIndicator(side);
		} else {
			lastTapTime = now;
			lastTapSide = side;

			if (singleTapTimeout) {
				clearTimeout(singleTapTimeout);
			}
			singleTapTimeout = setTimeout(() => {
				singleTapTimeout = null;
				toggle();
			}, 250);
		}
	}

	function changeSpeed(v: number) {
		speed = v;
		if (videoEl) videoEl.playbackRate = v;
	}

	function changeQuality(v: string) {
		if (!hls) return;
		if (v === 'auto') {
			quality = 'auto';
			hls.currentLevel = -1;
			hls.autoLevelEnabled = true;
		} else {
			const idx = Number(v);
			quality = idx;
			hls.currentLevel = idx;
			hls.autoLevelEnabled = false;
			currentQualityIndex = idx;
		}
	}

	function t(sec: number) {
		if (!isFinite(sec) || sec < 0) return '0:00';
		const m = Math.floor(sec / 60);
		const s = Math.floor(sec % 60);
		return `${m}:${s.toString().padStart(2, '0')}`;
	}

	function startFromOverlay() {
		initialOverlay = false;
		errorMessage = null;
		isBuffering = true;
		if (videoEl) {
			const p = videoEl.play();
			if (p && typeof p.then === 'function') {
				p.catch(() => {
					isBuffering = false;
				});
			}
		}
	}

	async function toggleFullscreen() {
		if (typeof document === 'undefined') return;
		if (!playerEl) return;

		// при входе/выходе из фуллскрина закрываем настройки
		showSettings = false;

		if (document.fullscreenElement === playerEl) {
			await document.exitFullscreen();
			isFullscreen = false;
		} else {
			await playerEl.requestFullscreen();
			isFullscreen = true;
		}
	}

	const progressPercent = $derived(
		!duration ? 0 : Math.min(100, (current / duration) * 100)
	);
	const bufferPercent = $derived(
		!duration ? 0 : Math.min(100, (buffered / duration) * 100)
	);
</script>

<div
	bind:this={playerEl}
	class="player relative w-full max-w-4xl aspect-video rounded-lg overflow-hidden bg-black"
>
	<video
		bind:this={videoEl}
		playsinline
		poster={poster}
		class="video w-full h-full object-cover"
	>
		<track
			kind="captions"
			label="English"
			srclang="en"
			src="/captions/example.vtt"
		/>
	</video>

	<button
		type="button"
		class="tap absolute inset-0"
		class:disabled={initialOverlay}
		onclick={tap}
		aria-label="Toggle playback by double-clicking"
	></button>

	{#if seekDirection === 'left'}
		<div class="seek-indicator left">
			<div class="bubble">
				<span>« 10s</span>
			</div>
		</div>
	{:else if seekDirection === 'right'}
		<div class="seek-indicator right">
			<div class="bubble">
				<span>10s »</span>
			</div>
		</div>
	{/if}

	{#if initialOverlay}
		<button
			type="button"
			class="big-play"
			onclick={startFromOverlay}
			aria-label="Play video"
		>
			<div class="big-play-bg"></div>
			<div class="big-play-icon">
				<PlayIcon class="w-9 h-9 translate-x-[1px]" />
			</div>
		</button>
	{/if}

	{#if !initialOverlay && (isBuffering || errorMessage)}
		<div class="loading-overlay">
			{#if isBuffering && !errorMessage}
				<div class="spinner"></div>
				<span>Загрузка видео…</span>
			{:else if errorMessage}
				<span class="error-text">{errorMessage}</span>
			{/if}
		</div>
	{/if}

	{#if showSettings}
		<button
			type="button"
			class="settings-backdrop"
			onclick={() => (showSettings = false)}
			aria-label="Close settings"
		></button>
	{/if}

	{#if !initialOverlay}
		<div class="controls" class:controls-hidden={!controlsVisible}>
			<div class="row">
				<button
					type="button"
					class="btn"
					onclick={toggle}
					aria-label={playing ? 'Pause' : 'Play'}
				>
					{#if playing}
						<PauseIcon class="w-5 h-5" />
					{:else}
						<PlayIcon class="w-5 h-5 translate-x-[1px]" />
					{/if}
				</button>

				<div class="time">{t(current)}</div>

				<div class="progress-wrapper">
					<div class="track">
						<div class="buf" style={`width:${bufferPercent}%`}></div>
						<div class="cur" style={`width:${progressPercent}%`}></div>
					</div>
					<input
						type="range"
						min="0"
						max={duration}
						step="0.1"
						value={current}
						oninput={(e) =>
							seek(Number((e.target as HTMLInputElement).value))}
						aria-label="Seek"
					/>
				</div>

				<div class="time">{t(duration)}</div>

				<button
					type="button"
					class="btn settings-btn"
					class:open={showSettings}
					onclick={() => (showSettings = !showSettings)}
					aria-label="Settings"
				>
					<SettingsIcon
						class="w-5 h-5"
						style={showSettings ? 'animation: gear-spin 0.5s linear' : ''}
					/>
				</button>

				<button
					type="button"
					class="btn"
					onclick={toggleFullscreen}
					aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
				>
					{#if isFullscreen}
						<FullscreenExitIcon class="w-5 h-5" />
					{:else}
						<FullscreenIcon class="w-5 h-5" />
					{/if}
				</button>
			</div>

			<div class="settings-popover {showSettings ? 'open' : ''}">
				<div class="block">
					<div class="label-row">
						<div>Speed</div>
						<div>{speed === 1 ? 'Normal' : `${speed}×`}</div>
					</div>

					<div class="speed-slider" class:speed-active={speedActive}>
						<div class="speed-track-wrap">
							<div class="speed-track speed-track-base"></div>

							<div class="speed-track speed-track-ruler">
								<div class="speed-steps">
									{#each SPEED_STEPS as _, index}
										<div class="speed-step"></div>
									{/each}
								</div>
							</div>
						</div>

						<input
							class="speed-range"
							type="range"
							min={SPEED_MIN}
							max={SPEED_MAX}
							step={SPEED_STEP}
							value={speed}
							oninput={(e) =>
								changeSpeed(Number((e.currentTarget as HTMLInputElement).value))
							}
							onpointerdown={() => (speedActive = true)}
							onpointerup={() => (speedActive = false)}
							onmouseleave={() => (speedActive = false)}
							ontouchstart={() => (speedActive = true)}
							ontouchend={() => (speedActive = false)}
							onblur={() => (speedActive = false)}
							aria-label="Playback speed"
						/>
					</div>
				</div>

				<div class="block">
					<div class="label-row">
						<div>Quality</div>
						<div>{currentQualityLabel}</div>
					</div>

					<select
						onchange={(e) =>
							changeQuality((e.target as HTMLSelectElement).value)}
						class="quality-select"
						aria-label="Video quality"
					>
						<option value="auto">Auto</option>
						{#each qualities as q}
							<option value={q.index}>
								{q.label}
							</option>
						{/each}
					</select>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.tap.disabled {
		pointer-events: none;
	}

	.player {
		position: relative;
	}

	.controls {
		position: absolute;
		bottom: 0;
		width: 100%;
		padding: 12px 14px;
		background: linear-gradient(
			to top,
			color-mix(in oklab, var(--color-gray-700) 55%, transparent 45%),
			transparent
		);
		font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		color: var(--color-purple-100);
		opacity: 1;
		transition: opacity 0.25s ease;
	}

	.controls-hidden {
		opacity: 0;
		pointer-events: none;
	}

	.row {
		display: grid;
		grid-template-columns: auto auto 1fr auto auto auto;
		gap: 10px;
		align-items: center;
	}

	.btn {
		width: 34px;
		height: 34px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
		border-radius: 999px;
		background: var(--color-gray-700);
		color: var(--color-purple-100);
		font-size: 14px;
		cursor: pointer;
		transition:
			background 0.15s ease,
			transform 0.15s ease,
			box-shadow 0.15s ease;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.45);
	}

	.btn:hover {
		background: var(--color-fuchsia-500);
		transform: translateY(-1px);
		box-shadow: 0 8px 20px rgba(0, 0, 0, 0.7);
	}

	.progress-wrapper {
		position: relative;
		height: 20px;
	}

	.track {
		position: absolute;
		top: 50%;
		left: 0;
		right: 0;
		height: 4px;
		transform: translateY(-50%);
		background: color-mix(in oklab, var(--color-gray-500) 35%, black 65%);
		border-radius: 999px;
		overflow: hidden;
	}

	.buf {
		position: absolute;
		height: 100%;
		background: color-mix(in oklab, var(--color-purple-300) 40%, black 60%);
	}

	.cur {
		position: absolute;
		height: 100%;
		background: linear-gradient(
			90deg,
			var(--color-violet-500),
			var(--color-fuchsia-500)
		);
	}

	.progress-wrapper input[type='range'] {
		position: absolute;
		inset: 0;
		background: none;
		-webkit-appearance: none;
		appearance: none;
		cursor: pointer;
	}

	.progress-wrapper input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: var(--color-fuchsia-400);
		box-shadow: 0 0 0 6px rgba(244, 114, 182, 0.35);
	}

	.progress-wrapper input[type='range']::-moz-range-thumb {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: var(--color-fuchsia-400);
		border: none;
		box-shadow: 0 0 0 6px rgba(244, 114, 182, 0.35);
	}

	.progress-wrapper input[type='range']::-moz-range-track {
		height: 4px;
		background: transparent;
	}

	.time {
		font-size: 12px;
		color: var(--color-purple-200);
	}

	.big-play {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		border: none;
		background: transparent;
		cursor: pointer;
		z-index: 3;
	}

	.big-play-bg {
		width: 72px;
		height: 72px;
		border-radius: 999px;
		background: radial-gradient(
			circle at 30% 30%,
			var(--color-purple-200),
			var(--color-violet-500)
		);
		opacity: 0.85;
	}

	.big-play-icon {
		position: absolute;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-purple-400);
	}

	.seek-indicator {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		z-index: 2;
		pointer-events: none;
	}

	.seek-indicator.left {
		left: 8%;
	}

	.seek-indicator.right {
		right: 8%;
	}

	.seek-indicator .bubble {
		min-width: 70px;
		padding: 8px 12px;
		border-radius: 999px;
		background: var(--color-gray-700);
		color: var(--color-fuchsia-200);
		display: inline-flex;
		justify-content: center;
		align-items: center;
		font-size: 14px;
		animation: seek-pop 0.4s ease-out;
	}

	@keyframes seek-pop {
		0% {
			transform: scale(0.6);
			opacity: 0;
		}
		40% {
			transform: scale(1.05);
			opacity: 1;
		}
		100% {
			transform: scale(1);
			opacity: 0;
		}
	}

	.settings-btn {
		position: relative;
	}

	@keyframes gear-spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(180deg);
		}
	}

	.settings-popover {
		position: absolute;
		right: 14px;
		bottom: 56px;
		width: 220px;
		background: color-mix(
			in oklab,
			var(--color-gray-700) 90%,
			black 10%
		);
		border-radius: 12px;
		padding: 12px;
		box-shadow: 0 12px 30px rgba(0, 0, 0, 0.6);
		opacity: 0;
		transform: translateY(12px) scale(0.96);
		pointer-events: none;
		transition:
			opacity 0.18s ease,
			transform 0.18s ease;
		z-index: 5;
	}

	.settings-popover.open {
		opacity: 1;
		transform: translateY(0) scale(1);
		pointer-events: auto;
	}

	.settings-popover::after {
		content: '';
		position: absolute;
		bottom: -6px;
		right: 18px;
		border-width: 6px;
		border-style: solid;
		border-color: color-mix(
				in oklab,
				var(--color-gray-700) 90%,
				black 10%
			)
			transparent transparent transparent;
	}

	.block {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.block + .block {
		margin-top: 10px;
	}

	.label-row {
		display: flex;
		justify-content: space-between;
		font-size: 13px;
		color: var(--color-purple-200);
	}

	/* === СКОРОСТЬ: линейка только пока actively меняем === */

	.speed-slider {
		position: relative;
		width: 100%;
		height: 24px;
		margin-top: 6px;
	}

	.speed-track-wrap {
		position: absolute;
		left: 0;
		right: 0;
		top: 50%;
		height: 5px;
		transform: translateY(-50%);
		border-radius: 999px;
		overflow: hidden;
		pointer-events: none;
	}

	.speed-track {
		position: absolute;
		inset: 0;
		border-radius: inherit;
	}

	.speed-track-base {
		background: rgba(255, 255, 255, 0.9);
		opacity: 1;
		transition: opacity 0.25s ease;
	}

	.speed-track-ruler {
		background: rgba(148, 163, 184, 0.45);
		opacity: 0;
		transition: opacity 0.25s ease;
	}

	.speed-steps {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: stretch;
		justify-content: space-between;
		padding-inline: 2px;
		pointer-events: none;
	}

	.speed-step {
		width: 2px;
		background: rgba(255, 255, 255, 0.95);
		opacity: 0;
		border-radius: 999px;
		transition: opacity 0.25s ease;
	}

	/* Активный режим — когда юзер двигает ползунок */
	.speed-slider.speed-active .speed-track-base {
		opacity: 0;
	}

	.speed-slider.speed-active .speed-track-ruler,
	.speed-slider.speed-active .speed-step {
		opacity: 1;
	}

	.speed-range {
		position: absolute;
		inset: 0;
		width: 100%;
		margin: 0;
		background: none;
		-webkit-appearance: none;
		appearance: none;
		cursor: pointer;
	}

	.speed-range::-webkit-slider-runnable-track {
		height: 5px;
		background: transparent;
	}

	.speed-range::-moz-range-track {
		height: 5px;
		background: transparent;
	}

	.speed-range::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: var(--color-fuchsia-400);
		box-shadow: 0 0 0 6px rgba(232, 121, 249, 0.35);
		margin-top: -4.5px;
	}

	.speed-range::-moz-range-thumb {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: var(--color-fuchsia-400);
		border: none;
		box-shadow: 0 0 0 6px rgba(232, 121, 249, 0.35);
	}

	.quality-select {
		width: 100%;
		margin-top: 4px;
		padding: 6px 10px;
		font-size: 14px;
		background: color-mix(
			in oklab,
			var(--color-gray-700) 70%,
			black 30%
		);
		color: var(--color-purple-100);
		border-radius: 8px;
		border: 1px solid var(--color-fuchsia-500);
	}

	.settings-backdrop {
		position: absolute;
		inset: 0;
		z-index: 4;
		background: transparent;
		border: none;
		cursor: pointer;
	}

	.loading-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		background: radial-gradient(
			circle at center,
			rgba(15, 23, 42, 0.3),
			transparent
		);
		z-index: 4;
		color: var(--color-purple-100);
		font-size: 14px;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
	}

	.spinner {
		width: 28px;
		height: 28px;
		border-radius: 999px;
		border: 3px solid rgba(148, 163, 184, 0.4);
		border-top-color: var(--color-fuchsia-400);
		animation: spin 0.9s linear infinite;
	}

	.error-text {
		color: var(--color-pink-300);
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>