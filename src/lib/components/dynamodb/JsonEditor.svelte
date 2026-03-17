<!--
 * Editor JSON simple con validación y formateo
 * Para edición de registros individuales DynamoDB
-->
<script>
	import { Zap, Copy, RotateCcw, CircleAlert, CircleCheckBig } from 'lucide-svelte';
	import * as m from '$lib/paraglide/messages.js';

	let {
		/** @type {string} Contenido JSON */
		value = $bindable(''),
		/** @type {boolean} Si está deshabilitado */
		disabled = false,
		/** @type {string} Placeholder */
		placeholder = 'Introduce el JSON del registro...',
		/** @type {(() => void) | undefined} Callback cuando cambia el valor */
		onchange
	} = $props();

	/** Estado de validación */
	let isValid = $state(true);
	let errorMessage = $state('');

	/**
	 * Valida el JSON y actualiza el estado
	 */
	function validateJson() {
		if (!value.trim()) {
			isValid = true;
			errorMessage = '';
			return;
		}

		try {
			JSON.parse(value);
			isValid = true;
			errorMessage = '';
		} catch (/** @type {any} */ err) {
			isValid = false;
			errorMessage = err.message;
		}
	}

	/**
	 * Formatea el JSON automáticamente
	 */
	function formatJson() {
		if (!value.trim()) return;

		try {
			const parsed = JSON.parse(value);
			value = JSON.stringify(parsed, null, 2);
			validateJson();
			onchange?.();
		} catch {
			// Si no se puede parsear, no hacemos nada
		}
	}

	/**
	 * Copia el contenido al portapapeles
	 */
	async function copyToClipboard() {
		try {
			await navigator.clipboard.writeText(value);
			// TODO: Mostrar toast de confirmación
		} catch (/** @type {any} */ e) {
			console.error('Error copiando al portapapeles:', e);
		}
	}

	/**
	 * Resetea el contenido
	 */
	function resetContent() {
		value = '';
		validateJson();
		onchange?.();
	}

	// Validar inicial y cuando value cambie
	$effect(() => {
		validateJson();
		onchange?.();
	});
</script>

<div class="flex h-full flex-col space-y-4">
	<!-- Controles -->
	<div class="flex items-center justify-between">
		<h3 class="text-lg font-medium text-gray-900 dark:text-white">Editor JSON</h3>

		<div class="flex items-center gap-2">
			<!-- Indicador de validación -->
			{#if value.trim()}
				<div class="flex items-center gap-1">
					{#if isValid}
						<CircleCheckBig size={16} class="text-green-600 dark:text-green-400" />
						<span class="text-sm text-green-600 dark:text-green-400">Válido</span>
					{:else}
						<CircleAlert size={16} class="text-red-600 dark:text-red-400" />
						<span class="text-sm text-red-600 dark:text-red-400">{m['jsonEditor.error']()}</span>
					{/if}
				</div>
			{/if}

			<!-- Botones de acción -->
			<button
				type="button"
				class="flex items-center gap-1 rounded-md px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-700"
				onclick={formatJson}
				disabled={disabled || !value.trim()}
				title={m['jsonEditor.formatJson']()}
			>
				<Zap size={14} />
				Formatear
			</button>

			<button
				type="button"
				class="flex items-center gap-1 rounded-md px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-700"
				onclick={copyToClipboard}
				disabled={disabled || !value.trim()}
				title={m['jsonEditor.copy']()}
			>
				<Copy size={14} />
				{m['jsonEditor.copy']()}
			</button>

			<button
				type="button"
				class="flex items-center gap-1 rounded-md px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-700"
				onclick={resetContent}
				{disabled}
				title={m['jsonEditor.clear']()}
			>
				<RotateCcw size={14} />
				{m['jsonEditor.clear']()}
			</button>
		</div>
	</div>

	<!-- Error de validación -->
	{#if !isValid && errorMessage}
		<div
			class="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/30"
		>
			<div class="flex items-start gap-2">
				<CircleAlert size={16} class="mt-0.5 text-red-600 dark:text-red-400" />
				<div>
					<p class="text-sm font-medium text-red-800 dark:text-red-300">JSON inválido</p>
					<p class="text-sm text-red-700 dark:text-red-400">{errorMessage}</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Editor simple -->
	<div class="flex-1">
		<textarea
			bind:value
			class="h-full w-full resize-none rounded-md border border-gray-300 bg-white px-3 py-2 font-mono text-sm leading-relaxed text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-blue-400 dark:disabled:bg-gray-900"
			{placeholder}
			{disabled}
			spellcheck="false"
		></textarea>
	</div>
</div>
