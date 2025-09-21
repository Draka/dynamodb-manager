<!--
 * Componente LoadingSpinner para indicar estados de carga
 * Incluye diferentes tamaños y colores
-->
<script>
	import { Loader } from 'lucide-svelte';

	/**
	 * @typedef {'sm' | 'md' | 'lg'} SpinnerSize
	 * @typedef {'blue' | 'white' | 'gray'} SpinnerColor
	 */

	let {
		/** @type {SpinnerSize} Tamaño del spinner */
		size = 'md',
		/** @type {SpinnerColor} Color del spinner */
		color = 'blue',
		/** @type {string} Texto de carga opcional */
		text = '',
		/** @type {boolean} Si centrar el spinner */
		center = false,
		/** Contenido adicional */
		children = undefined,
		...props
	} = $props();

	/** Mapeo de tamaños a clases CSS */
	const sizeClasses = {
		sm: 'w-4 h-4',
		md: 'w-6 h-6',
		lg: 'w-8 h-8'
	};

	/** Mapeo de colores a clases CSS */
	const colorClasses = {
		blue: 'text-blue-600',
		white: 'text-white',
		gray: 'text-gray-600'
	};

	/** Clases del contenedor */
	const containerClasses = $derived(
		['flex items-center gap-3', center && 'justify-center'].filter(Boolean).join(' ')
	);

	/** Clases del spinner */
	const spinnerClasses = $derived(
		[
			'animate-spin',
			sizeClasses[/** @type {keyof typeof sizeClasses} */ (size)],
			colorClasses[/** @type {keyof typeof colorClasses} */ (color)]
		].join(' ')
	);
</script>

<div class={containerClasses} {...props}>
	<!-- Spinner SVG -->
	<Loader class="opacity-25" />

	<!-- Texto de carga -->
	{#if text}
		<span class="text-sm text-gray-600">{text}</span>
	{/if}

	<!-- Contenido adicional -->
	{#if children}
		{@render children()}
	{/if}
</div>
