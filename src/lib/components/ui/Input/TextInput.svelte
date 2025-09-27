<!--
 * Componente TextInput con validación y estados
 * Soporta diferentes tipos de input, validación y mensajes de error
-->
<script>
	import { Code } from 'lucide-svelte';

	/**
	 * @typedef {'text' | 'email' | 'password' | 'url'} InputType
	 */

	let {
		value = $bindable(/** @type {InputType} */ ('')),
		/** @type {InputType} Tipo de input */
		type = /** @type {InputType} */ ('text'),
		/** @type {string} Label del input */
		label = '',
		/** @type {string} Placeholder del input */
		placeholder = '',
		/** @type {boolean} Si el campo es requerido */
		required = false,
		/** @type {boolean} Si el input está deshabilitado */
		disabled = false,
		/** @type {string | null} Mensaje de error */
		error = null,
		/** @type {string} Texto de ayuda */
		help = '',
		/** @type {string} ID del input */
		id = '',
		/** @type {((event: Event) => void) | undefined} Callback al cambiar valor */
		onchange = undefined,
		/** @type {((event: Event) => void) | undefined} Callback al escribir */
		oninput = undefined,
		/** @type {((event: Event) => void) | undefined} Callback al perder foco */
		onblur = undefined,
		...props
	} = $props();

	/** ID único generado si no se proporciona */
	const inputId = $derived(id || `input-${Math.random().toString(36).substr(2, 9)}`);

	/** Clases base del input */
	const baseClasses =
		'block w-full px-3 py-2 border rounded-md text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors text-gray-900 dark:text-white bg-white dark:bg-gray-800';

	/** Clases según estado del input */
	const stateClasses = $derived(() => {
		if (error) {
			return 'border-red-300 dark:border-red-600 focus:border-red-500 dark:focus:border-red-400 focus:ring-red-500 dark:focus:ring-red-400';
		}
		if (disabled) {
			return 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 cursor-not-allowed';
		}
		return 'border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400';
	});

	/** Clases computadas finales */
	const computedClasses = $derived([baseClasses, stateClasses()].filter(Boolean).join(' '));

	/**
	 * Maneja el evento input
	 * @param {Event} event - Evento de input
	 */
	function handleInput(event) {
		const target = /** @type {HTMLInputElement} */ (event.target);
		value = target.value;
		oninput?.(event);
	}

	/**
	 * Maneja el evento change
	 * @param {Event} event - Evento de change
	 */
	function handleChange(event) {
		onchange?.(event);
	}

	/**
	 * Maneja el evento blur
	 * @param {Event} event - Evento de blur
	 */
	function handleBlur(event) {
		onblur?.(event);
	}
</script>

<div class="space-y-1">
	{#if label}
		<label for={inputId} class="block text-sm font-medium text-gray-700 dark:text-gray-300">
			{label}
			{#if required}
				<span class="ml-1 text-red-500 dark:text-red-400">*</span>
			{/if}
		</label>
	{/if}

	<input
		{type}
		id={inputId}
		class={computedClasses}
		{placeholder}
		{required}
		{disabled}
		{value}
		oninput={handleInput}
		onchange={handleChange}
		onblur={handleBlur}
		{...props}
	/>

	{#if error}
		<p class="flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
			<Code size={16} />
			{error}
		</p>
	{:else if help}
		<p class="text-sm text-gray-500 dark:text-gray-400">{help}</p>
	{/if}
</div>
