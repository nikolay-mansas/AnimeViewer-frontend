<script lang="ts">
	import { auth } from '$lib/stores/auth';

	let visible = $state(true);
	const isLoggedIn = $derived(Boolean($auth.token));

	function close() {
		visible = false;
	}
</script>

{#if visible && !isLoggedIn}
	<div
		class="flex items-center justify-between border border-fuchsia-700 bg-[#1a1124] px-4 py-2 text-sm text-fuchsia-200"
	>
		<span class="text-xs sm:text-sm">
			Чтобы сохранять историю и прогресс просмотра — <a
				class="font-bold text-fuchsia-400"
				href="/login">войдите в аккаунт</a
			>.
		</span>
		<button
			class="ml-4 text-lg leading-none text-fuchsia-400 transition hover:text-fuchsia-500"
			onclick={close}
			aria-label="Закрыть"
		>
			&times;
		</button>
	</div>
{/if}
