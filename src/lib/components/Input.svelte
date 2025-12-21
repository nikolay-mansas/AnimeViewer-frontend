<script lang="ts">
	interface Props {
		placeholder?: string;
		value?: string;
		type?: 'text' | 'search' | 'email' | 'password';
		name?: string;
		autofocus?: boolean;
		ariaLabel?: string;
	}
	let {
		placeholder = 'Поиск аниме',
		value = $bindable(''),
		type = 'search',
		name,
		ariaLabel = placeholder
	}: Props = $props();

	function onInput(e: Event) {
		const t = e.target as HTMLInputElement;
		value = t.value;
	}
</script>

<div class="w-full">
	<input
		class="peer w-full rounded-md border-0 bg-transparent px-[6px] pt-[10px]
		       pb-[8px] text-[16px] text-white/90 placeholder-white/40 caret-fuchsia-400
		       ring-1 ring-purple-400/15 transition
		       outline-none hover:ring-purple-400/25 focus:ring-purple-400/35"
		{type}
		{name}
		aria-label={ariaLabel}
		{placeholder}
		{value}
		oninput={onInput}
	/>

	<div
		class="mt-[2px] h-[2px] origin-left scale-x-0 bg-gradient-to-r from-fuchsia-400/80 via-purple-400/80
		       to-fuchsia-400/80 underline opacity-0 transition-transform duration-200 ease-out
		       peer-focus:scale-x-100 peer-focus:opacity-100"
	></div>
</div>
