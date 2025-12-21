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

	function setToken(next: string | null) {
		token = next;
		onToken?.(next);
	}

	let scriptPromise: Promise<void> | null = null;

	function loadScript(): Promise<void> {
		if (!browser) return Promise.resolve();
		if (scriptPromise) return scriptPromise;

		scriptPromise = new Promise<void>((resolve, reject) => {
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

	export function reset() {
		setToken(null);
		const api = window.turnstile;
		if (browser && api) {
			if (widgetId) api.reset(widgetId);
			else api.reset();
		}
	}

	$effect(() => {
		if (!browser) return;
		if (!container) return;

		let destroyed = false;

		(async () => {
			await loadScript();
			if (destroyed) return;

			const api = window.turnstile;
			if (!api) throw new Error('Turnstile API не доступен после загрузки скрипта');

			container.innerHTML = '';

			const id = api.render(container, {
				sitekey: siteKey,
				theme,
				size,
				callback: (t: unknown) => setToken(typeof t === 'string' ? t : null),
				'expired-callback': () => setToken(null),
				'error-callback': () => setToken(null)
			});

			widgetId = id;
		})().catch(() => {
			setToken(null);
		});

		return () => {
			destroyed = true;
			const api = window.turnstile;
			if (browser && api && widgetId) api.remove(widgetId);
			widgetId = null;
			setToken(null);
		};
	});
</script>

<div bind:this={container}></div>
