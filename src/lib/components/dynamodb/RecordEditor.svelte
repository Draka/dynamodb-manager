<!--
 * Editor de registros DynamoDB en formato JSON
 * Permite editar registros con validación en tiempo real
-->
<script>
	import { Button } from '../ui/Button';
	import { LoadingSpinner } from '../ui/LoadingSpinner';
	import { dynamoDbApi } from '../../services/api-client.js';
	import { X, CircleCheckBig, AlignLeft, Code } from 'lucide-svelte';

	let {
		/** @type {Object} Registro a editar */
		record,
		/** @type {string} Nombre de la tabla */
		tableName,
		/** @type {boolean} Si el editor está abierto */
		isOpen = $bindable(false),
		/** @type {(() => void) | undefined} Callback al cerrar */
		onClose,
		/** @type {((updatedRecord: Object) => void) | undefined} Callback al guardar */
		onSave
	} = $props();

	/** Estados del editor */
	let jsonText = $state('');
	let originalJsonText = $state('');
	let isValid = $state(true);
	let validationError = $state('');
	let saving = $state(false);
	let hasChanges = $state(false);

	/**
	 * Valida el JSON y actualiza el estado
	 */
	function validateJson() {
		try {
			if (!jsonText.trim()) {
				isValid = false;
				validationError = 'El JSON no puede estar vacío';
				return;
			}

			JSON.parse(jsonText);
			isValid = true;
			validationError = '';
		} catch (/** @type {any} */ error) {
			isValid = false;
			validationError = error.message;
		}
	}

	/**
	 * Formatea el JSON con indentación
	 */
	function formatJson() {
		try {
			if (jsonText.trim()) {
				const parsed = JSON.parse(jsonText);
				jsonText = JSON.stringify(parsed, null, 2);
				validateJson();
			}
		} catch (error) {
			// El formato fallará si el JSON es inválido, mantener texto actual
		}
	}

	/**
	 * Detecta cambios en el JSON
	 */
	function checkForChanges() {
		hasChanges = jsonText !== originalJsonText;
		validateJson();
	}

	/**
	 * Guarda los cambios
	 */
	async function saveChanges() {
		if (!isValid) return;

		saving = true;

		try {
			const updatedRecord = JSON.parse(jsonText);

			// Usar el registro completo para la actualización con PutCommand
			const response = await dynamoDbApi.updateItem(tableName, extractKeys(record), updatedRecord);

			if (response.success) {
				onSave?.(updatedRecord);
				onClose?.();
			} else {
				throw new Error(response.error || 'Error actualizando registro');
			}
		} catch (/** @type {any} */ error) {
			console.error('Error guardando registro:', error);
			validationError = `Error guardando: ${error.message}`;
		} finally {
			saving = false;
		}
	}

	/**
	 * Extrae las claves primarias del registro
	 * Para DynamoDB, normalmente necesitamos identificar la clave de partición (hash key)
	 * y la clave de ordenación (range key) si existe
	 * @param {any} record - Registro del que extraer las claves
	 * @returns {Object} Objeto con las claves primarias
	 */
	function extractKeys(record) {
		// Para el editor, simplemente usamos estrategia de fallback
		// ya que el PutCommand reemplazará el registro completo
		const commonKeyFields = ['id', 'pk', 'partitionKey', 'hashKey', 'userId', 'itemId'];
		const commonSortFields = ['sk', 'sortKey', 'rangeKey', 'timestamp', 'createdAt'];
		/** @type {any} */
		const keys = {};

		// Buscar clave de partición
		for (const field of commonKeyFields) {
			if (record[field] !== undefined) {
				keys[field] = record[field];
				break;
			}
		}

		// Buscar clave de ordenación
		for (const field of commonSortFields) {
			if (record[field] !== undefined) {
				keys[field] = record[field];
				break;
			}
		}

		// Si no encontramos claves comunes, usar el primer campo como clave
		if (Object.keys(keys).length === 0) {
			const firstKey = Object.keys(record)[0];
			if (firstKey) {
				keys[firstKey] = record[firstKey];
			}
		}

		return keys;
	}

	/**
	 * Cierra el editor
	 */
	function handleClose() {
		if (hasChanges) {
			const confirmed = confirm('¿Estás seguro? Los cambios no guardados se perderán.');
			if (!confirmed) return;
		}
		onClose?.();
	}

	/**
	 * Inicializa el editor cuando se abre
	 */
	$effect(() => {
		if (isOpen && record) {
			originalJsonText = JSON.stringify(record, null, 2);
			jsonText = originalJsonText;
			hasChanges = false;
			isValid = true;
			validationError = '';
		}
	});
</script>

<!-- Overlay del modal -->
{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-70"
		onclick={handleClose}
		onkeydown={(e) => {
			if (e.key === 'Escape') {
				handleClose();
			}
		}}
		role="button"
		tabindex="0"
		aria-label="Cerrar modal"
	>
		<!-- Panel del editor -->
		<div
			class="flex h-full w-full max-w-4xl flex-col bg-white dark:bg-gray-800 shadow-xl"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="button"
			tabindex="0"
		>
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
				<div>
					<h2 class="text-lg font-medium text-gray-900 dark:text-white">Editar Registro</h2>
					<p class="text-sm text-gray-600 dark:text-gray-300">Tabla: {tableName}</p>
				</div>
				<div class="flex items-center gap-2">
					{#if hasChanges}
						<span class="rounded-full bg-yellow-100 dark:bg-yellow-900/20 px-2 py-1 text-xs font-medium text-yellow-800 dark:text-yellow-400">
							Cambios sin guardar
						</span>
					{/if}
					<button
						class="rounded-md p-2 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300"
						onclick={handleClose}
						title="Cerrar"
					>
						<X size={20} />
					</button>
				</div>
			</div>

			<!-- Contenido -->
			<div class="flex flex-1 flex-col overflow-hidden">
				<!-- Toolbar -->
				<div class="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-6 py-3">
					<Button size="sm" variant="secondary" onclick={formatJson} disabled={!jsonText.trim()}>
						<AlignLeft size={16} class="mr-2" />
						Formatear JSON
					</Button>

					{#if validationError}
						<div class="flex items-center gap-2 text-red-600 dark:text-red-400">
							<Code size={16} />
							<span class="text-sm">JSON inválido</span>
						</div>
					{:else if isValid && jsonText.trim()}
						<div class="flex items-center gap-2 text-green-600 dark:text-green-400">
							<CircleCheckBig size={16} />
							<span class="text-sm">JSON válido</span>
						</div>
					{/if}
				</div>

				<!-- Editor -->
				<div class="flex-1 overflow-hidden">
					<textarea
						bind:value={jsonText}
						oninput={checkForChanges}
						class="h-full w-full resize-none border-none bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6 font-mono text-sm leading-relaxed focus:outline-none focus:ring-0"
						placeholder="Ingresa el JSON del registro..."
						spellcheck="false"
					></textarea>
				</div>

				<!-- Mensaje de error -->
				{#if validationError}
					<div class="border-t border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-6 py-3">
						<div class="flex items-start gap-2">
							<Code size={16} class="mt-0.5 text-red-500 dark:text-red-400" />
							<div>
								<p class="text-sm font-medium text-red-800 dark:text-red-300">Error de validación</p>
								<p class="text-sm text-red-700 dark:text-red-400">{validationError}</p>
							</div>
						</div>
					</div>
				{/if}
			</div>

			<!-- Footer con botones -->
			<div
				class="flex items-center justify-end gap-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-6 py-4"
			>
				<Button variant="secondary" onclick={handleClose} disabled={saving}>Cancelar</Button>
				<Button
					variant="primary"
					onclick={saveChanges}
					disabled={!isValid || !hasChanges || saving}
					loading={saving}
				>
					{#if saving}
						Guardando...
					{:else}
						Guardar Cambios
					{/if}
				</Button>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Mejorar el aspecto del textarea JSON */
	textarea::placeholder {
		color: #9ca3af;
	}
	:global(.dark) textarea::placeholder {
		color: #6b7280;
	}

	textarea:focus {
		background-color: #ffffff;
	}
	:global(.dark) textarea:focus {
		background-color: #111827;
	}
</style>
