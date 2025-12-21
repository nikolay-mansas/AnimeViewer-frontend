<script lang="ts">
	import '../app.css';
	import { goto } from '$app/navigation';
	import favicon from '$lib/assets/favicon.svg';
	import AuthNotice from '$lib/components/AuthNotice.svelte';
	import { auth } from '$lib/stores/auth';

	let { children } = $props();

	const loggedIn = $derived(Boolean($auth.token));

	function openLoginPage() {
		goto('/login');
	}

	function logout() {
		auth.logout();
		goto('/');
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="application-name" content="AnimeViewer" />
</svelte:head>

<AuthNotice />

<main class="min-h-screen bg-[#0a0a12] font-sans text-white">
	<header
		class="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-4"
	>
		<a href="/" class="text-xl font-bold tracking-wide text-white sm:text-2xl">
			<span class="text-purple-400">β</span> AnimeViewer
		</a>

		<div class="flex items-center gap-3">
			{#if loggedIn}
				<button class="btn-custom text-sm sm:text-base" type="button" onclick={logout}>
					Выход
				</button>
			{:else}
				<button class="btn-custom text-sm sm:text-base" type="button" onclick={openLoginPage}>
					Вход
				</button>
			{/if}
		</div>
	</header>

	{@render children?.()}
</main>
