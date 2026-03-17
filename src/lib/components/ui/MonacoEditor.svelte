<!--
 * Editor JSON avanzado usando Monaco Editor
 * Lazy-loaded para mejor performance
-->
<script>
	import { onMount, onDestroy } from 'svelte';
	import { theme } from '$lib/stores/theme.js';
	import { LoadingSpinner } from './LoadingSpinner';
	import * as m from '$lib/paraglide/messages.js';

	let {
		/** @type {string} Contenido del editor */
		value = $bindable(''),
		/** @type {'json' | 'javascript' | 'typescript' | 'html' | 'css'} Lenguaje del editor */
		language = 'json',
		/** @type {boolean} Si está en modo de solo lectura */
		readOnly = false,
		/** @type {number} Altura del editor en px */
		height = 400,
		/** @type {(() => void) | undefined} Callback cuando cambia el valor */
		onchange,
		/** @type {((isValid: boolean, errors: any[]) => void) | undefined} Callback de validación */
		onValidation
	} = $props();

	/** @type {HTMLElement | null} */
	let editorContainer = $state(null);

	/** @type {any} Instancia del editor Monaco (IStandaloneCodeEditor); tipado amplio porque el módulo puede no estar instalado */
	let editor = $state(null);

	/** @type {any} */
	let monaco = null;

	let loading = $state(true);
	let error = $state('');

	/**
	 * Carga Monaco Editor dinámicamente
	 */
	async function loadMonaco() {
		try {
			loading = true;
			error = '';

			// Importar Monaco Editor dinámicamente (opcional; el paquete puede no estar en dependencies)
			// @ts-expect-error - módulo opcional, no siempre instalado
			const monacoModule = await import('monaco-editor');
			monaco = monacoModule;

			// Esperar a que el contenedor esté disponible
			if (!editorContainer) {
				throw new Error('Contenedor del editor no disponible');
			}

			// Configurar Monaco
			setupMonaco();

			// Crear el editor
			editor = monaco.editor.create(editorContainer, {
				value: value,
				language: language,
				theme: $theme === 'dark' ? 'vs-dark' : 'vs',
				readOnly: readOnly,
				automaticLayout: true,
				minimap: { enabled: false },
				scrollBeyondLastLine: false,
				fontSize: 14,
				lineNumbers: 'on',
				renderWhitespace: 'selection',
				tabSize: 2,
				insertSpaces: true,
				wordWrap: 'on',
				formatOnPaste: true,
				formatOnType: true,
				quickSuggestions: language === 'json',
				suggest: {
					showWords: true,
					showSnippets: true
				}
			});

			// Escuchar cambios en el contenido
			if (editor) {
				editor.onDidChangeModelContent(() => {
					const newValue = editor?.getValue() || '';
					if (newValue !== value) {
						value = newValue;
						onchange?.();
					}
				});
			}

			// Escuchar cambios de validación para JSON
			if (language === 'json' && editor) {
				const model = editor.getModel();
				if (model && monaco) {
					/**
					 * @param {any[]} args
					 */
					const onMarkersChange = (args) => {
						const resource = args[0];
						if (model && resource && model.uri.toString() === resource.toString()) {
							const markers = monaco.editor.getModelMarkers({ resource });
							const hasErrors = markers.some(
								/**
								 * @param {any} mk
								 */
								(mk) => mk.severity === monaco.MarkerSeverity.Error
							);
							onValidation?.(!hasErrors, markers);
						}
					};
					monaco.editor.onDidChangeMarkers(onMarkersChange);
				}
			}

			loading = false;
		} catch (/** @type {any} */ err) {
			console.error('Error cargando Monaco Editor:', err);
			error = m['monacoEditor.loadError']();
			loading = false;
		}
	}

	/**
	 * Configuración inicial de Monaco
	 */
	function setupMonaco() {
		if (!monaco) return;

		// Configurar temas personalizados si es necesario
		// monaco.editor.defineTheme('custom-dark', {...});
	}

	/**
	 * Actualiza el valor del editor
	 * @param {string} newValue
	 */
	function updateEditorValue(newValue) {
		if (editor && editor.getValue() !== newValue) {
			const position = editor.getPosition();
			editor.setValue(newValue);
			if (position) {
				editor.setPosition(position);
			}
		}
	}

	/**
	 * Formatea el contenido del editor
	 */
	export function formatDocument() {
		if (editor) {
			editor.getAction('editor.action.formatDocument')?.run();
		}
	}

	/**
	 * Obtiene el valor actual del editor
	 */
	export function getValue() {
		return editor?.getValue() || '';
	}

	/**
	 * Establece el foco en el editor
	 */
	export function focus() {
		editor?.focus();
	}

	// Efecto para actualizar el tema cuando cambie
	$effect(() => {
		if (editor && monaco) {
			monaco.editor.setTheme($theme === 'dark' ? 'vs-dark' : 'vs');
		}
	});

	// Efecto para actualizar el valor cuando cambie externamente
	$effect(() => {
		if (editor && value !== editor.getValue()) {
			updateEditorValue(value);
		}
	});

	// Montar el editor
	onMount(() => {
		loadMonaco();
	});

	// Limpiar al desmontar
	onDestroy(() => {
		if (editor) {
			editor.dispose();
			editor = null;
		}
	});
</script>

<div class="monaco-editor-wrapper" style="height: {height}px;">
	{#if loading}
		<div class="flex h-full items-center justify-center bg-gray-50 dark:bg-gray-900">
			<div class="text-center">
				<LoadingSpinner size="lg" />
				<p class="mt-2 text-sm text-gray-600 dark:text-gray-400">Cargando editor avanzado...</p>
			</div>
		</div>
	{:else if error}
		<div
			class="flex h-full items-center justify-center border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
		>
			<div class="p-4 text-center">
				<p class="text-sm font-medium text-red-800 dark:text-red-300">
					{m['monacoEditor.loadErrorTitle']()}
				</p>
				<p class="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
				<p class="mt-2 text-xs text-gray-600 dark:text-gray-400">Por favor usa el editor simple</p>
			</div>
		</div>
	{:else}
		<div bind:this={editorContainer} class="h-full w-full"></div>
	{/if}
</div>

<style>
	.monaco-editor-wrapper {
		border: 1px solid rgb(229 231 235);
		border-radius: 0.375rem;
		overflow: hidden;
	}

	:global(.dark) .monaco-editor-wrapper {
		border-color: rgb(55 65 81);
	}

	/* Asegurar que Monaco se renderice correctamente */
	.monaco-editor-wrapper :global(.monaco-editor) {
		height: 100% !important;
	}
</style>
