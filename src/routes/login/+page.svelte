<script lang="ts">
	import Turnstile from '$lib/components/Turnstile.svelte';
	import Input from '$lib/components/Input.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import { PUBLIC_TURNSTILE_SITE_KEY } from '$env/static/public';
	import { PUBLIC_API_URL } from '$env/static/public';
	import { goto } from '$app/navigation';
	import { auth } from '$lib/stores/auth';

	const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

	let username = $state('');
	let password = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);
	let submitted = $state(false);

	let turnstileToken = $state<string | null>(null);
	let turnstileRef = $state<InstanceType<typeof Turnstile> | null>(null);

	function getUsernameError(value: string): string | null {
		const v = value.trim();

		if (!v) return 'Введите логин';
		if (v.length < 6) return 'Логин должен содержать минимум 6 символов';
		if (v.length > 64) return 'Логин не может быть длиннее 64 символов';
		if (!USERNAME_REGEX.test(v)) return 'Допустимы только латинские буквы, цифры и "_"';

		return null;
	}

	function getPasswordError(value: string): string | null {
		if (!value) return 'Введите пароль';
		if (value.length < 8) return 'Пароль должен содержать минимум 8 символов';
		if (value.length > 64) return 'Пароль не может быть длиннее 64 символов';
		return null;
	}

	const usernameError = $derived(username === '' && !submitted ? null : getUsernameError(username));
	const passwordError = $derived(password === '' && !submitted ? null : getPasswordError(password));

	const canSubmit = $derived(
		!loading && !!turnstileToken && !getUsernameError(username) && !getPasswordError(password)
	);

	$effect(() => {
		if ($auth.token) {
			goto('/');
		}
	});

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		submitted = true;

		if (!canSubmit) return;

		error = null;
		loading = true;

		try {
			const body = new URLSearchParams();
			const cleanUsername = username.trim();

			body.set('username', cleanUsername);
			body.set('password', password);
			body.set('grant_type', 'password');
			body.set('cf_token', turnstileToken!);

			const res = await fetch(PUBLIC_API_URL + '/api/v2/auth/signin', {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body
			});

			const json = await res.json().catch(() => null);

			if (!res.ok) {
				let message = 'Не удалось войти. Попробуйте ещё раз.';

				const detail = json?.detail;

				if (typeof detail === 'string') {
					if (detail === 'Account not found') {
						message = 'Аккаунт не найден. Проверьте логин или пароль.';
					} else {
						message = detail;
					}
				} else if (Array.isArray(detail) && detail.length && detail[0]?.msg) {
					message = detail[0].msg;
				} else if (json?.message) {
					message = json.message;
				} else if (res.status === 404) {
					message = 'Аккаунт не найден. Проверьте логин или пароль.';
				} else if (res.status === 401) {
					message = 'Неверный логин или пароль.';
				}

				turnstileRef?.reset?.();
				turnstileToken = null;

				throw new Error(message);
			}

			const token: string | null = json?.access_token;
			if (!token) {
				throw new Error('Сервер не вернул токен авторизации');
			}

			auth.setToken(token);
			goto('/');
		} catch (err) {
			error = err instanceof Error ? err.message : 'Произошла ошибка. Попробуйте ещё раз.';
		} finally {
			loading = false;
		}
	}
</script>

<Seo title="Вход – AnimeViewer" description="Авторизация в AnimeViewer." noindex={true} />

<section class="mx-auto max-w-screen-sm px-4 py-10">
	<div
		class="rounded-2xl border border-violet-300/20 bg-[#0f0d19] px-5 py-7 shadow-[0_0_28px_rgba(139,109,232,0.22)] sm:px-8 sm:py-9"
	>
		<h1 class="mb-6 text-2xl font-bold sm:text-3xl">Вход</h1>

		{#if error}
			<div
				class="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300"
			>
				{error}
			</div>
		{/if}

		<form class="space-y-4" onsubmit={handleSubmit}>
			<div class="space-y-1.5">
				<label for="username" class="text-xs tracking-wide text-white/60 uppercase">Username</label>
				<Input
					type="text"
					placeholder="Admin"
					bind:value={username}
					name="username"
					ariaLabel="Username"
				/>
				{#if usernameError}
					<p class="mt-1 text-xs text-red-300">{usernameError}</p>
				{/if}
			</div>

			<div class="space-y-1.5">
				<label for="password" class="text-xs tracking-wide text-white/60 uppercase">Пароль</label>
				<Input
					type="password"
					placeholder="Минимум 8 символов"
					bind:value={password}
					name="password"
					ariaLabel="Пароль"
				/>
				{#if passwordError}
					<p class="mt-1 text-xs text-red-300">{passwordError}</p>
				{/if}
			</div>

			<div class="flex justify-center pt-2">
				<div class="w-fit">
					<Turnstile
						bind:this={turnstileRef}
						siteKey={PUBLIC_TURNSTILE_SITE_KEY}
						onToken={(t) => (turnstileToken = t)}
						theme="auto"
					/>
				</div>
			</div>

			{#if submitted && !turnstileToken}
				<p class="mt-2 text-center text-xs text-red-300">Подтвердите, что вы не бот.</p>
			{/if}

			<button
				type="submit"
				class="btn-custom mt-2 w-full justify-center text-sm disabled:cursor-not-allowed disabled:opacity-60 sm:text-base"
				disabled={!canSubmit}
			>
				{#if loading}
					Входим...
				{:else}
					Войти
				{/if}
			</button>
		</form>

		<p class="mt-6 text-center text-xs text-white/60 sm:text-sm">
			Нет аккаунта?
			<a href="/register" class="font-medium text-fuchsia-400 hover:text-fuchsia-300"
				>Зарегистрироваться</a
			>
		</p>
	</div>
</section>

<Footer />
