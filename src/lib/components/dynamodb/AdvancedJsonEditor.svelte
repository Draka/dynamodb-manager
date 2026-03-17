<!--
 * Editor JSON avanzado con CodeMirror
 * Para edición de registros DynamoDB con mejor UX
-->
<script>
	import {
		Zap,
		Copy,
		RotateCcw,
		CircleAlert,
		CircleCheckBig,
		Maximize2,
		Minimize2
	} from 'lucide-svelte';
	import CodeMirrorEditor from '../ui/CodeMirrorEditor.svelte';
	import { notifySuccess, notifyError } from '$lib/stores/notifications.js';
	import * as m from '$lib/paraglide/messages.js';

	let {
		/** @type {string} Contenido JSON */
		value = $bindable(''),
		/** @type {boolean} Si está deshabilitado */
		disabled = false,
		/** @type {(() => void) | undefined} Callback cuando cambia el valor */
		onchange
	} = $props();

	/** @type {import('../ui/CodeMirrorEditor.svelte').default | null} */
	let codeMirrorEditor = $state(null);

	/** Estado de validación */
	let isValid = $state(true);
	let validationError = $state('');
	let isFullscreen = $state(false);

	/**
	 * Valida el JSON cuando cambia
	 */
	function validateJson() {
		if (!value.trim()) {
			isValid = true;
			validationError = '';
			return;
		}

		try {
			JSON.parse(value);
			isValid = true;
			validationError = '';
		} catch (/** @type {any} */ err) {
			isValid = false;
			validationError = err.message;
		}
	}

	/**
	 * Formatea el JSON automáticamente
	 */
	function formatJson() {
		if (!value.trim()) return;

		try {
			codeMirrorEditor?.formatDocument();
			notifySuccess(m['recordEditorAdvanced.formatted']());
		} catch {
			notifyError(m['recordEditorAdvanced.formatError']());
		}
	}

	/**
	 * Copia el contenido al portapapeles
	 */
	async function copyToClipboard() {
		try {
			await navigator.clipboard.writeText(value);
			notifySuccess(m['notifications.copiedToClipboard']());
		} catch (/** @type {any} */ err) {
			console.error('Error copiando al portapapeles:', err);
			notifyError(m['notifications.copyError']());
		}
	}

	/**
	 * Resetea el contenido
	 */
	function resetContent() {
		if (!confirm('¿Deseas limpiar todo el contenido?')) {
			return;
		}
		value = '';
		onchange?.();
	}

	/**
	 * Alterna modo pantalla completa
	 */
	function toggleFullscreen() {
		isFullscreen = !isFullscreen;
	}

	/**
	 * Maneja cambios en el editor
	 */
	function handleEditorChange() {
		validateJson();
		onchange?.();
	}

	// Validar cuando cambia el valor
	$effect(() => {
		validateJson();
	});
</script>

<div
	class="flex flex-col space-y-4 {isFullscreen
		? 'fixed inset-0 z-50 h-screen w-screen bg-white p-6 dark:bg-gray-900'
		: 'h-full'}"
>
	<!-- Controles -->
	<div class="flex items-center justify-between">
		<h3 class="text-lg font-medium text-gray-900 dark:text-white">Editor JSON Avanzado</h3>

		<div class="flex items-center gap-2">
			<!-- Indicador de validación -->
			{#if value.trim()}
				<div class="flex items-center gap-1">
					{#if isValid}
						<CircleCheckBig size={16} class="text-green-600 dark:text-green-400" />
						<span class="text-sm text-green-600 dark:text-green-400">Válido</span>
					{:else}
						<CircleAlert size={16} class="text-red-600 dark:text-red-400" />
						<span class="text-sm text-red-600 dark:text-red-400">Inválido</span>
					{/if}
				</div>
			{/if}

			<!-- Botones de acción -->
			<button
				type="button"
				class="flex items-center gap-1 rounded-md px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-800"
				onclick={formatJson}
				disabled={disabled || !value.trim()}
				title={m['jsonEditor.formatJson']()}
			>
				<Zap size={14} />
				Formatear
			</button>

			<button
				type="button"
				class="flex items-center gap-1 rounded-md px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-800"
				onclick={copyToClipboard}
				disabled={disabled || !value.trim()}
				title={m['jsonEditor.copy']()}
			>
				<Copy size={14} />
				Copiar
			</button>

			<button
				type="button"
				class="flex items-center gap-1 rounded-md px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-800"
				onclick={resetContent}
				{disabled}
				title={m['recordEditorAdvanced.clearContent']()}
			>
				<RotateCcw size={14} />
				{m['jsonEditor.clear']()}
			</button>

			<button
				type="button"
				class="flex items-center gap-1 rounded-md px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
				onclick={toggleFullscreen}
				title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
			>
				{#if isFullscreen}
					<Minimize2 size={14} />
				{:else}
					<Maximize2 size={14} />
				{/if}
			</button>
		</div>
	</div>

	<!-- Errores de validación -->
	{#if !isValid && validationError}
		<div
			class="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20"
		>
			<div class="flex items-start gap-2">
				<CircleAlert size={16} class="mt-0.5 text-red-600 dark:text-red-400" />
				<div class="flex-1">
					<p class="text-sm font-medium text-red-800 dark:text-red-300">JSON inválido</p>
					<p class="mt-1 text-sm text-red-700 dark:text-red-400">{validationError}</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Editor CodeMirror -->
	<div class="flex-1 {isFullscreen ? 'h-full' : ''}">
		<CodeMirrorEditor
			bind:this={codeMirrorEditor}
			bind:value
			readOnly={disabled}
			height={isFullscreen ? (typeof window !== 'undefined' ? window.innerHeight - 200 : 600) : 500}
			onchange={handleEditorChange}
		/>
	</div>

	<!-- Información de atajos -->
	{#if isFullscreen}
		<div
			class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
		>
			<span class="font-medium">Editor JSON avanzado</span> con syntax highlighting y autocompletado
		</div>
	{/if}
</div>

<style>
	/* Estilos personalizados si es necesario */
</style>
