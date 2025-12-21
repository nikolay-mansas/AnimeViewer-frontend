<script lang="ts">
	import { PUBLIC_API_URL } from '$env/static/public';
	import { onMount, onDestroy } from 'svelte';
	import { auth } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import Hls from 'hls.js';

	import PlayIcon from '@iconify-svelte/material-symbols/play-arrow-rounded';
	import PauseIcon from '@iconify-svelte/material-symbols/pause-rounded';
	import SettingsIcon from '@iconify-svelte/material-symbols/settings-rounded';
	import FullscreenIcon from '@iconify-svelte/material-symbols/fullscreen-rounded';
	import FullscreenExitIcon from '@iconify-svelte/material-symbols/fullscreen-exit-rounded';
	import VolumeUpIcon from '@iconify-svelte/material-symbols/volume-up-rounded';
	import VolumeOffIcon from '@iconify-svelte/material-symbols/volume-off-rounded';

	const DEFAULT_SRC = 'http://localhost:5173/s3/1/hls/master.m3u8';
	const DEFAULT_POSTER = 'http://localhost:5173/s3/1/hls/preview.webp';

	const SPEED_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
	const SPEED_MIN = SPEED_STEPS[0];
	const SPEED_MAX = SPEED_STEPS[SPEED_STEPS.length - 1];
	const SPEED_STEP = SPEED_STEPS.length > 1 ? SPEED_STEPS[1] - SPEED_STEPS[0] : 0.25;

	let {
		src = DEFAULT_SRC,
		poster = DEFAULT_POSTER,
		autoHideMs = 5000,
		opening_start = null,
		opening_end = null,
		end = null,
		onNext = undefined,
		animeGid,
		series
	} = $props<{
		src?: string;
		poster?: string;
		autoHideMs?: number;
		opening_start?: number | null;
		opening_end?: number | null;
		end?: number | null;
		onNext?: () => void;
		animeGid: string;
		series: number;
	}>();

	let playerEl: HTMLDivElement | null = null;
	let videoEl: HTMLVideoElement | null = null;
	let hls: Hls | null = null;

	let playing = $state(false);
	let duration = $state(0);
	let current = $state(0);
	let buffered = $state(0);

	let speed = $state(1);

	let qualities = $state<{ index: number; label: string; bitrate: number; height?: number }[]>([]);
	let quality = $state<'auto' | number>('auto');
	let currentQualityIndex = $state<number | null>(null);

	let audioTracks = $state<{ index: number; label: string }[]>([]);
	let audioTrack = $state<number | null>(null);

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

	let volume = $state(1);
	let muted = $state(false);
	let showVolumeSlider = $state(false);
	let volumeHoverTimeout: ReturnType<typeof setTimeout> | null = null;

	let isScrubbing = $state(false);

	let removeConnectionListener: (() => void) | null = null;

	let netDownlink = $state<number | null>(null);
	let lastAutoCap: number | null = null;

	let watchEnabled = $state(false);
	let watcherGid = $state<string | null>(null);
	let viewingSeconds = $state(0);
	let lastSentAt = $state(0);
	let watchInterval: ReturnType<typeof setInterval> | null = null;

	let resumeFrom = $state<number | null>(null);

	const currentQualityLabel = $derived.by(() => {
		if (!qualities.length) {
			return quality === 'auto' ? 'Auto' : String(quality);
		}

		if (typeof quality === 'number') {
			const q = qualities.find((q) => q.index === quality);
			if (q) {
				const bitrateLabel = `${Math.round(q.bitrate / 1000)} kbps`;
				return q.height ? `${q.height}p • ${bitrateLabel}` : bitrateLabel;
			}
			return `Level ${quality}`;
		}

		if (currentQualityIndex != null) {
			const level = qualities.find((q) => q.index === currentQualityIndex);
			if (level) {
				const bitrateLabel = `${Math.round(level.bitrate / 1000)} kbps`;
				return level.height
					? `Auto • ${level.height}p • ${bitrateLabel}`
					: `Auto • ${bitrateLabel}`;
			}
		}
		return 'Auto';
	});

	const currentAudioLabel = $derived.by(() => {
		if (!audioTracks.length) return '—';
		const idx = audioTrack ?? 0;
		return audioTracks.find((t) => t.index === idx)?.label ?? 'Дорожка';
	});

	const netSpeedLabel = $derived.by(() => {
		if (netDownlink == null) return 'Сеть: неизвестно';
		return `Сеть: ~${netDownlink.toFixed(1)} Мбит/с`;
	});

	const showSkipOpening = $derived(
		opening_start != null &&
			opening_start > 0 &&
			current >= opening_start &&
			current < opening_start + 15
	);
	const showNextButton = $derived(end != null && end > 0 && current >= end && current < end + 15);

	const progressPercent = $derived(!duration ? 0 : Math.min(100, (current / duration) * 100));
	const bufferPercent = $derived(!duration ? 0 : Math.min(100, (buffered / duration) * 100));

	const showLoadingOverlay = $derived(
		!initialOverlay && ((isBuffering && !isScrubbing) || errorMessage)
	);

	async function loadWatcherProgress() {
		if (!animeGid || !Number.isFinite(series)) return;

		const token = auth.getToken();
		if (!token) {
			watchEnabled = false;
			return;
		}

		try {
			const url =
				PUBLIC_API_URL +
				`/api/v2/watcher/?anime_gid=${encodeURIComponent(
					animeGid
				)}&series=${encodeURIComponent(String(series))}`;

			const res = await fetch(url, {
				method: 'GET',
				headers: {
					Authorization: `Bearer ${token}`
				}
			});

			if (res.status === 401 || res.status === 403) {
				handleAuthError();
				return;
			}

			if (res.status === 404) {
				watcherGid = null;
				return;
			}

			if (!res.ok) {
				console.error('Failed to load watcher', res.status);
				return;
			}

			const data = await res.json();

			watcherGid = data.gid ?? null;

			if (typeof data.timecode === 'number' && data.timecode > 0) {
				resumeFrom = data.timecode;
			}

			const savedTeam = data.acting_team as string | undefined;
			if (savedTeam && audioTracks.length && hls) {
				const found = audioTracks.find((t) => t.label === savedTeam);
				if (found) {
					audioTrack = found.index;
					(hls as any).audioTrack = found.index;
				}
			}
		} catch (e) {
			console.error('Error loading watcher', e);
		}
	}

	function getCurrentActingTeam(): string {
		if (!audioTracks.length || audioTrack == null) return 'default';

		const track = audioTracks.find((t) => t.index === audioTrack);
		return track?.label ?? 'default';
	}

	function handleAuthError() {
		watchEnabled = false;
		auth.logout();
		goto('/login');
	}

	function startWatchTimer() {
		if (watchInterval) return;

		watchInterval = setInterval(() => {
			if (!watchEnabled || !videoEl) return;
			if (videoEl.paused || videoEl.ended) return;

			viewingSeconds += 1;
			checkWatcherTick();
		}, 1000);
	}

	function stopWatchTimer() {
		if (watchInterval) {
			clearInterval(watchInterval);
			watchInterval = null;
		}
	}

	function computeWatcherPayload() {
		if (!videoEl) return null;

		const timecode = Math.floor(videoEl.currentTime || 0);

		const total = videoEl.duration || 0;
		const percentage = total > 0 ? Math.round((timecode / total) * 100) : 0;

		const viewedBoundary =
			end && end > 0 ? end - 10 : videoEl.duration ? videoEl.duration - 10 : Infinity;

		const viewed = timecode >= viewedBoundary;

		return {
			timecode,
			percentage,
			viewed,
			acting_team: getCurrentActingTeam()
		};
	}

	async function checkWatcherTick() {
		if (viewingSeconds < 10) return;

		if (viewingSeconds - lastSentAt < 10) return;

		const token = auth.getToken();
		if (!token) {
			watchEnabled = false;
			return;
		}

		const payload = computeWatcherPayload();
		if (!payload) return;

		lastSentAt = viewingSeconds;

		try {
			if (!watcherGid) {
				const res = await fetch(PUBLIC_API_URL + '/api/v2/watcher/', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`
					},
					body: JSON.stringify({
						anime_gid: animeGid,
						acting_team: payload.acting_team,
						series,
						timecode: payload.timecode,
						viewed: payload.viewed,
						percentage: payload.percentage
					})
				});

				if (res.status === 401 || res.status === 403) {
					handleAuthError();
					return;
				}

				if (!res.ok) {
					console.error('Failed to create watcher', res.status);
					return;
				}

				const data = await res.json();
				watcherGid = data.gid ?? watcherGid;
			} else {
				const res = await fetch(PUBLIC_API_URL + `/api/v2/watcher/${watcherGid}`, {
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`
					},
					body: JSON.stringify({
						anime_gid: animeGid,
						acting_team: payload.acting_team,
						series,
						timecode: payload.timecode,
						viewed: payload.viewed,
						percentage: payload.percentage
					})
				});

				if (res.status === 401 || res.status === 403) {
					handleAuthError();
					return;
				}

				if (!res.ok) {
					console.error('Failed to update watcher', res.status);
					return;
				}
			}
		} catch (e) {
			console.error('Failed to send watcher progress', e);
		}
	}

	function minMbpsForLevel(q: { height?: number; bitrate: number }) {
		if (!q.height) return 1;

		if (q.height >= 1080) return 8;
		if (q.height >= 720) return 3.5;
		if (q.height >= 480) return 2;
		return 1;
	}

	function updateQualityByNetwork() {
		if (!hls || !qualities.length) return;
		if (netDownlink == null || netDownlink <= 0) return;
		if (quality !== 'auto') return;

		const downlink = netDownlink;

		let candidates = qualities.filter((q) => downlink >= minMbpsForLevel(q));

		console.log(candidates);

		if (!candidates.length) {
			let lowest = qualities[0];
			for (const q of qualities) {
				if (q.bitrate < lowest.bitrate) lowest = q;
			}
			candidates = [lowest];
		}

		let best = candidates[0];
		for (const c of candidates) {
			if (c.bitrate > best.bitrate) best = c;
		}

		if (lastAutoCap === best.index) return;

		(hls as any).autoLevelCapping = best.index;
		lastAutoCap = best.index;
	}

	function applyInitialQualityCap() {
		updateQualityByNetwork();
	}

	function initHls() {
		if (!videoEl) return;

		if (Hls.isSupported()) {
			hls = new Hls({
				enableWorker: true,
				lowLatencyMode: true,
				startLevel: -1
			});
			hls.loadSource(src);
			hls.attachMedia(videoEl);

			hls.on(Hls.Events.MANIFEST_PARSED, (_, data: any) => {
				qualities = data.levels.map((l: any, i: number) => ({
					index: i,
					label: l.height ? `${l.height}p` : `${Math.round(l.bitrate / 1000)} kbps`,
					bitrate: l.bitrate,
					height: l.height
				}));

				quality = 'auto';
				currentQualityIndex = null;
				lastAutoCap = null;

				applyInitialQualityCap();
			});

			hls.on(Hls.Events.LEVEL_SWITCHED, (_: any, data: any) => {
				currentQualityIndex = typeof data.level === 'number' ? data.level : currentQualityIndex;
			});

			hls.on(Hls.Events.LEVEL_LOADED, () => {
				isBuffering = false;
			});

			hls.on((Hls as any).Events.AUDIO_TRACKS_UPDATED, (_: any, data: any) => {
				const tracks: any[] = data.audioTracks ?? data ?? [];
				audioTracks = tracks.map((t, i) => ({
					index: i,
					label: t.name || t.lang || `Дорожка ${i + 1}`
				}));

				if (typeof (hls as any).audioTrack === 'number') {
					audioTrack = (hls as any).audioTrack;
				} else {
					audioTrack = 0;
					(hls as any).audioTrack = 0;
				}
			});

			hls.on((Hls as any).Events.AUDIO_TRACK_SWITCHED, (_: any, data: any) => {
				const idx =
					typeof data.id === 'number'
						? data.id
						: typeof data.audioTrack === 'number'
							? data.audioTrack
							: null;
				if (idx != null) audioTrack = idx;
			});

			hls.on(Hls.Events.FRAG_LOADED, (_: any, data: any) => {
				let mbps: number | null = null;

				if (hls) {
					const bw = (hls as any).bandwidthEstimate;
					if (typeof bw === 'number' && bw > 0) {
						mbps = bw / 1_000_000;
					}
				}

				if (mbps == null || mbps <= 0) {
					const stats = data?.stats;
					if (stats) {
						const loaded = stats.loaded ?? stats.total;
						const tStart = stats.tfirst ?? stats.trequest;
						const tEnd = stats.tload ?? stats.tbuffered;

						if (
							typeof loaded === 'number' &&
							loaded > 0 &&
							typeof tStart === 'number' &&
							typeof tEnd === 'number' &&
							tEnd > tStart
						) {
							const timeMs = tEnd - tStart;
							const bitsPerSecond = (loaded * 8 * 1000) / timeMs;
							mbps = bitsPerSecond / 1_000_000;
						}
					}
				}

				if (mbps != null && mbps > 0) {
					const alpha = 0.2;
					netDownlink = netDownlink == null ? mbps : netDownlink * (1 - alpha) + mbps * alpha;

					updateQualityByNetwork();

					const currentLevel =
						hls && typeof hls.currentLevel === 'number' ? hls.currentLevel : null;

					const autoCap =
						hls && (hls as any).autoLevelCapping != null ? (hls as any).autoLevelCapping : null;

					const pickedBitrate =
						currentLevel != null && currentLevel >= 0 && currentLevel < qualities.length
							? qualities[currentLevel].bitrate
							: null;

					console.log('[HLS speed/quality]', {
						netDownlink,
						hlsCurrentLevel: currentLevel,
						autoLevelCapping: autoCap,
						pickedLevel: currentLevel,
						pickedBitrate
					});
				}
			});

			hls.on(Hls.Events.ERROR, (_: any, data: any) => {
				if (data.details === 'bufferStalledError') {
					isBuffering = true;
				}

				if (data.fatal) {
					switch (data.type) {
						case Hls.ErrorTypes.NETWORK_ERROR:
							hls?.startLoad();
							isBuffering = true;
							break;
						case Hls.ErrorTypes.MEDIA_ERROR:
							hls?.recoverMediaError();
							isBuffering = true;
							break;
						default:
							errorMessage = 'Не удалось загрузить видео.';
							hls?.destroy();
							hls = null;
							isBuffering = false;
					}
				}
			});
		} else if (videoEl) {
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
		const v = videoEl;

		initHls();

		if (auth.hasToken()) {
			watchEnabled = true;
			loadWatcherProgress();
			startWatchTimer();
		}

		v.volume = volume;
		v.muted = muted;

		v.addEventListener('loadedmetadata', () => {
			duration = v?.duration || 0;

			if (resumeFrom != null && v) {
				const d = v.duration || 0;
				const target = d && resumeFrom > 0 && resumeFrom < d - 1 ? resumeFrom : resumeFrom;

				try {
					v.currentTime = target;
					current = target;
				} catch {}

				resumeFrom = null;
			}
		});

		v.addEventListener('timeupdate', () => {
			current = v?.currentTime || 0;
			const b = v?.buffered;
			if (b && b.length > 0) buffered = b.end(b.length - 1);

			if (v && v.readyState >= 3) {
				isBuffering = false;
			}
		});

		v.addEventListener('play', () => {
			playing = true;
			isBuffering = false;
		});
		v.addEventListener('pause', () => {
			playing = false;
			isBuffering = false;
		});

		v.addEventListener('waiting', () => {
			if (!isScrubbing) isBuffering = true;
		});
		v.addEventListener('canplay', () => (isBuffering = false));
		v.addEventListener('canplaythrough', () => (isBuffering = false));
		v.addEventListener('seeking', () => {
			if (!isScrubbing) isBuffering = true;
		});
		v.addEventListener('seeked', () => {
			if (v.readyState >= 2) {
				isBuffering = false;
			}
		});
		v.addEventListener('stalled', () => {
			if (!isScrubbing) isBuffering = true;
		});
		v.addEventListener('error', () => {
			isBuffering = false;
			if (!errorMessage) {
				errorMessage = 'Ошибка загрузки видео.';
			}
		});

		if (typeof document !== 'undefined') {
			const fullscreenHandler = () => {
				if (!playerEl) {
					isFullscreen = !!document.fullscreenElement;
				} else {
					isFullscreen = document.fullscreenElement === playerEl;
				}
			};
			document.addEventListener('fullscreenchange', fullscreenHandler);

			const keyHandler = (event: KeyboardEvent) => {
				const target = event.target as HTMLElement | null;
				if (
					target &&
					(['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)
				) {
					return;
				}

				const key = event.key;
				const lower = key.toLowerCase();

				if (lower === 'f' || lower === 'а') {
					event.preventDefault();
					showSettings = false;
					toggleFullscreen();
					return;
				}

				if (key === 'ArrowRight' || key === 'ArrowLeft') {
					if (!v || !isFinite(v.duration)) return;
					event.preventDefault();

					const delta = key === 'ArrowRight' ? 10 : -10;
					const next = Math.max(0, Math.min(v.duration || Infinity, (v.currentTime || 0) + delta));
					v.currentTime = next;

					const side = key === 'ArrowRight' ? 'right' : 'left';
					showSeekIndicator(side);
				}
			};

			document.addEventListener('keydown', keyHandler);

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

		if (removeFullscreenListener) removeFullscreenListener();
		if (removeActivityListeners) removeActivityListeners();
		if (removeConnectionListener) removeConnectionListener();

		if (hideControlsTimeout) clearTimeout(hideControlsTimeout);
		if (singleTapTimeout) clearTimeout(singleTapTimeout);
		if (seekTimeout) clearTimeout(seekTimeout);
		if (volumeHoverTimeout) clearTimeout(volumeHoverTimeout);

		stopWatchTimer();
	});

	function scheduleHideControls() {
		if (hideControlsTimeout) clearTimeout(hideControlsTimeout);
		if (!playing || initialOverlay) return;

		hideControlsTimeout = setTimeout(() => {
			controlsVisible = false;
			showSettings = false;

			if (typeof document !== 'undefined') {
				const active = document.activeElement as HTMLElement | null;
				if (active && typeof active.blur === 'function') {
					active.blur();
				}
			}
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

	$effect(() => {
		if (!videoEl) return;
		videoEl.volume = volume;
		videoEl.muted = muted || volume === 0;
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
		if (!videoEl) return;
		videoEl.currentTime = v;
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
			const next = Math.max(0, Math.min(videoEl.duration || Infinity, videoEl.currentTime + delta));
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
			currentQualityIndex = null;
			lastAutoCap = null;
			updateQualityByNetwork();
		} else {
			const idx = Number(v);
			if (Number.isNaN(idx)) return;
			quality = idx;
			hls.currentLevel = idx;
			currentQualityIndex = idx;
		}
	}

	function changeAudioTrack(v: string) {
		if (!hls) return;
		const idx = Number(v);
		if (Number.isNaN(idx)) return;
		audioTrack = idx;
		(hls as any).audioTrack = idx;
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

		showSettings = false;

		if (document.fullscreenElement === playerEl) {
			await document.exitFullscreen();
			isFullscreen = false;
		} else {
			await playerEl.requestFullscreen();
			isFullscreen = true;
		}
	}

	function skipOpening() {
		if (!videoEl || opening_start == null || !(opening_start > 0)) return;
		videoEl.currentTime = opening_end;
	}

	function nextEpisode() {
		if (typeof onNext === 'function') {
			onNext();
		}
	}

	function toggleMute() {
		muted = !muted;
	}

	function onVolumeEnter() {
		if (volumeHoverTimeout) clearTimeout(volumeHoverTimeout);
		volumeHoverTimeout = setTimeout(() => {
			showVolumeSlider = true;
		}, 200);
	}

	function onVolumeLeave() {
		if (volumeHoverTimeout) clearTimeout(volumeHoverTimeout);
		volumeHoverTimeout = setTimeout(() => {
			showVolumeSlider = false;
		}, 200);
	}

	function setScrubbing(v: boolean) {
		isScrubbing = v;
		if (v) {
			isBuffering = false;
		}
	}
</script>

<div bind:this={playerEl} class="player relative h-full w-full overflow-hidden rounded-lg bg-black">
	<video bind:this={videoEl} playsinline {poster} class="video h-full w-full object-cover">
		<track kind="captions" label="No captions" srclang="en" src="data:," />
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
		<button type="button" class="big-play" onclick={startFromOverlay} aria-label="Play video">
			<div class="big-play-bg"></div>
			<div class="big-play-icon">
				<PlayIcon class="h-9 w-9 translate-x-[1px]" />
			</div>
		</button>
	{/if}

	{#if !initialOverlay && showSkipOpening}
		<button type="button" class="skip-opening-btn" onclick={skipOpening}>
			Пропустить заставку
		</button>
	{/if}

	{#if !initialOverlay && showNextButton && typeof onNext === 'function'}
		<button type="button" class="next-episode-btn" onclick={nextEpisode}> Следующая серия </button>
	{/if}

	{#if showLoadingOverlay}
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
				<button type="button" class="btn" onclick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
					{#if playing}
						<PauseIcon class="h-5 w-5" />
					{:else}
						<PlayIcon class="h-5 w-5 translate-x-[1px]" />
					{/if}
				</button>

				<div
					class="volume-control"
					role="group"
					aria-label="Управление громкостью"
					onmouseenter={onVolumeEnter}
					onmouseleave={onVolumeLeave}
				>
					<button
						type="button"
						class="btn volume-btn"
						onclick={toggleMute}
						aria-label={muted || volume === 0 ? 'Включить звук' : 'Выключить звук'}
					>
						{#if muted || volume === 0}
							<VolumeOffIcon class="h-5 w-5" />
						{:else}
							<VolumeUpIcon class="h-5 w-5" />
						{/if}
					</button>

					<div class="volume-slider-wrapper" class:open={showVolumeSlider}>
						<input
							type="range"
							min="0"
							max="100"
							step="1"
							value={Math.round(volume * 100)}
							oninput={(e) => {
								const v = Number((e.currentTarget as HTMLInputElement).value) / 100;
								volume = v;
								if (v > 0) muted = false;
							}}
							aria-label="Громкость"
						/>
					</div>
				</div>

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
						onpointerdown={() => setScrubbing(true)}
						onpointerup={() => setScrubbing(false)}
						onmouseleave={() => setScrubbing(false)}
						ontouchstart={() => setScrubbing(true)}
						ontouchend={() => setScrubbing(false)}
						oninput={(e) => seek(Number((e.target as HTMLInputElement).value))}
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
						class="h-5 w-5"
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
						<FullscreenExitIcon class="h-5 w-5" />
					{:else}
						<FullscreenIcon class="h-5 w-5" />
					{/if}
				</button>
			</div>

			<div class="settings-popover" class:open={showSettings}>
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
							oninput={(e) => changeSpeed(Number((e.currentTarget as HTMLInputElement).value))}
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
						onchange={(e) => changeQuality((e.target as HTMLSelectElement).value)}
						class="quality-select"
						aria-label="Video quality"
					>
						<option value="auto">Auto (рекомендуется)</option>
						{#each qualities as q}
							<option value={q.index}>
								{q.height
									? `${q.height}p • ${Math.round(q.bitrate / 1000)} kbps`
									: `${Math.round(q.bitrate / 1000)} kbps`}
							</option>
						{/each}
					</select>

					<small class="net-info">{netSpeedLabel}</small>
				</div>

				{#if audioTracks.length}
					<div class="block">
						<div class="label-row">
							<div>Озвучка</div>
							<div>{currentAudioLabel}</div>
						</div>

						<select
							class="quality-select"
							value={audioTrack ?? 0}
							onchange={(e) => changeAudioTrack((e.target as HTMLSelectElement).value)}
							aria-label="Audio track"
						>
							{#each audioTracks as track}
								<option value={track.index}>
									{track.label}
								</option>
							{/each}
						</select>
					</div>
				{/if}
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
		width: 100%;
		height: 100%;
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
		font-family:
			system-ui,
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			sans-serif;
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
		grid-template-columns: auto auto auto 1fr auto auto auto;
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

	.volume-control {
		display: flex;
		align-items: center;
		gap: 6px;
		position: relative;
	}

	.volume-btn {
		flex-shrink: 0;
	}

	.volume-slider-wrapper {
		position: absolute;
		bottom: 140%;
		left: 50%;
		transform: translate(-50%, 6px) scale(0.9);
		transform-origin: center bottom;
		width: 120px;
		padding: 4px 8px;
		border-radius: 999px;
		background: color-mix(in oklab, var(--color-gray-700) 75%, black 25%);
		box-shadow: 0 8px 20px rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		opacity: 0;
		pointer-events: none;
		transition:
			opacity 0.18s ease,
			transform 0.18s ease;
		z-index: 3;
	}

	.volume-slider-wrapper.open {
		opacity: 1;
		transform: translate(-50%, 0) scale(1);
		pointer-events: auto;
	}

	.volume-slider-wrapper input[type='range'] {
		width: 100%;
		-webkit-appearance: none;
		appearance: none;
		background: none;
		cursor: pointer;
	}

	.volume-slider-wrapper input[type='range']::-webkit-slider-runnable-track {
		height: 4px;
		background: color-mix(in oklab, var(--color-gray-500) 40%, black 60%);
		border-radius: 999px;
	}

	.volume-slider-wrapper input[type='range']::-moz-range-track {
		height: 4px;
		background: color-mix(in oklab, var(--color-gray-500) 40%, black 60%);
		border-radius: 999px;
	}

	.volume-slider-wrapper input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--color-fuchsia-400);
		box-shadow: 0 0 0 5px rgba(244, 114, 182, 0.35);
		margin-top: -4px;
	}

	.volume-slider-wrapper input[type='range']::-moz-range-thumb {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--color-fuchsia-400);
		border: none;
		box-shadow: 0 0 0 5px rgba(244, 114, 182, 0.35);
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
		background: linear-gradient(90deg, var(--color-violet-500), var(--color-fuchsia-500));
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
		background: color-mix(in oklab, var(--color-gray-700) 90%, black 10%);
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
		border-color: color-mix(in oklab, var(--color-gray-700) 90%, black 10%) transparent transparent
			transparent;
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
		background: color-mix(in oklab, var(--color-gray-700) 70%, black 30%);
		color: var(--color-purple-100);
		border-radius: 8px;
		border: 1px solid var(--color-fuchsia-500);
	}

	.net-info {
		margin-top: 3px;
		font-size: 11px;
		color: var(--color-purple-300);
		opacity: 0.85;
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
		background: radial-gradient(circle at center, rgba(15, 23, 42, 0.3), transparent);
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

	.next-episode-btn,
	.skip-opening-btn {
		position: absolute;
		bottom: 80px;
		z-index: 4;

		padding: 8px 16px;
		border-radius: 999px;
		border: none;

		font-size: 14px;
		font-weight: 700;
		line-height: 1;
		white-space: nowrap;

		color: #f9fafb;
		background: linear-gradient(90deg, var(--color-violet-500), var(--color-fuchsia-500));

		cursor: pointer;
		box-shadow: 0 10px 20px rgba(0, 0, 0, 0.6);
	}

	.next-episode-btn {
		right: 16px;
	}

	.skip-opening-btn {
		left: 16px;
	}
</style>
