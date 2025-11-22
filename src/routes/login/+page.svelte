<script lang="ts">
	import Input from '$lib/components/Input.svelte';
	import { goto } from '$app/navigation';
	import { PUBLIC_API_URL } from '$env/static/public';
	import { auth } from '$lib/stores/auth';

	const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

	let username = $state('');
	let password = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);
	let submitted = $state(false);

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

	const usernameError = $derived(
		username === '' && !submitted ? null : getUsernameError(username)
	);
	const passwordError = $derived(
		password === '' && !submitted ? null : getPasswordError(password)
	);

	const canSubmit = $derived(
		!loading &&
		!getUsernameError(username) &&
		!getPasswordError(password)
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

				throw new Error(message);
			}

			const token = json?.token ?? json?.access_token;
			if (!token) {
				throw new Error('Сервер не вернул токен авторизации');
			}

			auth.set({ token, username: cleanUsername });
			goto('/');
		} catch (err) {
			error = err instanceof Error ? err.message : 'Произошла ошибка. Попробуйте ещё раз.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Вход – AnimeViewer</title>
</svelte:head>

<section class="max-w-screen-sm mx-auto px-4 py-10">
	<div class="bg-[#0f0d19] border border-violet-300/20 rounded-2xl px-5 py-7 sm:px-8 sm:py-9 shadow-[0_0_28px_rgba(139,109,232,0.22)]">
		<h1 class="text-2xl sm:text-3xl font-bold mb-6">Вход</h1>

		{#if error}
			<div class="mb-4 text-sm text-red-300 bg-red-500/10 border border-red-500/40 rounded-lg px-3 py-2">
				{error}
			</div>
		{/if}

		<form class="space-y-4" on:submit={handleSubmit}>
			<div class="space-y-1.5">
				<label class="text-xs uppercase tracking-wide text-white/60">Username</label>
				<Input
					type="text"
					placeholder="Admin"
					bind:value={username}
					name="username"
					ariaLabel="Username"
				/>
				{#if usernameError}
					<p class="text-xs text-red-300 mt-1">{usernameError}</p>
				{/if}
			</div>

			<div class="space-y-1.5">
				<label class="text-xs uppercase tracking-wide text-white/60">Пароль</label>
				<Input
					type="password"
					placeholder="Минимум 8 символов"
					bind:value={password}
					name="password"
					ariaLabel="Пароль"
				/>
				{#if passwordError}
					<p class="text-xs text-red-300 mt-1">{passwordError}</p>
				{/if}
			</div>

			<button
				type="submit"
				class="btn-custom w-full justify-center mt-2 text-sm sm:text-base disabled:opacity-60 disabled:cursor-not-allowed"
				disabled={!canSubmit}
			>
				{#if loading}
					Входим...
				{:else}
					Войти
				{/if}
			</button>
		</form>

		<p class="mt-6 text-xs sm:text-sm text-white/60 text-center">
			Нет аккаунта?
			<a href="/register" class="text-fuchsia-400 hover:text-fuchsia-300 font-medium">Зарегистрироваться</a>
		</p>
	</div>
</section>