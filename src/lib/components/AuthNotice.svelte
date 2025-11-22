<script lang="ts">
	import { auth } from '$lib/stores/auth';

	let visible = $state(true);
	const isLoggedIn = $derived(Boolean($auth.token));

	function close() {
		visible = false;
	}
</script>

{#if visible && !isLoggedIn}
	<div class="bg-[#1a1124] border border-fuchsia-700 text-fuchsia-200 px-4 py-2 text-sm flex items-center justify-between">
		<span class="text-xs sm:text-sm">
			Чтобы сохранять историю и прогресс просмотра — <a class="text-fuchsia-400 font-bold" href="/login">войдите в аккаунт</a>.
		</span>
		<button
			class="ml-4 text-fuchsia-400 hover:text-fuchsia-500 transition text-lg leading-none"
			onclick={close}
			aria-label="Закрыть"
		>
			&times;
		</button>
	</div>
{/if}