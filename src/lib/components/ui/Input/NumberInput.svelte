<!--
 * Componente NumberInput para campos numéricos
 * Incluye validación, min/max y formateo
-->
<script>
	let {
		/** @type {number | null} Valor numérico del input */
		value = $bindable(null),
		/** @type {string} Label del input */
		label = '',
		/** @type {string} Placeholder del input */
		placeholder = '',
		/** @type {number | undefined} Valor mínimo */
		min,
		/** @type {number | undefined} Valor máximo */
		max,
		/** @type {number | undefined} Incremento del step */
		step,
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
		/** @type {((value: number | null) => void) | undefined} Callback al cambiar valor */
		onchange,
		...props
	} = $props();

	/** ID único generado si no se proporciona */
	const inputId = $derived(id || `number-input-${Math.random().toString(36).substr(2, 9)}`);

	/** Clases base del input */
	const baseClasses =
		'block w-full px-3 py-2 border rounded-md text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors';

	/** Clases según estado del input */
	const stateClasses = $derived(() => {
		if (error) {
			return 'border-red-300 focus:border-red-500 focus:ring-red-500';
		}
		if (disabled) {
			return 'border-gray-200 bg-gray-50 cursor-not-allowed';
		}
		return 'border-gray-300 focus:border-blue-500 focus:ring-blue-500';
	});

	/** Clases computadas finales */
	const computedClasses = $derived([baseClasses, stateClasses()].filter(Boolean).join(' '));

	/** Valor como string para el input */
	const inputValue = $derived(value !== null ? value.toString() : '');

	/**
	 * Maneja el evento input
	 * @param {Event} event - Evento de input
	 */
	function handleInput(event) {
		const target = /** @type {HTMLInputElement} */ (event.target);

		if (target.value === '') {
			value = null;
		} else {
			const numericValue = parseFloat(target.value);
			if (!isNaN(numericValue)) {
				value = numericValue;
			}
		}

		onchange?.(value);
	}

	/**
	 * Valida si el valor está dentro del rango permitido
	 * @param {number} val - Valor a validar
	 * @returns {boolean} Si es válido
	 */
	function isValidRange(val) {
		if (min !== undefined && val < min) return false;
		if (max !== undefined && val > max) return false;
		return true;
	}

	/** Mensaje de error por rango */
	const rangeError = $derived(() => {
		if (value === null) return null;
		if (!isValidRange(value)) {
			if (min !== undefined && max !== undefined) {
				return `Valor debe estar entre ${min} y ${max}`;
			} else if (min !== undefined) {
				return `Valor debe ser mayor o igual a ${min}`;
			} else if (max !== undefined) {
				return `Valor debe ser menor o igual a ${max}`;
			}
		}
		return null;
	});

	/** Error final mostrado */
	const displayError = $derived(error || rangeError);
</script>

<div class="space-y-1">
	{#if label}
		<label for={inputId} class="block text-sm font-medium text-gray-700">
			{label}
			{#if required}
				<span class="ml-1 text-red-500">*</span>
			{/if}
		</label>
	{/if}

	<input
		type="number"
		id={inputId}
		class={computedClasses}
		{placeholder}
		{required}
		{disabled}
		{min}
		{max}
		{step}
		value={inputValue}
		oninput={handleInput}
		{...props}
	/>

	{#if displayError}
		<p class="flex items-center gap-1 text-sm text-red-600">
			<Code size={16} />
			{displayError}
		</p>
	{:else if help}
		<p class="text-sm text-gray-500">{help}</p>
	{/if}
</div>
