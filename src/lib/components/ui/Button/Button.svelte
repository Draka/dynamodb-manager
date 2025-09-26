<!--
 * Componente Button base con múltiples variantes y estados
 * Incluye soporte para iconos, loading y diferentes tamaños
-->
<script>
	import { Loader } from 'lucide-svelte';

	/**
	 * @typedef {'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'ghost'} ButtonVariant
	 * @typedef {('button' | 'submit' | 'reset' | null | undefined)} ButtonType
	 */

	let {
		/** @type {ButtonVariant} Variante visual del botón */
		variant = 'primary',
		/** @type {ButtonSize} Tamaño del botón */
		size = 'md',
		/** @type {boolean} Estado de carga */
		loading = false,
		/** @type {boolean} Estado deshabilitado */
		disabled = false,
		/** @type {ButtonType} Tipo de botón HTML */
		type = /** @type {ButtonType} */ ('button'),
		/** @type {(() => void) | undefined} Callback al hacer clic */
		onclick = () => {},
		/** Contenido del botón */
		children,
		...props
	} = $props();

	/** Clases base del botón */
	const baseClasses =
		'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

	/** Mapeo de variantes a clases CSS */
	/** @type {Record<ButtonVariant, string>} */
	const variantClasses = {
		primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
		secondary: 'bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500',
		success: 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500',
		danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
		warning: 'bg-yellow-600 hover:bg-yellow-700 text-white focus:ring-yellow-500',
		ghost:
			'bg-transparent hover:bg-gray-100 text-gray-700 border border-gray-300 focus:ring-gray-500'
	};

	/** Mapeo de tamaños a clases CSS */
	const sizeClasses = {
		sm: 'px-3 py-1.5 text-sm',
		md: 'px-4 py-2 text-sm',
		lg: 'px-6 py-3 text-base'
	};

	/** Clases computadas finales */
	const computedClasses = $derived(
		[
			baseClasses,
			variantClasses[/** @type {keyof typeof variantClasses} */ (variant)],
			sizeClasses[/** @type {keyof typeof sizeClasses} */ (size)],
			loading && 'cursor-wait'
		]
			.filter(Boolean)
			.join(' ')
	);

	/**
	 * Maneja el evento click del botón
	 * @param {MouseEvent} event - Evento de click
	 */
	function handleClick(event) {
		if (loading || disabled) {
			event.preventDefault();
			return;
		}
		onclick?.(event);
	}
</script>

<button
	{type}
	class={computedClasses}
	disabled={disabled || loading}
	onclick={handleClick}
	{...props}
>
	{#if loading}
		<Loader class="animate-spin" />
	{/if}

	{@render children()}
</button>
