<!--
 * Editor inline para campos simples de DynamoDB
 * Permite editar valores primitivos (string, number, boolean) directamente en la tabla
-->
<script>
	import { onMount } from 'svelte';
	import { Check, X } from 'lucide-svelte';
	import * as m from '$lib/paraglide/messages.js';

	let {
		/** @type {any} Valor actual del campo */
		value = $bindable(),
		/** @type {'string' | 'number' | 'boolean'} Tipo del campo */
		fieldType = 'string',
		/** @type {(value?: any) => void} Callback cuando se acepta el cambio (recibe el valor ya convertido al tipo correcto) */
		onAccept,
		/** @type {() => void} Callback cuando se cancela la edición */
		onCancel,
		/** @type {string} Posición del popup respecto al elemento padre */
		position = 'bottom'
	} = $props();

	let editingValue = $state(value);
	/** @type {HTMLInputElement | HTMLSelectElement | null} */
	let inputElement = $state(null);
	let isValid = $state(true);

	onMount(() => {
		// Focus automático al montar
		const el = inputElement;
		if (el) {
			el.focus();
			if ('select' in el && typeof el.select === 'function') {
				el.select();
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
	/** @param {Event} e */
	function handleInput(e) {
		const target = /** @type {HTMLInputElement | HTMLSelectElement} */ (e.target);
		editingValue = target.value;
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
		onAccept?.(finalValue);
	}

	/**
	 * Maneja el teclado
	 */
	/** @param {KeyboardEvent} e */
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
		class="absolute z-50 rounded-lg border border-gray-300 bg-white p-3 shadow-lg dark:border-gray-600 dark:bg-gray-800 {getPositionClasses()}"
		style="min-width: 250px"
	>
		<div class="space-y-2">
			<!-- Input según el tipo -->
			{#if fieldType === 'boolean'}
				<select
					bind:this={inputElement}
					bind:value={editingValue}
					onkeydown={handleKeydown}
					class="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400"
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
					class="w-full rounded border bg-white px-2 py-1 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-500 dark:focus:border-blue-400 dark:focus:ring-blue-400 {!isValid
						? 'border-red-500 dark:border-red-400'
						: 'border-gray-300 dark:border-gray-600'}"
				/>
			{:else}
				<input
					bind:this={inputElement}
					type="text"
					value={editingValue}
					oninput={handleInput}
					onkeydown={handleKeydown}
					placeholder="Ingrese el valor"
					class="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500 dark:focus:border-blue-400 dark:focus:ring-blue-400"
				/>
			{/if}

			<!-- Mensaje de validación -->
			{#if !isValid && fieldType === 'number'}
				<p class="text-xs text-red-600 dark:text-red-400">Debe ser un número válido</p>
			{/if}

			<!-- Botones de acción -->
			<div class="flex items-center justify-end gap-2">
				<button
					type="button"
					onclick={onCancel}
					class="flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
					title={m['inlineEditor.cancelTitle']()}
				>
					<X size={14} />
					Cancelar
				</button>
				<button
					type="button"
					onclick={handleAccept}
					disabled={!isValid}
					class="flex items-center gap-1 rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400 dark:bg-blue-700 dark:hover:bg-blue-800 dark:disabled:bg-gray-600"
					title={m['inlineEditor.acceptTitle']()}
				>
					<Check size={14} />
					Aceptar
				</button>
			</div>
		</div>
	</div>
</div>
