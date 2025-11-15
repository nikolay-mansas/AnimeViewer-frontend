<script lang="ts">
	import '../app.css';
	import { goto } from '$app/navigation'
	import favicon from '$lib/assets/favicon.svg';
	import AuthNotice from '$lib/components/AuthNotice.svelte';

	let { children } = $props();

	function OpenLoginPage() {
		goto('login');
	}
</script>

<svelte:head>
	<link rel='icon' href={favicon} />
</svelte:head>

<AuthNotice />

<main class='min-h-screen bg-[#0a0a12] text-white font-sans'>
	<header class='flex justify-between items-center px-4 py-4 border-b border-white/10'>
		<a href="/" class='text-xl sm:text-2xl font-bold text-white tracking-wide'>
			<span class='text-purple-400'>β</span> AnimeViewer
		</a>

		<button class='btn-custom' onclick={OpenLoginPage}>
			Вход
		</button>
	</header>

	{@render children?.()}
</main>