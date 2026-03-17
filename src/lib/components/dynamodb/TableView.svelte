<!--
 * Vista en formato tabla para registros DynamoDB
 * Muestra datos en una tabla HTML responsive
-->
<script>
	import { SvelteSet, SvelteMap } from 'svelte/reactivity';
	import {
		Copy,
		MapPin,
		SquarePen,
		PenLine,
		ArrowUp,
		ArrowDown,
		Key,
		Ellipsis,
		Trash2
	} from 'lucide-svelte';
	import InlineFieldEditor from '$lib/components/ui/InlineFieldEditor.svelte';
	import { notifySuccess, notifyError } from '$lib/stores/notifications.js';
	import * as m from '$lib/paraglide/messages.js';

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

	// Estado para ordenamiento de columnas
	let sortColumn = $state(/** @type {string | null} */ (null));
	let sortDirection = $state(/** @type {'asc' | 'desc'} */ ('asc'));

	// Estado para selección múltiple (SvelteSet reactivo; $state necesario para que la asignación en toggleAllRows actualice la vista)
	// eslint-disable-next-line svelte/no-unnecessary-state-wrap -- asignación selectedRows = new SvelteSet() debe ser reactiva
	let selectedRows = $state(
		/** @type {InstanceType<typeof SvelteSet<number>>} */ (new SvelteSet())
	);

	// Sin paginación interna — RecordViewer controla cuántos registros pide al servidor

	// Estado para redimensionamiento de columnas (asignación en handleResize/loadColumnWidths debe ser reactiva)
	// eslint-disable-next-line svelte/no-unnecessary-state-wrap -- asignación columnWidths = new SvelteMap() debe ser reactiva
	let columnWidths = $state(
		/** @type {InstanceType<typeof SvelteMap<string, number>>} */ (new SvelteMap())
	);
	let resizingColumn = $state(/** @type {string | null} */ (null));
	let resizeStartX = $state(0);
	let resizeStartWidth = $state(0);

	/**
	 * Ordenar columnas por importancia
	 * @param {string[]} columns - Columnas de la tabla
	 * @returns {string[]} Columnas ordenadas
	 */
	function sortColumnsByImportance(columns) {
		if (!tableInfo || columns.length === 0) {
			return columns.sort();
		}

		const importantFields = new SvelteSet();

		// Agregar claves de la tabla principal
		if (tableInfo.KeySchema) {
			tableInfo.KeySchema.forEach((/** @type {{ AttributeName: string }} */ key) => {
				importantFields.add(key.AttributeName);
			});
		}

		// Agregar claves de índices GSI
		if (tableInfo.GlobalSecondaryIndexes) {
			tableInfo.GlobalSecondaryIndexes.forEach(
				(/** @type {{ KeySchema?: { AttributeName: string }[] }} */ gsi) => {
					if (gsi.KeySchema) {
						gsi.KeySchema.forEach((/** @type {{ AttributeName: string }} */ key) => {
							importantFields.add(key.AttributeName);
						});
					}
				}
			);
		}

		// Agregar claves de índices LSI
		if (tableInfo.LocalSecondaryIndexes) {
			tableInfo.LocalSecondaryIndexes.forEach(
				(/** @type {{ KeySchema?: { AttributeName: string }[] }} */ lsi) => {
					if (lsi.KeySchema) {
						lsi.KeySchema.forEach((/** @type {{ AttributeName: string }} */ key) => {
							importantFields.add(key.AttributeName);
						});
					}
				}
			);
		}

		// Separar campos importantes y el resto
		const keyFields = columns.filter((col) => importantFields.has(col)).sort();
		const otherFields = columns.filter((col) => !importantFields.has(col)).sort();

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
				return m['record.arrayItems']({ count: value.length });
			}
			return m['record.object']({ object: JSON.stringify(value) });
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
			notifySuccess(m['notifications.copiedToClipboard']());
		} catch (err) {
			console.error('Error copiando al portapapeles:', err);
			notifyError(m['notifications.copyError']());
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
	/** @type {{ recordIndex: number; column: string; value: any } | null} */
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
		return (
			value === null ||
			value === undefined ||
			typeof value === 'string' ||
			typeof value === 'number' ||
			typeof value === 'boolean'
		);
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

	/**
	 * Verifica si una columna es clave primaria
	 * @param {string} column - Nombre de la columna
	 * @returns {boolean}
	 */
	function isPrimaryKeyColumn(column) {
		if (!tableInfo?.KeySchema) return false;
		return tableInfo.KeySchema.some(
			(/** @type {{ AttributeName: string }} */ key) => key.AttributeName === column
		);
	}

	/**
	 * Maneja el ordenamiento por columna
	 * @param {string} column - Nombre de la columna
	 */
	function handleSort(column) {
		if (sortColumn === column) {
			// Cambiar dirección o resetear
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortColumn = column;
			sortDirection = 'asc';
		}
	}

	/**
	 * Ordena los registros según el estado actual
	 */
	const sortedRecords = $derived(() => {
		const col = sortColumn;
		if (!col) return records;

		return [...records].sort(
			(/** @type {{ [x: string]: any }} */ a, /** @type {{ [x: string]: any }} */ b) => {
				const aVal = a[col];
				const bVal = b[col];

				// Manejar valores nulos/undefined
				if (aVal == null && bVal == null) return 0;
				if (aVal == null) return 1;
				if (bVal == null) return -1;

				// Comparar según tipo
				let comparison = 0;
				if (typeof aVal === 'number' && typeof bVal === 'number') {
					comparison = aVal - bVal;
				} else if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
					comparison = aVal === bVal ? 0 : aVal ? 1 : -1;
				} else {
					comparison = String(aVal).localeCompare(String(bVal));
				}

				return sortDirection === 'asc' ? comparison : -comparison;
			}
		);
	});

	/**
	 * Registros visibles (todos los que llegaron del servidor)
	 */
	const visibleRecords = $derived(() => {
		return sortedRecords();
	});

	/**
	 * Alterna la selección de una fila
	 * @param {number} index - Índice de la fila
	 */
	function toggleRowSelection(index) {
		if (selectedRows.has(index)) {
			selectedRows.delete(index);
		} else {
			selectedRows.add(index);
		}
		selectedRows = selectedRows; // Trigger reactivity
	}

	/**
	 * Alterna selección de todas las filas
	 */
	function toggleAllRows() {
		if (selectedRows.size === records.length) {
			selectedRows.clear();
		} else {
			selectedRows = new SvelteSet(
				records.map((/** @type {any} */ _r, /** @type {number} */ i) => i)
			);
		}
	}

	/**
	 * Inicia el redimensionamiento de una columna
	 * @param {MouseEvent} event - Evento de mouse
	 * @param {string} column - Nombre de la columna
	 * @param {number} currentWidth - Ancho actual de la columna
	 */
	function startResize(event, column, currentWidth) {
		// Prevenir todos los comportamientos por defecto
		event.preventDefault();
		event.stopPropagation();
		event.stopImmediatePropagation();

		resizingColumn = column;
		resizeStartX = event.clientX;
		resizeStartWidth = currentWidth;

		// Agregar listeners globales
		document.addEventListener('mousemove', handleResize);
		document.addEventListener('mouseup', stopResize);

		// Agregar clase al body para evitar selección de texto
		document.body.style.userSelect = 'none';
		document.body.style.cursor = 'col-resize';
	}

	/**
	 * Maneja el redimensionamiento mientras se arrastra
	 * @param {MouseEvent} event - Evento de mouse
	 */
	function handleResize(event) {
		if (!resizingColumn) return;

		const delta = event.clientX - resizeStartX;
		const newWidth = Math.max(80, resizeStartWidth + delta); // Mínimo 80px

		// Crear nuevo SvelteMap para reactividad
		const next = new SvelteMap(columnWidths);
		next.set(resizingColumn, newWidth);
		columnWidths = next;
	}

	/**
	 * Detiene el redimensionamiento
	 */
	function stopResize() {
		if (resizingColumn) {
			// Guardar en localStorage
			try {
				const widthsObj = Object.fromEntries(columnWidths);
				localStorage.setItem('tableColumnWidths', JSON.stringify(widthsObj));
			} catch (err) {
				console.error('Error guardando anchos de columnas:', err);
			}
		}

		resizingColumn = null;
		document.removeEventListener('mousemove', handleResize);
		document.removeEventListener('mouseup', stopResize);

		// Restaurar estilos del body
		document.body.style.userSelect = '';
		document.body.style.cursor = '';
	}

	/**
	 * Obtiene el ancho de una columna
	 * @param {string} column - Nombre de la columna
	 * @returns {number} Ancho en píxeles
	 */
	function getColumnWidth(column) {
		return columnWidths.get(column) || 200; // Default 200px
	}

	/**
	 * Carga los anchos de columnas desde localStorage
	 */
	function loadColumnWidths() {
		try {
			const saved = localStorage.getItem('tableColumnWidths');
			if (saved) {
				const widthsObj = JSON.parse(saved);
				columnWidths = new SvelteMap(Object.entries(widthsObj).map(([k, v]) => [k, Number(v)]));
			}
		} catch (err) {
			console.error('Error cargando anchos de columnas:', err);
		}
	}

	// Cargar anchos al montar
	$effect(() => {
		if (typeof window !== 'undefined') {
			loadColumnWidths();
		}
	});
</script>

<div class="flex h-full flex-col gap-2">
	<div class="flex-1 overflow-auto">
		<table class="min-w-full table-fixed divide-y divide-gray-200 dark:divide-gray-700">
			<!-- Header -->
			<thead class="bg-gray-50 dark:bg-gray-800">
				<tr>
					<!-- Checkbox para selección múltiple -->
					<th
						class="group/header sticky top-0 left-0 z-20 w-8 bg-gray-50 p-2 text-center dark:bg-gray-800"
					>
						<input
							type="checkbox"
							class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
							checked={selectedRows.size === records.length && records.length > 0}
							indeterminate={selectedRows.size > 0 && selectedRows.size < records.length}
							onchange={toggleAllRows}
						/>
					</th>
					<!-- Número de fila -->
					<th
						class="group/header sticky top-0 left-8 z-20 bg-gray-50 p-2 text-right text-xs font-medium text-gray-500 uppercase dark:bg-gray-800 dark:text-gray-300"
						style="width: 48px; min-width: 48px; max-width: 48px;"
					>
						#
					</th>
					<!-- Acciones (sticky a la derecha) -->
					{#if onEditRecord || onDeleteRecord}
						<th
							class="group/header sticky top-0 left-20 z-20 w-20 bg-gray-50 px-3 py-3 text-xs font-medium text-gray-500 uppercase [box-shadow:inset_2px_0_0_0_theme(colors.gray.300)] dark:bg-gray-800 dark:text-gray-300 dark:[box-shadow:inset_2px_0_0_0_theme(colors.gray.600)]"
							title={m['record.actionsTitle']()}
						>
							<div class="flex items-center justify-center">
								<Ellipsis size={16} class="text-gray-400 dark:text-gray-400" aria-hidden="true" />
							</div>
						</th>
					{/if}
					<!-- Columnas de datos -->
					{#each columns() as column (column)}
						{@const isPK = isPrimaryKeyColumn(column)}
						{@const isNumeric = isNumericColumn(column)}
						{@const colWidth = getColumnWidth(column)}
						<th
							class="group/header sticky top-0 cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase transition-colors select-none hover:bg-gray-100 dark:hover:bg-gray-700
							 {isPK ? 'left-40 z-20 bg-blue-50 dark:bg-blue-950' : 'z-10 bg-gray-50 dark:bg-gray-800'} {isNumeric
								? 'text-right'
								: ''} text-gray-500 dark:text-gray-300"
							style="width: {colWidth}px; min-width: {colWidth}px; max-width: {colWidth}px;"
							onclick={() => handleSort(column)}
							title={`Ordenar por ${column}`}
						>
							<div class="flex items-center gap-2 {isNumeric ? 'justify-end' : ''}">
								<!-- Icono de clave primaria -->
								{#if isPK}
									<Key size={12} class="text-blue-600 dark:text-blue-400" />
								{/if}

								<span class="truncate" title={column}>{column}</span>

								<!-- Indicador de ordenamiento -->
								{#if sortColumn === column}
									{#if sortDirection === 'asc'}
										<ArrowUp size={12} class="text-blue-600 dark:text-blue-400" />
									{:else}
										<ArrowDown size={12} class="text-blue-600 dark:text-blue-400" />
									{/if}
								{/if}

								<!-- Indicador de tipo numérico -->
								{#if isNumeric && !isPK}
									<MapPin
										size={12}
										class="text-gray-400"
										aria-label={m['record.numericColumnAriaLabel']()}
									/>
								{/if}
							</div>

							<!-- Handle de redimensionamiento -->
							<button
								type="button"
								aria-label={m['record.resizeColumnAriaLabel']()}
								class="absolute top-0 right-0 h-full w-1.5 cursor-col-resize border-0 bg-transparent p-0 hover:bg-blue-500 dark:hover:bg-blue-400 {resizingColumn ===
								column
									? 'w-2 bg-blue-600 dark:bg-blue-500'
									: ''}"
								style="z-index: 100;"
								onmousedown={(e) => startResize(e, column, colWidth)}
								onclick={(e) => {
									e.preventDefault();
									e.stopPropagation();
								}}
								ondblclick={(e) => {
									e.preventDefault();
									e.stopPropagation();
								}}
								onkeydown={(e) => {
									if (e.key === ' ' || e.key === 'Enter') e.preventDefault();
								}}
								title={m['record.resizeColumnTitle']()}
							></button>
						</th>
					{/each}
				</tr>
			</thead>

			<!-- Body -->
			<tbody class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
				{#each visibleRecords() as record, index (index)}
					<tr
						class="group transition-colors focus-within:bg-gray-50 hover:bg-gray-50 dark:focus-within:bg-gray-800 dark:hover:bg-gray-800 {selectedRows.has(
							index
						)
							? 'bg-blue-50 dark:bg-slate-800'
							: ''}"
					>
						<!-- Checkbox de selección -->
						<td
							class="sticky left-0 z-10 p-2 {selectedRows.has(index)
								? 'bg-blue-50 dark:bg-slate-800'
								: 'bg-white group-hover:bg-gray-50 dark:bg-gray-900 dark:group-hover:bg-gray-800'}"
						>
							<input
								type="checkbox"
								class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
								checked={selectedRows.has(index)}
								onchange={() => toggleRowSelection(index)}
							/>
						</td>
						<!-- Número de fila -->
						<td
							class="sticky left-8 z-10 p-2 text-right text-sm text-gray-900 dark:text-white {selectedRows.has(
								index
							)
								? 'bg-blue-50 dark:bg-slate-800'
								: 'bg-white group-hover:bg-gray-50 dark:bg-gray-900 dark:group-hover:bg-gray-800'}"
							style="width: 48px; min-width: 48px; max-width: 48px;">{index + 1}</td
						>
						{#if onEditRecord || onDeleteRecord}
							<td
								class="sticky left-20 z-10 p-2 [box-shadow:inset_2px_0_0_0_theme(colors.gray.300)] dark:[box-shadow:inset_2px_0_0_0_theme(colors.gray.600)] {selectedRows.has(
									index
								)
									? 'bg-blue-50 dark:bg-slate-800'
									: 'bg-white group-hover:bg-gray-50 dark:bg-gray-900 dark:group-hover:bg-gray-800'}"
							>
								<div class="flex items-center gap-1">
									{#if onEditRecord}
										<button
											type="button"
											class="rounded-md p-1.5 text-gray-400 opacity-0 transition-all group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-300"
											onclick={() => onEditRecord?.(record)}
											title={m['record.edit']()}
											aria-label={m['record.editAriaLabel']()}
										>
											<SquarePen size={16} />
											<span class="sr-only">{m['record.edit']()}</span>
										</button>
									{/if}
									{#if onDeleteRecord}
										<button
											type="button"
											class="rounded-md p-1.5 text-gray-400 opacity-0 transition-all group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 dark:text-gray-500 dark:hover:bg-red-900 dark:hover:text-red-400"
											onclick={() => onDeleteRecord?.(record)}
											title={m['record.delete']()}
											aria-label={m['record.deleteAriaLabel']()}
										>
											<Trash2 size={16} />
											<span class="sr-only">{m['record.delete']()}</span>
										</button>
									{/if}
								</div>
							</td>
						{/if}
						{#each columns() as column (column)}
							{@const value = record[column]}
							{@const formattedValue = formatValue(value)}
							{@const valueClass = getValueType(value)}
							{@const isEditing =
								editingCell?.recordIndex === index && editingCell?.column === column}
							{@const canEditInline = isEditableInline(value) && onUpdateField}
							{@const isPK = isPrimaryKeyColumn(column)}
							{@const cellBg = isPK
								? selectedRows.has(index)
									? 'bg-blue-100 dark:bg-blue-950'
									: 'bg-blue-50 dark:bg-slate-800 group-hover:bg-blue-100 dark:group-hover:bg-blue-950'
								: selectedRows.has(index)
									? 'bg-blue-50 dark:bg-slate-800'
									: 'bg-white dark:bg-gray-900 group-hover:bg-gray-50 dark:group-hover:bg-gray-800'}
							{@const colWidth = getColumnWidth(column)}

							<td
								class="group relative p-2 text-sm {valueClass} 
								{isNumericColumn(column) ? 'text-right' : ''} 
									{isPK ? 'sticky left-40 z-10 font-semibold' : ''} {cellBg}"
								style="width: {colWidth}px; min-width: {colWidth}px; max-width: {colWidth}px;"
							>
								<div class="flex items-center gap-2 {isNumericColumn(column) ? 'justify-end' : ''}">
									{#if isEditing && editingCell}
										<!-- Editor inline activo -->
										<InlineFieldEditor
											bind:value={editingCell.value}
											fieldType={getFieldType(value)}
											onAccept={(/** @type {any} */ newVal) => acceptInlineEdit(newVal)}
											onCancel={cancelInlineEdit}
											position="bottom"
										/>
										<span
											class="rounded bg-blue-50 px-2 py-1 text-blue-600 dark:bg-blue-950 dark:text-blue-300"
										>
											{formattedValue}
										</span>
									{:else}
										<!-- Valor normal -->
										<button
											tabindex="0"
											class="block max-w-full cursor-pointer truncate rounded px-2 py-1 transition-colors hover:bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:hover:bg-gray-700 dark:focus:ring-blue-400"
											title={m['record.copyTooltip']({ value: formattedValue })}
											onclick={() => copyToClipboard(value)}
											aria-label={m['record.copyAriaLabel']()}
										>
											{formattedValue}
										</button>

										<!-- Botón de edición inline para campos simples -->
										{#if canEditInline}
											<button
												type="button"
												class="text-blue-500 opacity-0 transition-all group-focus-within:opacity-100 group-hover:opacity-100 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
												onclick={() => startInlineEdit(index, column, value)}
												title={m['record.editField']()}
												aria-label={m['record.editFieldAriaLabel']()}
											>
												<PenLine size={12} />
												<span class="sr-only">{m['record.editField']()}</span>
											</button>
										{/if}

										<!-- Icono de copia -->
										{#if value !== null && value !== undefined}
											<button
												type="button"
												class="text-gray-400 opacity-0 transition-all group-focus-within:opacity-100 group-hover:opacity-100 hover:text-gray-600 focus:opacity-100 dark:text-gray-500 dark:hover:text-gray-300"
												onclick={() => copyToClipboard(value)}
												title={m['record.copy']()}
												aria-label={m['record.copyAriaLabel']()}
											>
												<Copy size={12} />
												<span class="sr-only">{m['record.copy']()}</span>
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
	<div class="border-t border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
		<div class="flex items-center justify-between text-sm">
			<div class="flex items-center gap-4">
				<span class="text-gray-600 dark:text-gray-300">
					Mostrando {visibleRecords().length} de {records.length} registros
				</span>
				<span class="text-gray-500 dark:text-gray-400">
					{columns().length} columnas
				</span>
				{#if selectedRows.size > 0}
					<span class="font-medium text-blue-600 dark:text-blue-400">
						{selectedRows.size} seleccionados
					</span>
				{/if}
			</div>
		</div>
	</div>
</div>
