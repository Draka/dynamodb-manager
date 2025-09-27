<!--
 * Componente Select con opciones personalizables
 * Soporta opciones simples y con objetos complejos
-->
<script>
	import { ChevronDown, Code } from 'lucide-svelte';

	let {
		/** @type {OptionValue} Valor seleccionado */
		value = $bindable(''),
		/** @type {Array<{value: string, label: string}> | string[]} Opciones del select */
		options = [],
		/** @type {string} Label del select */
		label = '',
		/** @type {string} Texto del placeholder */
		placeholder = 'Selecciona una opción',
		/** @type {boolean} Si el campo es requerido */
		required = false,
		/** @type {boolean} Si el select está deshabilitado */
		disabled = false,
		/** @type {string | null} Mensaje de error */
		error = null,
		/** @type {string} Texto de ayuda */
		help = '',
		/** @type {string} ID del select */
		id = '',
		/** @type {(value: OptionValue) => void | undefined} Callback al cambiar valor */
		onchange = undefined,
		...props
	} = $props();

	/** ID único generado si no se proporciona */
	const selectId = $derived(id || `select-${Math.random().toString(36).substr(2, 9)}`);

	/** Clases base del select */
	const baseClasses =
		'block w-full px-3 py-2 pr-8 border rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors appearance-none';

	/** Clases según estado del select */
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
	 * Maneja el cambio de selección
	 * @param {Event} event - Evento de change
	 */
	function handleChange(event) {
		const target = /** @type {HTMLSelectElement} */ (event.target);
		const selectedOption = options.find(
			(/** @type {{ value: { toString: () => string; }; }} */ opt) =>
				opt.value.toString() === target.value
		);

		if (selectedOption) {
			value = selectedOption.value;
			onchange?.(value);
		}
	}

	/** Valor como string para el select HTML */
	const stringValue = $derived(value?.toString() || '');
</script>

<div class="space-y-1">
	{#if label}
		<label for={selectId} class="block text-sm font-medium text-gray-700 dark:text-gray-300">
			{label}
			{#if required}
				<span class="ml-1 text-red-500 dark:text-red-400">*</span>
			{/if}
		</label>
	{/if}

	<div class="relative">
		<select
			id={selectId}
			class={computedClasses}
			{required}
			{disabled}
			value={stringValue}
			onchange={handleChange}
			{...props}
		>
			{#if placeholder}
				<option value="" disabled>{placeholder}</option>
			{/if}

			{#each options as option (option.value)}
				<option value={option.value.toString()} disabled={option.disabled}>
					{option.label}
				</option>
			{/each}
		</select>

		<!-- Icono de flecha personalizado -->
		<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
			<ChevronDown size={20} class="text-gray-400 dark:text-gray-500" />
		</div>
	</div>

	{#if error}
		<p class="flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
			<Code size={16} />
			{error}
		</p>
	{:else if help}
		<p class="text-sm text-gray-500 dark:text-gray-400">{help}</p>
	{/if}
</div>

<style>
	/* Ocultar flecha nativa del select para usar el icono personalizado */
	select {
		appearance: none;
		-webkit-appearance: none;
		-moz-appearance: none;
		background-image: none;
	}

	/* Oculta el desplegable por defecto en IE/Edge heredados */
	select::-ms-expand {
		display: none;
	}
</style>
