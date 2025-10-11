<script lang="ts">
	interface Props {
		placeholder?: string;
		value?: string;
		type?: 'text' | 'search' | 'email' | 'password';
		name?: string;
		autofocus?: boolean;
		ariaLabel?: string;
	}
	let { placeholder = 'Поиск аниме', value = '', type = 'search', name, autofocus = false, ariaLabel = placeholder }: Props = $props();

	function onInput(e: Event) {
		const t = e.target as HTMLInputElement;
		value = t.value;
	}
</script>

<!-- контейнер нужен для удобной верстки -->
<div class="w-full">
	<!-- сам input — «менее выделенный» -->
	<input
		class="peer w-full bg-transparent border-0 outline-none text-white/90 placeholder-white/40
		       text-[16px] px-[6px] pt-[10px] pb-[8px] caret-fuchsia-400
		       ring-1 ring-purple-400/15 rounded-md
		       hover:ring-purple-400/25 focus:ring-purple-400/35 transition"
		{type}
		{name}
		{autofocus}
		aria-label={ariaLabel}
		placeholder={placeholder}
		value={value}
		oninput={onInput}
	/>

	<!-- underline: повтор анимации .input:focus + .underline -->
	<div
		class="underline h-[2px] mt-[2px] bg-gradient-to-r from-fuchsia-400/80 via-purple-400/80 to-fuchsia-400/80
		       origin-left scale-x-0 opacity-0 transition-transform duration-200 ease-out
		       peer-focus:opacity-100 peer-focus:scale-x-100"
	/>
</div>
