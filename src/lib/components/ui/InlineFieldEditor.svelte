<!--
 * Editor inline para campos simples de DynamoDB
 * Permite editar valores primitivos (string, number, boolean) directamente en la tabla
-->
<script>
	import { onMount, tick } from 'svelte';
	import { Check, X } from 'lucide-svelte';

	let {
		/** @type {any} Valor actual del campo */
		value = $bindable(),
		/** @type {'string' | 'number' | 'boolean'} Tipo del campo */
		fieldType = 'string',
		/** @type {() => void} Callback cuando se acepta el cambio */
		onAccept,
		/** @type {() => void} Callback cuando se cancela la edición */
		onCancel,
		/** @type {string} Posición del popup respecto al elemento padre */
		position = 'bottom'
	} = $props();

	let editingValue = $state(value);
	let inputElement = $state(null);
	let isValid = $state(true);

	onMount(() => {
		// Focus automático al montar
		if (inputElement) {
			inputElement.focus();
			if (inputElement.select) {
				inputElement.select();
			}
		}
	});

	/**
	 * Valida el valor según el tipo de campo
	 */
	function validateValue() {
		if (fieldType === 'number') {
			const num = Number(editingValue);
			isValid = !isNaN(num) && editingValue !== '';
		} else if (fieldType === 'boolean') {
			isValid = editingValue === 'true' || editingValue === 'false';
		} else {
			isValid = true; // Los strings siempre son válidos
		}
	}

	/**
	 * Maneja el cambio de valor en el input
	 */
	function handleInput(e) {
		editingValue = e.target.value;
		validateValue();
	}

	/**
	 * Maneja la aceptación del cambio
	 */
	function handleAccept() {
		if (!isValid) return;

		let finalValue = editingValue;

		// Convertir al tipo correcto
		if (fieldType === 'number') {
			finalValue = Number(editingValue);
		} else if (fieldType === 'boolean') {
			finalValue = editingValue === 'true';
		}

		value = finalValue;
		onAccept?.();
	}

	/**
	 * Maneja el teclado
	 */
	function handleKeydown(e) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleAccept();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			onCancel?.();
		}
	}

	/**
	 * Obtiene las clases de posición del popup
	 */
	function getPositionClasses() {
		switch (position) {
			case 'top':
				return 'bottom-full mb-2 left-0';
			case 'right':
				return 'left-full ml-2 top-0';
			case 'left':
				return 'right-full mr-2 top-0';
			default: // bottom
				return 'top-full mt-2 left-0';
		}
	}
</script>

<div class="relative">
	<div
		class="absolute z-50 rounded-lg border bg-white p-3 shadow-lg {getPositionClasses()}"
		style="min-width: 250px"
	>
		<div class="space-y-2">
			<!-- Input según el tipo -->
			{#if fieldType === 'boolean'}
				<select
					bind:this={inputElement}
					bind:value={editingValue}
					onkeydown={handleKeydown}
					class="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
				>
					<option value="true">true</option>
					<option value="false">false</option>
				</select>
			{:else if fieldType === 'number'}
				<input
					bind:this={inputElement}
					type="text"
					value={editingValue}
					oninput={handleInput}
					onkeydown={handleKeydown}
					placeholder="Ingrese un número"
					class="w-full rounded border px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {!isValid ? 'border-red-500' : 'border-gray-300'}"
				/>
			{:else}
				<input
					bind:this={inputElement}
					type="text"
					value={editingValue}
					oninput={handleInput}
					onkeydown={handleKeydown}
					placeholder="Ingrese el valor"
					class="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
				/>
			{/if}

			<!-- Mensaje de validación -->
			{#if !isValid && fieldType === 'number'}
				<p class="text-xs text-red-600">Debe ser un número válido</p>
			{/if}

			<!-- Botones de acción -->
			<div class="flex items-center justify-end gap-2">
				<button
					type="button"
					onclick={onCancel}
					class="flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200"
					title="Cancelar (Esc)"
				>
					<X size={14} />
					Cancelar
				</button>
				<button
					type="button"
					onclick={handleAccept}
					disabled={!isValid}
					class="flex items-center gap-1 rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
					title="Aceptar (Enter)"
				>
					<Check size={14} />
					Aceptar
				</button>
			</div>
		</div>
	</div>
</div>