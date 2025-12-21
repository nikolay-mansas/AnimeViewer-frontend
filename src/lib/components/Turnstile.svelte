<script lang="ts">
	import { browser } from '$app/environment';

	type Props = {
		siteKey: string;
		onToken?: (token: string | null) => void;
		theme?: 'auto' | 'light' | 'dark';
		size?: 'normal' | 'compact';
	};

	let { siteKey, onToken, theme = 'auto', size = 'normal' }: Props = $props();

	let container = $state<HTMLDivElement | null>(null);
	let widgetId = $state<string | null>(null);
	let token = $state<string | null>(null);

	declare global {
		interface Window {
			turnstile?: {
				render: (el: HTMLElement, options: Record<string, unknown>) => string;
				reset: (id?: string) => void;
				remove: (id: string) => void;
			};
		}
	}

	let scriptPromise: Promise<void> | null = null;

	function loadScript(): Promise<void> {
		if (!browser) return Promise.resolve();

		// один раз на всё приложение
		if (scriptPromise) return scriptPromise;

		scriptPromise = new Promise<void>((resolve, reject) => {
			// если уже есть — просто резолвим
			const existing = document.querySelector<HTMLScriptElement>('script[data-turnstile="true"]');
			if (existing) {
				resolve();
				return;
			}

			const s = document.createElement('script');
			s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
			s.async = true;
			s.defer = true;
			s.dataset.turnstile = 'true';

			s.onload = () => resolve();
			s.onerror = () => reject(new Error('Не удалось загрузить скрипт Turnstile'));

			document.head.appendChild(s);
		});

		return scriptPromise;
	}

	function setToken(next: string | null) {
		token = next;
		onToken?.(next);
	}

	// публичный метод (можно вызвать через bind:this)
	export function reset() {
		setToken(null);
		if (browser && window.turnstile) {
			// reset без id сбрасывает последний (но надёжнее с id)
			if (widgetId) window.turnstile.reset(widgetId);
			else window.turnstile.reset();
		}
	}

	$effect(() => {
		if (!browser) return;
		if (!container) return;

		let destroyed = false;

		(async () => {
			await loadScript();
			if (destroyed) return;

			if (!window.turnstile) {
				throw new Error('Turnstile API не доступен после загрузки скрипта');
			}

			// очистим контейнер перед render (на всякий)
			container.innerHTML = '';

			const id = window.turnstile.render(container, {
				sitekey: siteKey,
				theme,
				size,
				callback: (t: unknown) => setToken(typeof t === 'string' ? t : null),
				'expired-callback': () => setToken(null),
				'error-callback': () => setToken(null)
			});

			widgetId = id;
		})().catch(() => {
			// если хочешь — пробрось отдельный onError, сейчас просто сбрасываем токен
			setToken(null);
		});

		return () => {
			destroyed = true;
			if (browser && window.turnstile && widgetId) {
				window.turnstile.remove(widgetId);
			}
			widgetId = null;
			setToken(null);
		};
	});
</script>

<div bind:this={container}></div>
