<script lang="ts">
	import { page } from '$app/state';

	type Props = {
		title: string;
		description: string;
		image?: string;
		type?: 'website' | 'video.tv_show' | 'video.episode' | 'article';
		noindex?: boolean;
		canonical?: string;
		jsonLd?: unknown | unknown[];
	};

	let {
		title,
		description,
		image,
		type = 'website',
		noindex = false,
		canonical,
		jsonLd
	}: Props = $props();

	const origin = $derived.by(() => page.url.origin);
	const url = $derived.by(() => canonical ?? page.url.href);
	const img = $derived.by(() =>
		image ? (image.startsWith('http') ? image : `${origin}${image}`) : undefined
	);
	const ldList = $derived.by(() => (Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : []));
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={url} />

	<meta
		name="robots"
		content={noindex
			? 'noindex,nofollow'
			: 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1'}
	/>

	<meta property="og:locale" content="ru_RU" />
	<meta property="og:site_name" content="AnimeViewer" />
	<meta property="og:type" content={type} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={url} />
	{#if img}
		<meta property="og:image" content={img} />
	{/if}

	<meta name="twitter:card" content={img ? 'summary_large_image' : 'summary'} />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	{#if img}
		<meta name="twitter:image" content={img} />
	{/if}

	{#each ldList as ld}
		<script type="application/ld+json">
{JSON.stringify(ld)}
		</script>
	{/each}
</svelte:head>
