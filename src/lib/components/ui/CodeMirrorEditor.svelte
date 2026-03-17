<!--
 * Editor JSON avanzado usando CodeMirror 6
 * Más ligero y compatible que Monaco Editor
-->
<script>
	import { onMount, onDestroy } from 'svelte';
	import { EditorView, basicSetup } from 'codemirror';
	import { json } from '@codemirror/lang-json';
	import { oneDark } from '@codemirror/theme-one-dark';
	import { theme } from '$lib/stores/theme.js';

	let {
		/** @type {string} Contenido del editor */
		value = $bindable(''),
		/** @type {boolean} Si está en modo de solo lectura */
		readOnly = false,
		/** @type {number} Altura del editor en px */
		height = 400,
		/** @type {(() => void) | undefined} Callback cuando cambia el valor */
		onchange
	} = $props();

	/** @type {HTMLElement | null} */
	let editorContainer = $state(null);

	/** @type {EditorView | null} */
	let editorView = null;

	/** Si está listo el editor */
	let ready = $state(false);

	/**
	 * Inicializa el editor CodeMirror
	 */
	function initEditor() {
		if (!editorContainer) return;

		try {
			// Crear el editor
			editorView = new EditorView({
				doc: value,
				extensions: [
					basicSetup,
					json(),
					$theme === 'dark' ? oneDark : [],
					EditorView.editable.of(!readOnly),
					EditorView.updateListener.of((update) => {
						if (update.docChanged) {
							const newValue = update.state.doc.toString();
							if (newValue !== value) {
								value = newValue;
								onchange?.();
							}
						}
					})
				],
				parent: editorContainer
			});

			ready = true;
		} catch (err) {
			console.error('Error inicializando CodeMirror:', err);
		}
	}

	/**
	 * Actualiza el valor del editor
	 */
	/** @param {string} newValue */
	function updateEditorValue(newValue) {
		if (editorView && editorView.state.doc.toString() !== newValue) {
			editorView.dispatch({
				changes: {
					from: 0,
					to: editorView.state.doc.length,
					insert: newValue
				}
			});
		}
	}

	/**
	 * Actualiza el tema del editor
	 */
	function updateTheme() {
		if (!editorView) return;

		editorView.dispatch({
			effects: [
				// Reconfiguramos las extensiones para actualizar el tema
			]
		});
	}

	/**
	 * Formatea el documento
	 */
	export function formatDocument() {
		if (!editorView) return;

		try {
			const currentValue = editorView.state.doc.toString();
			const parsed = JSON.parse(currentValue);
			const formatted = JSON.stringify(parsed, null, 2);

			editorView.dispatch({
				changes: {
					from: 0,
					to: editorView.state.doc.length,
					insert: formatted
				}
			});
		} catch (err) {
			console.error('Error formateando JSON:', err);
		}
	}

	/**
	 * Obtiene el valor actual del editor
	 */
	export function getValue() {
		return editorView?.state.doc.toString() || '';
	}

	/**
	 * Establece el foco en el editor
	 */
	export function focus() {
		editorView?.focus();
	}

	// Efecto para actualizar el valor cuando cambie externamente
	$effect(() => {
		if (editorView && ready && value !== editorView.state.doc.toString()) {
			updateEditorValue(value);
		}
	});

	// Efecto para actualizar el tema cuando cambie
	$effect(() => {
		if (editorView && ready) {
			updateTheme();
		}
	});

	// Montar el editor
	onMount(() => {
		initEditor();
	});

	// Limpiar al desmontar
	onDestroy(() => {
		if (editorView) {
			editorView.destroy();
			editorView = null;
		}
	});
</script>

<div
	class="codemirror-wrapper overflow-hidden rounded-md border border-gray-300 dark:border-gray-700"
	style="height: {height}px;"
>
	<div bind:this={editorContainer} class="h-full w-full"></div>
</div>

<style>
	.codemirror-wrapper :global(.cm-editor) {
		height: 100%;
		font-size: 14px;
	}

	.codemirror-wrapper :global(.cm-scroller) {
		overflow: auto;
	}

	/* Tema claro personalizado */
	.codemirror-wrapper :global(.cm-editor:not(.cm-focused)) {
		outline: none;
	}
</style>
