<script>
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { Toast, ErrorDisplay } from '$lib/components/ui';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children?.()}

<!-- Sistema de notificaciones Toast -->
<Toast />

<!-- Sistema de errores centralizado -->
<ErrorDisplay />
