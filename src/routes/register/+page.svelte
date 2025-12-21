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
	const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

	let email = $state('');
	let username = $state('');
	let password = $state('');
	let passwordRepeat = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);
	let submitted = $state(false);

	let turnstileToken = $state<string | null>(null);
	let turnstileRef = $state<InstanceType<typeof Turnstile> | null>(null);

	function getEmailError(value: string): string | null {
		const v = value.trim();

		if (!v) return 'Введите email';
		if (v.length > 64) return 'Email не может быть длиннее 64 символов';
		if (!EMAIL_REGEX.test(v)) return 'Введите корректный email';

		return null;
	}

	function getUsernameError(value: string): string | null {
		const v = value.trim();

		if (!v) return 'Введите никнейм';
		if (v.length < 6) return 'Никнейм должен содержать минимум 6 символов';
		if (v.length > 64) return 'Никнейм не может быть длиннее 64 символов';
		if (!USERNAME_REGEX.test(v)) return 'Допустимы только латинские буквы, цифры и "_"';

		return null;
	}

	function getPasswordError(value: string): string | null {
		if (!value) return 'Введите пароль';
		if (value.length < 8) return 'Пароль должен содержать минимум 8 символов';
		if (value.length > 64) return 'Пароль не может быть длиннее 64 символов';
		return null;
	}

	function getPasswordRepeatError(password: string, repeat: string): string | null {
		if (!repeat && !submitted) return null;
		if (!repeat && submitted) return 'Повторите пароль';
		if (password !== repeat) return 'Пароли не совпадают';
		return null;
	}

	const emailError = $derived(email === '' && !submitted ? null : getEmailError(email));
	const usernameError = $derived(username === '' && !submitted ? null : getUsernameError(username));
	const passwordError = $derived(password === '' && !submitted ? null : getPasswordError(password));
	const passwordRepeatError = $derived(
		passwordRepeat === '' && !submitted ? null : getPasswordRepeatError(password, passwordRepeat)
	);

	const canSubmit = $derived(
		!loading &&
			!!turnstileToken &&
			!getEmailError(email) &&
			!getUsernameError(username) &&
			!getPasswordError(password) &&
			!getPasswordRepeatError(password, passwordRepeat)
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
			const cleanEmail = email.trim();
			const cleanUsername = username.trim();

			const body = new URLSearchParams();
			body.set('email', cleanEmail);
			body.set('username', cleanUsername);
			body.set('password', password);
			body.set('cf_token', turnstileToken!);

			const res = await fetch(PUBLIC_API_URL + '/api/v2/auth/signup', {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body
			});

			const data = await res.json().catch(() => null);

			if (!res.ok) {
				let message = 'Не удалось зарегистрироваться. Попробуйте ещё раз.';

				const detail = data?.detail;

				if (typeof detail === 'string') {
					message = detail;
				} else if (Array.isArray(detail) && detail.length && detail[0]?.msg) {
					message = detail[0].msg;
				} else if (data?.message) {
					message = data.message;
				} else if (res.status === 409) {
					message = 'Пользователь с такими данными уже существует.';
				}

				turnstileRef?.reset?.();
				turnstileToken = null;

				throw new Error(message);
			}

			const token: string | null = data?.access_token;

			if (token) {
				const displayName = cleanUsername || cleanEmail;
				auth.setToken(token);
				goto('/');
			} else {
				goto('/login');
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Произошла ошибка. Попробуйте ещё раз.';
		} finally {
			loading = false;
		}
	}
</script>

<Seo
	title="Регистрация – AnimeViewer"
	description="Создание аккаунта в AnimeViewer."
	noindex={true}
/>

<section class="mx-auto max-w-screen-sm px-4 py-10">
	<div
		class="rounded-2xl border border-violet-300/20 bg-[#0f0d19] px-5 py-7 shadow-[0_0_28px_rgba(139,109,232,0.22)] sm:px-8 sm:py-9"
	>
		<h1 class="mb-6 text-2xl font-bold sm:text-3xl">Регистрация</h1>

		{#if error}
			<div
				class="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300"
			>
				{error}
			</div>
		{/if}

		<form class="space-y-4" onsubmit={handleSubmit}>
			<div class="space-y-1.5">
				<label for="email" class="text-xs tracking-wide text-white/60 uppercase">Email</label>
				<Input
					type="email"
					placeholder="you@example.com"
					bind:value={email}
					name="email"
					ariaLabel="Email"
				/>
				{#if emailError}
					<p class="mt-1 text-xs text-red-300">{emailError}</p>
				{/if}
			</div>

			<div class="space-y-1.5">
				<label for="username" class="text-xs tracking-wide text-white/60 uppercase">Никнейм</label>
				<Input
					type="text"
					placeholder="Kira"
					bind:value={username}
					name="username"
					ariaLabel="Никнейм"
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

			<div class="space-y-1.5">
				<label for="passwordRepeat" class="text-xs tracking-wide text-white/60 uppercase"
					>Повтор пароля</label
				>
				<Input
					type="password"
					placeholder="Повторите пароль"
					bind:value={passwordRepeat}
					name="passwordRepeat"
					ariaLabel="Повтор пароля"
				/>

				{#if passwordRepeatError}
					<p class="mt-1 text-xs text-red-300">{passwordRepeatError}</p>
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
					Регистрируем...
				{:else}
					Зарегистрироваться
				{/if}
			</button>
		</form>

		<p class="mt-6 text-center text-xs text-white/60 sm:text-sm">
			Уже есть аккаунт?
			<a href="/login" class="font-medium text-fuchsia-400 hover:text-fuchsia-300">Войти</a>
		</p>
	</div>
</section>

<Footer />
