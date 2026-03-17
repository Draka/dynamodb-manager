<!--
 * Visualizador principal de registros DynamoDB
 * Maneja la vista tabla y JSON con paginación
-->
<script>
	import { untrack } from 'svelte';
	import { Button } from '../ui/Button';
	import { LoadingSpinner } from '../ui/LoadingSpinner';
	import { Select } from '../ui/Select';
	import { TextInput } from '../ui/Input';
	import { isConnected } from '../../stores/current-connection.js';
	import { dynamoDbApi } from '../../services/api-client.js';
	import { debounce } from '../../utils/debounce.js';
	import TableView from './TableView.svelte';
	import JsonView from './JsonView.svelte';
	import DynamoDBRecordEditor from './DynamoDBRecordEditor.svelte';
	import {
		RefreshCw,
		AlertTriangle,
		Download,
		Archive,
		ChevronLeft,
		ChevronRight,
		Loader
	} from 'lucide-svelte';
	import * as m from '$lib/paraglide/messages.js';

	/**
	 * @typedef {Object} Record
	 * @property {Object} data - Datos del registro
	 */

	let {
		/** @type {string} Nombre de la tabla */
		tableName,
		/** @type {string} ID de la conexión a usar */
		connectionId
	} = $props();

	/** Estados del componente */
	let records = $state(/** @type {Record[]} */ ([]));
	let loading = $state(false);
	let error = $state(/** @type {string | null} */ (null));
	let viewMode = $state(/** @type {'table' | 'json'} */ ('table'));
	let currentPage = $state(1);
	let itemsPerPageStr = $state('25');
	let itemsPerPage = $derived(parseInt(itemsPerPageStr, 10) || 25);
	let totalItems = $state(0);
	let lastEvaluatedKey = $state(/** @type {Object | null} */ (null));
	let nextPageKeys = $state(/** @type {Array<Object | null>} */ ([])); // Stack para navegación

	/** Estados del editor de registros */
	let editorOpen = $state(false);
	let editingRecord = $state(/** @type {Object | null} */ (null));

	/** Estados del modal de confirmación de eliminación */
	let deleteConfirmOpen = $state(false);
	let deletingRecord = $state(/** @type {Object | null} */ (null));
	let deleting = $state(false);

	/** Información del esquema de la tabla */
	let tableSchema = $state(/** @type {any} */ (null));

	/** Opciones de items por página (value string para Select) */
	const itemsPerPageOptions = [
		{ value: '10', label: '10 items' },
		{ value: '25', label: '25 items' },
		{ value: '50', label: '50 items' },
		{ value: '100', label: '100 items' }
	];

	/** Filtros de búsqueda */
	let searchTerm = $state('');
	let searchField = $state('');
	let searchOperator = $state('contains');

	/** Operadores de búsqueda disponibles */
	const searchOperators = [
		{ value: 'contains', label: 'Contiene' },
		{ value: 'begins_with', label: 'Comienza con' },
		{ value: '=', label: 'Igual a' },
		{ value: '<>', label: 'Diferente de' },
		{ value: '>', label: 'Mayor que' },
		{ value: '<', label: 'Menor que' },
		{ value: '>=', label: 'Mayor o igual' },
		{ value: '<=', label: 'Menor o igual' }
	];

	/**
	 * Realiza un scan de la tabla usando API client
	 * @param {Object | null} startKey - Clave para continuar paginación
	 * @param {boolean} isNextPage - Si es navegación a página siguiente
	 * @param {number} [limitOverride] - Límite explícito (evita dependencia reactiva)
	 */
	async function scanTable(startKey = null, isNextPage = false, limitOverride = undefined) {
		if (!$isConnected || !tableName) {
			return;
		}

		// Leer itemsPerPage con untrack para evitar que el $effect de carga inicial
		// se suscriba a cambios de itemsPerPage (el $effect de previousItemsPerPage
		// es el único responsable de reaccionar a cambios de items por página).
		const limit = limitOverride ?? untrack(() => itemsPerPage);

		loading = true;
		error = null;

		try {
			/** @type {any} */
			const params = {
				limit,
				...(startKey && { lastEvaluatedKey: startKey })
			};

			// Agregar filtro si hay búsqueda
			if (searchTerm && searchField && searchOperator) {
				params.expressionAttributeNames = { '#field': searchField };
				params.expressionAttributeValues = { ':searchTerm': searchTerm };

				// Construir expresión según el operador
				if (searchOperator === 'contains') {
					params.filterExpression = `contains(#field, :searchTerm)`;
				} else if (searchOperator === 'begins_with') {
					params.filterExpression = `begins_with(#field, :searchTerm)`;
				} else {
					// Operadores de comparación (=, <>, <, >, <=, >=)
					params.filterExpression = `#field ${searchOperator} :searchTerm`;
				}
			}

			const response = await dynamoDbApi.scanTable(tableName, params);

			if (response.success) {
				records = response.data.items;
				lastEvaluatedKey = response.data.lastEvaluatedKey || null;
				totalItems = response.data.count;

				// Manejar navegación de páginas
				if (isNextPage && response.data.lastEvaluatedKey) {
					nextPageKeys.push(response.data.lastEvaluatedKey);
				}
			} else {
				error = response.error || 'Error desconocido escaneando tabla';
				records = [];
			}
		} catch (/** @type {any} */ err) {
			error = `Error escaneando tabla: ${err.message}`;
			console.error('Error en scan:', err);
			records = [];
		} finally {
			loading = false;
		}
	}

	/**
	 * Va a la página siguiente
	 */
	async function goToNextPage() {
		if (!lastEvaluatedKey) return;

		const limit = itemsPerPage; // capturar en el momento del click
		currentPage++;
		await scanTable(lastEvaluatedKey, true, limit);
	}

	/**
	 * Va a la página anterior
	 */
	async function goToPreviousPage() {
		if (currentPage <= 1) return;

		const limit = itemsPerPage; // capturar en el momento del click
		currentPage--;
		nextPageKeys.pop(); // Remover la última clave

		const previousKey = nextPageKeys[nextPageKeys.length - 1] || null;
		await scanTable(previousKey, false, limit);
	}

	/**
	 * Refresca los datos
	 */
	async function refreshData() {
		currentPage = 1;
		nextPageKeys = [];
		await scanTable();
	}

	/**
	 * Cambia el número de items por página
	 */
	async function handleItemsPerPageChange() {
		currentPage = 1;
		nextPageKeys = [];
		await scanTable();
	}

	/**
	 * Realiza búsqueda con filtros
	 */
	async function handleSearch() {
		currentPage = 1;
		nextPageKeys = [];
		await scanTable();
	}

	/**
	 * Versión debounced de handleSearch para búsqueda automática
	 */
	const debouncedSearch = debounce(handleSearch, 500);

	/**
	 * Auto-búsqueda con debounce cuando cambia el término de búsqueda
	 */
	$effect(() => {
		// Solo ejecutar si hay término de búsqueda y campo seleccionado
		if (searchTerm && searchField) {
			debouncedSearch();
		}
	});

	/**
	 * Reaccionar a cambios en items por página.
	 * _itemsPerPageMounted es un let normal (no $state) para no crear dependencias reactivas.
	 */
	let _itemsPerPageMounted = false;
	$effect(() => {
		itemsPerPage; // suscripción reactiva SOLO a itemsPerPage
		if (!_itemsPerPageMounted) {
			_itemsPerPageMounted = true; // plain let, no reactivo
			return;
		}
		if (untrack(() => tableName && $isConnected)) {
			handleItemsPerPageChange();
		}
	});

	/**
	 * Limpia la búsqueda
	 */
	async function clearSearch() {
		searchTerm = '';
		searchField = '';
		await handleSearch();
	}

	/**
	 * Abre el editor para un registro específico
	 * @param {Object} record - Registro a editar
	 */
	function handleEditRecord(record) {
		editingRecord = record;
		editorOpen = true;
	}

	/**
	 * Cierra el editor de registros
	 */
	function handleEditorClose() {
		editorOpen = false;
		editingRecord = null;
	}

	/**
	 * Maneja el guardado de un registro editado
	 * @param {Object} updatedRecord - Registro actualizado
	 */
	function handleRecordSaved(updatedRecord) {
		// Actualizar el registro en la lista local
		const recordIndex = records.findIndex(
			(r) => JSON.stringify(r) === JSON.stringify(editingRecord)
		);

		if (recordIndex !== -1) {
			// Normalizar posibles AttributeValues nativos a JS plano
			/** @type {any} */
			const normalized = normalizeToPlain(updatedRecord);
			records[recordIndex] = /** @type {Record} */ (normalized);
		}

		// Cerrar editor
		handleEditorClose();

		// Opcionalmente recargar datos
		// await refreshData();
	}

	/**
	 * Convierte estructuras con AttributeValue de DynamoDB a JS plano (para vista inmediata)
	 * @param {any} obj
	 */
	/**
	 * @param {any} obj
	 * @returns {any}
	 */
	function normalizeToPlain(obj) {
		if (obj == null) return obj;
		if (Array.isArray(obj)) return obj.map((x) => normalizeToPlain(x));
		if (typeof obj !== 'object') return obj;

		// Detectar AttributeValue
		const keys = Object.keys(obj);
		const isAttributeValue =
			keys.length === 1 && ['S', 'N', 'BOOL', 'NULL', 'SS', 'NS', 'BS', 'L', 'M'].includes(keys[0]);

		if (isAttributeValue) {
			const k = keys[0];
			switch (k) {
				case 'S':
					return obj.S;
				case 'N':
					return Number(obj.N);
				case 'BOOL':
					return Boolean(obj.BOOL);
				case 'NULL':
					return null;
				case 'SS':
					return Array.isArray(obj.SS) ? obj.SS.slice() : [];
				case 'NS':
					if (!Array.isArray(obj.NS)) return [];
					{
						const arr = /** @type {string[]} */ (obj.NS);
						return arr.map((n) => Number(n));
					}
				case 'BS':
					return Array.isArray(obj.BS) ? obj.BS.slice() : [];
				case 'L':
					if (!Array.isArray(obj.L)) return [];
					{
						const arr = /** @type {any[]} */ (obj.L);
						return arr.map((x) => normalizeToPlain(x));
					}
				case 'M': {
					/** @type {any} */
					const out = {};
					for (const key of Object.keys(obj.M || {})) {
						out[key] = normalizeToPlain(obj.M[key]);
					}
					return out;
				}
			}
		}

		// Objeto normal
		/** @type {any} */
		const out = {};
		for (const key of Object.keys(obj)) {
			out[key] = normalizeToPlain(obj[key]);
		}
		return out;
	}

	/**
	 * Abre el modal de confirmación para eliminar un registro
	 * @param {Object} record - Registro a eliminar
	 */
	function handleDeleteRecord(record) {
		deletingRecord = record;
		deleteConfirmOpen = true;
	}

	/**
	 * Cierra el modal de confirmación de eliminación
	 */
	function handleDeleteCancel() {
		deleteConfirmOpen = false;
		deletingRecord = null;
	}

	/**
	 * Confirma y ejecuta la eliminación del registro
	 */
	async function handleDeleteConfirm() {
		if (!deletingRecord) return;

		deleting = true;

		try {
			// Extraer claves del registro para la eliminación
			const keys = extractKeys(deletingRecord);

			const response = await dynamoDbApi.deleteItem(tableName, keys);

			if (response.success) {
				// Remover el registro de la lista local
				const recordIndex = records.findIndex(
					(r) => JSON.stringify(r) === JSON.stringify(deletingRecord)
				);

				if (recordIndex !== -1) {
					records.splice(recordIndex, 1);
					totalItems = Math.max(0, totalItems - 1);
				}

				// Cerrar modal
				handleDeleteCancel();
			} else {
				throw new Error(response.error || 'Error eliminando registro');
			}
		} catch (/** @type {any} */ error) {
			console.error('Error eliminando registro:', error);
			// TODO: Mostrar toast de error
			alert(`Error eliminando registro: ${error.message}`);
		} finally {
			deleting = false;
		}
	}

	/**
	 * Extrae las claves primarias usando el esquema de la tabla
	 * @param {any} record - Registro del que extraer las claves
	 * @returns {Object} Objeto con las claves primarias
	 */
	function extractKeys(record) {
		/** @type {any} */
		const keys = {};

		if (tableSchema?.KeySchema) {
			// Usar el esquema real de la tabla
			for (const keySpec of tableSchema.KeySchema) {
				const attributeName = keySpec.AttributeName;
				if (record[attributeName] !== undefined) {
					keys[attributeName] = record[attributeName];
				}
			}
		} else {
			// Fallback: estrategia simple si no tenemos esquema
			const commonKeyFields = ['id', 'pk', 'partitionKey', 'hashKey', 'userId', 'itemId'];
			const commonSortFields = ['sk', 'sortKey', 'rangeKey', 'timestamp', 'createdAt'];

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
		}

		return keys;
	}

	/**
	 * Actualiza un campo específico de un registro
	 * @param {Object} record - Registro completo
	 * @param {string} field - Campo a actualizar
	 * @param {any} value - Nuevo valor
	 */
	async function handleUpdateField(record, field, value) {
		if (!$isConnected || !tableName) return;

		try {
			// Crear el registro actualizado completo
			const updatedRecord = {
				...record,
				[field]: value
			};

			// Usar putItem en lugar de updateItem ya que enviamos el registro completo
			const response = await dynamoDbApi.putItem(tableName, updatedRecord);

			if (response.success) {
				// Actualizar el registro localmente
				const recordIndex = records.findIndex(
					(r) => JSON.stringify(extractKeys(r)) === JSON.stringify(extractKeys(record))
				);

				if (recordIndex !== -1) {
					records[recordIndex] = /** @type {Record} */ (updatedRecord);
				}
			} else {
				console.error('Error actualizando campo:', response.error);
			}
		} catch (err) {
			console.error('Error actualizando campo:', err);
		}
	}

	/**
	 * Obtiene una representación legible de las claves primarias
	 * @param {Object} record - Registro
	 * @returns {string} Descripción de las claves
	 */
	function getPrimaryKeyDescription(record) {
		const keys = extractKeys(record);
		const keyEntries = Object.entries(keys);

		if (keyEntries.length === 0) {
			return 'Sin claves identificadas';
		}

		return keyEntries
			.map(([key, value]) => {
				const keyType = tableSchema?.KeySchema?.find(
					(/** @type {{ AttributeName: string; }} */ k) => k.AttributeName === key
				)?.KeyType;
				const typeLabel = keyType === 'HASH' ? '(PK)' : keyType === 'RANGE' ? '(SK)' : '';
				return `${key}${typeLabel}: ${JSON.stringify(value)}`;
			})
			.join(', ');
	}

	/**
	 * Exporta los datos actuales a JSON
	 */
	function exportToJson() {
		const dataStr = JSON.stringify(records, null, 2);
		const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

		const exportFileDefaultName = `${tableName}_${new Date().toISOString().split('T')[0]}.json`;

		const linkElement = document.createElement('a');
		linkElement.setAttribute('href', dataUri);
		linkElement.setAttribute('download', exportFileDefaultName);
		linkElement.click();
	}

	/**
	 * Obtiene los campos disponibles para búsqueda
	 * @type {Array<{value: string, label: string}>}
	 */
	let availableFields = $state([]);

	$effect(() => {
		if (records.length > 0) {
			const firstRecord = records[0];
			availableFields = Object.keys(firstRecord).map((key) => ({
				value: key,
				label: key
			}));
		}
	});

	// Cargar datos cuando cambie la tabla
	$effect(() => {
		if (tableName && $isConnected) {
			refreshData();
			// Cargar esquema de forma asíncrona sin bloquear
			loadTableSchema().catch((err) => {
				console.error('Error cargando esquema de tabla:', err);
			});
		} else {
			records = [];
			error = null;
			tableSchema = null;
		}
	});

	/**
	 * Carga el esquema de la tabla para extraer claves correctamente
	 */
	async function loadTableSchema() {
		try {
			const response = await dynamoDbApi.getTableInfo(tableName);
			if (response.success) {
				tableSchema = response.data;
			} else {
				console.warn('Error en respuesta de esquema:', response.error);
			}
		} catch (error) {
			console.error('Error cargando esquema de tabla:', error);
		}
	}
</script>

<div class="flex h-full flex-col gap-2">
	<!-- Header con controles -->
	<div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<h3 class="text-lg font-medium text-gray-900 dark:text-white">
				{m['recordViewer.dataFrom']({ tableName })}
			</h3>
			<p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
				{m['recordViewer.recordsFound']({ count: totalItems })}
			</p>
		</div>

		<div class="flex items-center gap-3">
			<!-- Toggle vista -->
			<div class="flex rounded-lg bg-gray-100 p-1 dark:bg-gray-700">
				<button
					class="rounded-md px-3 py-1 text-sm transition-colors {viewMode === 'table'
						? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white'
						: 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'}"
					onclick={() => (viewMode = 'table')}
				>
					Tabla
				</button>
				<button
					class="rounded-md px-3 py-1 text-sm transition-colors {viewMode === 'json'
						? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white'
						: 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'}"
					onclick={() => (viewMode = 'json')}
				>
					JSON
				</button>
			</div>

			<!-- Exportar -->
			<Button variant="secondary" size="sm" onclick={exportToJson} disabled={records.length === 0}>
				<Download size={16} class="mr-2" />
				Exportar
			</Button>

			<!-- Refrescar -->
			<Button variant="secondary" size="sm" onclick={refreshData} disabled={loading} {loading}>
				<RefreshCw size={16} class="mr-2" />
				Refrescar
			</Button>
		</div>
	</div>

	<!-- Filtros de búsqueda -->
	<div
		class="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800"
	>
		<div class="flex flex-col gap-3 sm:flex-row sm:items-end">
			<!-- Campo -->
			<div class="flex-1">
				<Select
					id="recordviewer-search-field"
					label="Campo"
					bind:value={searchField}
					options={availableFields}
					placeholder={m['recordViewer.searchField']()}
				/>
			</div>

			<!-- Operador -->
			<div class="sm:w-40">
				<Select
					id="recordviewer-search-operator"
					label="Operador"
					bind:value={searchOperator}
					options={searchOperators}
				/>
			</div>

			<!-- Valor -->
			<div class="flex-1">
				<TextInput
					id="recordviewer-search-value"
					label="Valor"
					bind:value={searchTerm}
					placeholder={m['recordViewer.search']()}
				/>
			</div>

			<!-- Botones -->
			<div class="flex gap-2">
				<Button
					variant="primary"
					size="sm"
					onclick={handleSearch}
					disabled={!searchTerm || !searchField || loading}
				>
					Buscar
				</Button>

				<Button variant="ghost" size="sm" onclick={clearSearch} disabled={loading}
					>{m['recordViewer.clear']()}</Button
				>
			</div>
		</div>
	</div>

	<!-- Estados de carga y error -->
	{#if loading}
		<div class="py-12 text-center">
			<LoadingSpinner size="lg" text={m['recordViewer.loading']()} center />
		</div>
	{:else if error}
		<div class="py-12 text-center">
			<AlertTriangle size={48} class="mx-auto text-red-400" />
			<h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">
				{m['recordViewer.errorLoading']()}
			</h3>
			<p class="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
			<div class="mt-6">
				<Button variant="primary" onclick={refreshData}>{m['button.retry']()}</Button>
			</div>
		</div>
	{:else if records.length === 0}
		<div class="py-12 text-center">
			<Archive size={48} class="mx-auto text-gray-400" />
			<h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">
				{m['recordViewer.noRecords']()}
			</h3>
			<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
				{searchTerm ? m['recordViewer.noRecordsFound']() : m['recordViewer.emptyTable']()}
			</p>
		</div>
	{:else}
		<!-- Visualizador de datos -->
		<div class="flex-1 overflow-hidden">
			{#if viewMode === 'table'}
				<TableView
					{records}
					onEditRecord={handleEditRecord}
					onDeleteRecord={handleDeleteRecord}
					onUpdateField={handleUpdateField}
					tableInfo={tableSchema}
				/>
			{:else}
				<JsonView {records} onEditRecord={handleEditRecord} onDeleteRecord={handleDeleteRecord} />
			{/if}
		</div>
	{/if}

	<!-- Paginación y controles -->
	{#if records.length > 0 && !loading}
		<div
			class="flex flex-col items-center justify-between gap-4 border-t border-gray-200 pt-4 sm:flex-row dark:border-gray-700"
		>
			<div class="flex items-center gap-4">
				<span class="text-sm text-gray-700 dark:text-gray-300">
					{m['recordViewer.page']({ page: currentPage })}
				</span>
				<Select bind:value={itemsPerPageStr} options={itemsPerPageOptions} />
			</div>

			<div class="flex items-center gap-2">
				<Button
					variant="secondary"
					size="sm"
					onclick={goToPreviousPage}
					disabled={currentPage <= 1}
				>
					<ChevronLeft size={16} class="mr-2" />
					Anterior
				</Button>

				<Button variant="secondary" size="sm" onclick={goToNextPage} disabled={!lastEvaluatedKey}>
					{m['recordViewer.next']()}
					<ChevronRight size={16} class="ml-2" />
				</Button>
			</div>
		</div>
	{/if}
</div>

<!-- Editor de registros mejorado -->
<DynamoDBRecordEditor
	isOpen={editorOpen}
	{tableName}
	{connectionId}
	record={editingRecord}
	onClose={handleEditorClose}
	onSave={handleRecordSaved}
/>

<!-- Modal de confirmación de eliminación -->
{#if deleteConfirmOpen}
	<div
		class="bg-opacity-50 dark:bg-opacity-70 fixed inset-0 z-50 flex items-center justify-center bg-black dark:bg-black"
		onclick={handleDeleteCancel}
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				handleDeleteCancel();
			}
		}}
		role="button"
		tabindex="0"
		aria-label={m['recordEditor.closeModalAriaLabel']()}
	>
		<div
			class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					e.stopPropagation();
				}
			}}
			role="button"
			tabindex="0"
			aria-label={m['recordEditor.modalContentAriaLabel']()}
		>
			<!-- Header -->
			<div class="mb-4 flex items-center gap-3">
				<div class="flex-shrink-0">
					<AlertTriangle size={24} class="text-red-600" />
				</div>
				<div class="flex-1">
					<h3 class="text-lg font-medium text-gray-900 dark:text-white">
						{m['recordEditor.confirmDeletion']()}
					</h3>
					<p class="text-sm text-gray-600 dark:text-gray-300">{m['recordEditor.cannotUndo']()}</p>
				</div>
			</div>

			<!-- Contenido -->
			<div class="mb-6">
				<p class="mb-2 text-sm text-gray-700 dark:text-gray-300">
					{m['recordEditor.confirmDeleteQuestion']()}
				</p>
				<div class="rounded-md bg-gray-50 p-3 dark:bg-gray-700">
					{#if deletingRecord}
						<div class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
							{m['recordEditor.primaryKey']()}
						</div>
						<div class="font-mono text-sm text-gray-900 dark:text-gray-100">
							{getPrimaryKeyDescription(deletingRecord)}
						</div>
					{/if}
				</div>
			</div>

			<!-- Botones -->
			<div class="flex items-center justify-end gap-3">
				<button
					type="button"
					class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
					onclick={handleDeleteCancel}
					disabled={deleting}
				>
					Cancelar
				</button>
				<button
					type="button"
					class="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					onclick={handleDeleteConfirm}
					disabled={deleting}
				>
					{#if deleting}
						<Loader class="mr-2 animate-spin" />
						{m['recordEditor.deleting']()}
					{:else}
						Eliminar
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}
