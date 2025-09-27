<!--
 * Vista en formato tabla para registros DynamoDB
 * Muestra datos en una tabla HTML responsive
-->
<script>
	import { Copy, MapPin, SquarePen, Edit3 } from 'lucide-svelte';
	import InlineFieldEditor from '$lib/components/ui/InlineFieldEditor.svelte';

	/**
	 * @typedef {Object} Record
	 * @property {Object} data - Datos del registro
	 */

	let {
		/** @type {Record[]} Lista de registros */
		records,
		/** @type {((record: Object) => void) | undefined} Callback para editar registro */
		onEditRecord,
		/** @type {((record: Object) => void) | undefined} Callback para eliminar registro */
		onDeleteRecord,
		/** @type {((record: Object, field: string, value: any) => void) | undefined} Callback para actualizar un campo específico */
		onUpdateField,
		/** @type {Object | null} Información de la tabla DynamoDB */
		tableInfo = null
	} = $props();

	/**
	 * Ordenar columnas por importancia
	 * @param {string[]} columns - Columnas de la tabla
	 * @returns {string[]} Columnas ordenadas
	 */
	function sortColumnsByImportance(columns) {
		if (!tableInfo || columns.length === 0) {
			return columns.sort();
		}

		const importantFields = new Set();

		// Agregar claves de la tabla principal
		if (tableInfo.KeySchema) {
			tableInfo.KeySchema.forEach(key => {
				importantFields.add(key.AttributeName);
			});
		}

		// Agregar claves de índices GSI
		if (tableInfo.GlobalSecondaryIndexes) {
			tableInfo.GlobalSecondaryIndexes.forEach(gsi => {
				if (gsi.KeySchema) {
					gsi.KeySchema.forEach(key => {
						importantFields.add(key.AttributeName);
					});
				}
			});
		}

		// Agregar claves de índices LSI
		if (tableInfo.LocalSecondaryIndexes) {
			tableInfo.LocalSecondaryIndexes.forEach(lsi => {
				if (lsi.KeySchema) {
					lsi.KeySchema.forEach(key => {
						importantFields.add(key.AttributeName);
					});
				}
			});
		}

		// Separar campos importantes y el resto
		const keyFields = columns.filter(col => importantFields.has(col)).sort();
		const otherFields = columns.filter(col => !importantFields.has(col)).sort();

		// Devolver campos importantes primero, luego el resto
		return [...keyFields, ...otherFields];
	}

	/** Columnas extraídas de los registros */
	const columns = $derived(() => {
		if (records.length === 0) return [];

		// Obtener todas las columnas únicas de todos los registros
		/**
		 * @type {string[]}
		 */
		const allKeysArray = [];
		records.forEach((/** @type {{}} */ record) => {
			Object.keys(record).forEach((key) => {
				if (!allKeysArray.includes(key)) {
					allKeysArray.push(key);
				}
			});
		});

		return sortColumnsByImportance(allKeysArray);
	});

	/**
	 * Formatea un valor para mostrar en la tabla
	 * @param {any} value - Valor a formatear
	 * @returns {string} Valor formateado
	 */
	function formatValue(value) {
		if (value === null || value === undefined) {
			return '—';
		}

		if (typeof value === 'object') {
			if (Array.isArray(value)) {
				return `[${value.length} items]`;
			}
			return '{objeto}';
		}

		if (typeof value === 'boolean') {
			return value ? 'true' : 'false';
		}

		if (typeof value === 'string' && value.length > 100) {
			return value.substring(0, 100) + '...';
		}

		return String(value);
	}

	/**
	 * Obtiene el tipo de dato para el estilo CSS
	 * @param {any} value - Valor a evaluar
	 * @returns {string} Clase CSS del tipo
	 */
	function getValueType(value) {
		if (value === null || value === undefined) {
			return 'text-gray-400 dark:text-gray-500 italic';
		}

		if (typeof value === 'number') {
			return 'text-blue-600 dark:text-blue-400 font-mono';
		}

		if (typeof value === 'boolean') {
			return 'text-green-600 dark:text-green-400 font-mono';
		}

		if (typeof value === 'object') {
			return 'text-purple-600 dark:text-purple-400 italic';
		}

		return 'text-gray-900 dark:text-white';
	}

	/**
	 * Copia un valor al portapapeles
	 * @param {any} value - Valor a copiar
	 */
	async function copyToClipboard(value) {
		const textToCopy = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);

		try {
			await navigator.clipboard.writeText(textToCopy);
			// TODO: Mostrar toast de confirmación
		} catch (err) {
			console.error('Error copiando al portapapeles:', err);
		}
	}

	/**
	 * Verifica si una columna contiene datos numéricos principalmente
	 * @param {string} column - Nombre de la columna
	 * @returns {boolean} Si es principalmente numérica
	 */
	function isNumericColumn(column) {
		const values = records
			.map((/** @type {{ [x: string]: any; }} */ record) => record[column])
			.filter((/** @type {null | undefined} */ v) => v !== null && v !== undefined);
		const numericCount = values.filter((/** @type {any} */ v) => typeof v === 'number').length;
		return numericCount > values.length * 0.7; // 70% o más son números
	}

	// Estado para controlar qué celda está en edición
	let editingCell = $state(null);

	/**
	 * Inicia la edición inline de un campo
	 * @param {number} recordIndex - Índice del registro
	 * @param {string} column - Nombre de la columna
	 * @param {any} value - Valor actual
	 */
	function startInlineEdit(recordIndex, column, value) {
		// Solo permitir edición de valores primitivos
		if (typeof value === 'object' && value !== null) {
			return;
		}
		editingCell = { recordIndex, column, value };
	}

	/**
	 * Acepta el cambio en la edición inline
	 * @param {any} newValue - Nuevo valor
	 */
	function acceptInlineEdit(newValue) {
		if (editingCell && onUpdateField) {
			const record = records[editingCell.recordIndex];
			onUpdateField(record, editingCell.column, newValue);
		}
		editingCell = null;
	}

	/**
	 * Cancela la edición inline
	 */
	function cancelInlineEdit() {
		editingCell = null;
	}

	/**
	 * Determina si un valor es editable inline
	 * @param {any} value - Valor a verificar
	 * @returns {boolean}
	 */
	function isEditableInline(value) {
		return value === null ||
			   value === undefined ||
			   typeof value === 'string' ||
			   typeof value === 'number' ||
			   typeof value === 'boolean';
	}

	/**
	 * Obtiene el tipo de campo para el editor
	 * @param {any} value - Valor del campo
	 * @returns {'string' | 'number' | 'boolean'}
	 */
	function getFieldType(value) {
		if (typeof value === 'number') return 'number';
		if (typeof value === 'boolean') return 'boolean';
		return 'string';
	}
</script>

<div class="flex h-full flex-col gap-2">
	<div class="flex-1 overflow-auto">
		<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
			<!-- Header -->
			<thead class="bg-gray-50 dark:bg-gray-800">
				<tr>
					<th
						class="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 p-2 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-300 uppercase"
					>
						#
					</th>
					{#if onEditRecord || onDeleteRecord}
						<th
							class="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-300 uppercase"
						>
							Acciones
						</th>
					{/if}
					{#each columns() as column (column)}
						<th
							class="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-300 uppercase {isNumericColumn(
								column
							)
								? 'text-right'
								: ''}"
						>
							<div class="flex items-center gap-2">
								<span class="truncate" title={column}>{column}</span>

								<!-- Indicador de tipo -->
								{#if isNumericColumn(column)}
									<MapPin size={12} class="text-blue-500" />
								{/if}
							</div>
						</th>
					{/each}
				</tr>
			</thead>

			<!-- Body -->
			<tbody class="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
				{#each records as record, index (index)}
					<tr class="group transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
						<td class="p-2 text-sm text-gray-900 dark:text-white">{index + 1}</td>
						{#if onEditRecord || onDeleteRecord}
							<td class="px-3 py-2">
								<div class="flex items-center gap-1">
									{#if onEditRecord}
										<button
											type="button"
											class="rounded-md p-1.5 text-gray-400 dark:text-gray-500 opacity-0 transition-all group-hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300"
											onclick={() => onEditRecord?.(record)}
											title="Editar registro"
										>
											<SquarePen size={16} />
											<span class="sr-only">Editar registro</span>
										</button>
									{/if}
									{#if onDeleteRecord}
										<button
											type="button"
											class="rounded-md p-1.5 text-gray-400 dark:text-gray-500 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400"
											onclick={() => onDeleteRecord?.(record)}
											title="Eliminar registro"
										>
											<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
												/>
											</svg>
											<span class="sr-only">Eliminar registro</span>
										</button>
									{/if}
								</div>
							</td>
						{/if}
						{#each columns() as column (column)}
							{@const value = record[column]}
							{@const formattedValue = formatValue(value)}
							{@const valueClass = getValueType(value)}
							{@const isEditing = editingCell?.recordIndex === index && editingCell?.column === column}
							{@const canEditInline = isEditableInline(value) && onUpdateField}

							<td
								class="group relative p-2 text-sm whitespace-nowrap {valueClass} {isNumericColumn(column)
									? 'text-right'
									: ''}"
							>
								<div class="flex items-center gap-2 {isNumericColumn(column) ? 'justify-end' : ''}">
									{#if isEditing}
										<!-- Editor inline activo -->
										<InlineFieldEditor
											bind:value={editingCell.value}
											fieldType={getFieldType(value)}
											onAccept={() => acceptInlineEdit(editingCell.value)}
											onCancel={cancelInlineEdit}
											position="bottom"
										/>
										<span class="rounded bg-blue-50 dark:bg-blue-900/20 px-2 py-1 text-blue-600 dark:text-blue-300">
											{formattedValue}
										</span>
									{:else}
										<!-- Valor normal -->
										<button
											class="cursor-pointer rounded px-2 py-1 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
											title="Clic para copiar: {typeof value === 'object'
												? JSON.stringify(value)
												: String(value)}"
											onclick={() => copyToClipboard(value)}
										>
											{formattedValue}
										</button>

										<!-- Botón de edición inline para campos simples -->
										{#if canEditInline}
											<button
												type="button"
												class="text-blue-500 dark:text-blue-400 opacity-0 transition-all group-hover:opacity-100 hover:text-blue-700 dark:hover:text-blue-300"
												onclick={() => startInlineEdit(index, column, value)}
												title="Editar campo"
											>
												<Edit3 size={12} />
												<span class="sr-only">Editar campo</span>
											</button>
										{/if}

										<!-- Icono de copia -->
										{#if value !== null && value !== undefined}
											<button
												type="button"
												class="text-gray-400 dark:text-gray-500 opacity-0 transition-all group-hover:opacity-100 hover:text-gray-600 dark:hover:text-gray-300 hover:opacity-100"
												onclick={() => copyToClipboard(value)}
												title="Copiar valor"
											>
												<Copy size={12} />
												<span class="sr-only">Copiar valor</span>
											</button>
										{/if}
									{/if}
								</div>
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<!-- Footer con información -->
	<div class="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-2">
		<div class="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
			<span>{records.length} registros mostrados</span>
			<span>{columns.length} columnas</span>
		</div>
	</div>
</div>
