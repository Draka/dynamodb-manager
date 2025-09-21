<!--
 * Visualizador principal de registros DynamoDB
 * Maneja la vista tabla y JSON con paginación
-->
<script>
	import { Button } from '../ui/Button';
	import { LoadingSpinner } from '../ui/LoadingSpinner';
	import { Select } from '../ui/Select';
	import { TextInput } from '../ui/Input';
	import { isConnected } from '../../stores/current-connection.js';
	import { dynamoDbApi } from '../../services/api-client.js';
	import TableView from './TableView.svelte';
	import JsonView from './JsonView.svelte';
	import RecordEditor from './RecordEditor.svelte';
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
	let itemsPerPage = $state(25);
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

	/** Opciones de items por página */
	const itemsPerPageOptions = [
		{ value: 10, label: '10 items' },
		{ value: 25, label: '25 items' },
		{ value: 50, label: '50 items' },
		{ value: 100, label: '100 items' }
	];

	/** Filtros de búsqueda */
	let searchTerm = $state('');
	let searchField = $state('');

	/**
	 * Realiza un scan de la tabla usando API client
	 * @param {Object | null} startKey - Clave para continuar paginación
	 * @param {boolean} isNextPage - Si es navegación a página siguiente
	 */
	async function scanTable(startKey = null, isNextPage = false) {
		if (!$isConnected || !tableName) {
			return;
		}

		loading = true;
		error = null;

		try {
			/** @type {any} */
			const params = {
				limit: itemsPerPage,
				...(startKey && { lastEvaluatedKey: startKey })
			};

			// Agregar filtro si hay búsqueda
			if (searchTerm && searchField) {
				params.filterExpression = `contains(#field, :searchTerm)`;
				params.expressionAttributeNames = { '#field': searchField };
				params.expressionAttributeValues = { ':searchTerm': searchTerm };
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

		currentPage++;
		await scanTable(lastEvaluatedKey, true);
	}

	/**
	 * Va a la página anterior
	 */
	async function goToPreviousPage() {
		if (currentPage <= 1) return;

		currentPage--;
		nextPageKeys.pop(); // Remover la última clave

		const previousKey = nextPageKeys[nextPageKeys.length - 1] || null;
		await scanTable(previousKey, false);
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
	 * @param {any} event - Evento de cambio
	 */
	async function handleItemsPerPageChange(event) {
		itemsPerPage = parseInt(event.target.value);
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
				case 'M':
					/** @type {any} */
					const out = {};
					for (const key of Object.keys(obj.M || {})) {
						out[key] = normalizeToPlain(obj.M[key]);
					}
					return out;
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
			<h3 class="text-lg font-medium text-gray-900">
				Datos de {tableName}
			</h3>
			<p class="mt-1 text-sm text-gray-600">
				{totalItems} registros encontrados
			</p>
		</div>

		<div class="flex items-center gap-3">
			<!-- Toggle vista -->
			<div class="flex rounded-lg bg-gray-100 p-1">
				<button
					class="rounded-md px-3 py-1 text-sm transition-colors {viewMode === 'table'
						? 'bg-white text-gray-900 shadow-sm'
						: 'text-gray-600 hover:text-gray-900'}"
					onclick={() => (viewMode = 'table')}
				>
					Tabla
				</button>
				<button
					class="rounded-md px-3 py-1 text-sm transition-colors {viewMode === 'json'
						? 'bg-white text-gray-900 shadow-sm'
						: 'text-gray-600 hover:text-gray-900'}"
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
	<div class="rounded-lg border border-gray-200 bg-gray-50 p-2">
		<div class="flex flex-col gap-4 sm:flex-row">
			<div class="flex-1">
				<TextInput bind:value={searchTerm} placeholder="Buscar..." />
			</div>

			<div class="sm:w-48">
				<Select bind:value={searchField} options={availableFields} placeholder="Campo a buscar" />
			</div>

			<div class="flex gap-2">
				<Button
					variant="primary"
					size="sm"
					onclick={handleSearch}
					disabled={!searchTerm || !searchField || loading}
				>
					Buscar
				</Button>

				<Button variant="ghost" size="sm" onclick={clearSearch} disabled={loading}>Limpiar</Button>
			</div>
		</div>
	</div>

	<!-- Estados de carga y error -->
	{#if loading}
		<div class="py-12 text-center">
			<LoadingSpinner size="lg" text="Cargando registros..." center />
		</div>
	{:else if error}
		<div class="py-12 text-center">
			<AlertTriangle size={48} class="mx-auto text-red-400" />
			<h3 class="mt-2 text-sm font-medium text-gray-900">Error cargando datos</h3>
			<p class="mt-1 text-sm text-red-600">{error}</p>
			<div class="mt-6">
				<Button variant="primary" onclick={refreshData}>Reintentar</Button>
			</div>
		</div>
	{:else if records.length === 0}
		<div class="py-12 text-center">
			<Archive size={48} class="mx-auto text-gray-400" />
			<h3 class="mt-2 text-sm font-medium text-gray-900">Sin registros</h3>
			<p class="mt-1 text-sm text-gray-500">
				{searchTerm
					? 'No se encontraron registros con los filtros aplicados.'
					: 'Esta tabla no contiene registros.'}
			</p>
		</div>
	{:else}
		<!-- Visualizador de datos -->
		<div class="flex-1 overflow-hidden">
			{#if viewMode === 'table'}
				<TableView {records} onEditRecord={handleEditRecord} onDeleteRecord={handleDeleteRecord} tableInfo={tableSchema} />
			{:else}
				<JsonView {records} onEditRecord={handleEditRecord} onDeleteRecord={handleDeleteRecord} />
			{/if}
		</div>
	{/if}

	<!-- Paginación y controles -->
	{#if records.length > 0 && !loading}
		<div class="flex flex-col items-center justify-between gap-4 border-t pt-4 sm:flex-row">
			<div class="flex items-center gap-4">
				<span class="text-sm text-gray-700">
					Página {currentPage}
				</span>
				<Select
					value={itemsPerPage.toString()}
					options={itemsPerPageOptions}
					onchange={handleItemsPerPageChange}
				/>
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
					Siguiente
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
		class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
		onclick={handleDeleteCancel}
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				handleDeleteCancel();
			}
		}}
		role="button"
		tabindex="0"
		aria-label="Cerrar modal de confirmación"
	>
		<div
			class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					e.stopPropagation();
				}
			}}
			role="button"
			tabindex="0"
			aria-label="Contenido del modal"
		>
			<!-- Header -->
			<div class="mb-4 flex items-center gap-3">
				<div class="flex-shrink-0">
					<AlertTriangle size={24} class="text-red-600" />
				</div>
				<div class="flex-1">
					<h3 class="text-lg font-medium text-gray-900">Confirmar Eliminación</h3>
					<p class="text-sm text-gray-600">Esta acción no se puede deshacer</p>
				</div>
			</div>

			<!-- Contenido -->
			<div class="mb-6">
				<p class="mb-2 text-sm text-gray-700">
					¿Estás seguro de que deseas eliminar este registro?
				</p>
				<div class="rounded-md bg-gray-50 p-3">
					{#if deletingRecord}
						<div class="mb-2 text-sm font-medium text-gray-700">Clave primaria del registro:</div>
						<div class="font-mono text-sm text-gray-900">
							{getPrimaryKeyDescription(deletingRecord)}
						</div>
					{/if}
				</div>
			</div>

			<!-- Botones -->
			<div class="flex items-center justify-end gap-3">
				<button
					type="button"
					class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
					onclick={handleDeleteCancel}
					disabled={deleting}
				>
					Cancelar
				</button>
				<button
					type="button"
					class="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
					onclick={handleDeleteConfirm}
					disabled={deleting}
				>
					{#if deleting}
						<Loader class="mr-2 animate-spin" />
						Eliminando...
					{:else}
						Eliminar
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}
