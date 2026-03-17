<!--
 * Query Builder rediseñado estilo AWS Console
 * Interfaz simplificada con toggle Examen/Consulta
-->
<script>
	import { Button } from '../ui/Button';
	import TableView from './TableView.svelte';
	import JsonView from './JsonView.svelte';
	import DynamoDBRecordEditor from './DynamoDBRecordEditor.svelte';
	import ConfirmDeleteModal from '../ui/ConfirmDeleteModal.svelte';
	import { TextInput, Select } from '../ui';
	import { dynamoDbApi } from '../../services/api-client.js';
	import { notifySuccess, notifyError } from '../../stores/notifications.js';
	import { Search, Play, Download, CircleAlert } from 'lucide-svelte';
	import * as m from '$lib/paraglide/messages.js';

	/**
	 * @typedef {import('../../services/aws-config.js').DynamoDBTableInfo} TableInfo
	 */

	let {
		/** @type {string} */
		tableName,
		/** @type {string} */
		connectionId
	} = $props();

	/** Estados del componente */
	let isLoading = $state(false);
	/**
	 * @type {string | any[]}
	 */
	let results = $state([]);
	let error = $state('');

	/** @type {TableInfo | null} */
	let tableInfo = $state(null);

	/** Estados de vista y editor */
	let viewMode = $state(/** @type {'table' | 'json'} */ ('table'));
	let editorOpen = $state(false);
	let editingRecord = $state(/** @type {Object | null} */ (null));

	/** Estados de confirmación de eliminación */
	let deleteConfirmOpen = $state(false);
	let recordToDelete = $state(/** @type {Object | null} */ (null));
	let isDeleting = $state(false);

	/** Query configuration */
	let queryConfig = $state({
		/** @type {'query' | 'scan'} */
		operation: 'scan',
		/** @type {string} */
		selectedIndex: '',
		/** @type {string} */
		partitionKey: '',
		/** @type {string} */
		partitionValue: '',
		/** @type {string} */
		sortKeyOperator: '=',
		/** @type {string} */
		sortKeyValue: '',
		/** @type {string} */
		sortKeyValue2: '',
		/** @type {number} */
		limit: 100
	});

	/** Operadores disponibles para la Sort Key */
	const sortKeyOperators = [
		{ value: '=', label: '= (Igual)' },
		{ value: '<', label: '< (Menor que)' },
		{ value: '<=', label: '<= (Menor o igual)' },
		{ value: '>', label: '> (Mayor que)' },
		{ value: '>=', label: '>= (Mayor o igual)' },
		{ value: 'begins_with', label: 'Comienza con' },
		{ value: 'between', label: 'Entre (between)' }
	];

	/**
	 * Cargar información de la tabla
	 */
	async function loadTableInfo() {
		if (!tableName || !connectionId) return;

		try {
			const response = await dynamoDbApi.getTableInfo(tableName);
			if (response.success) {
				tableInfo = response.data;
				if (!tableInfo) return;

				// Configurar partition key por defecto
				if (tableInfo.KeySchema) {
					const pk = tableInfo.KeySchema.find(
						(/** @type {{ KeyType: string; }} */ k) => k.KeyType === 'HASH'
					);
					if (pk) {
						queryConfig.partitionKey = pk.AttributeName;
					}
				}
			}
		} catch (err) {
			console.error('Error cargando info de tabla:', err);
		}
	}

	/**
	 * Ejecutar query o scan
	 */
	async function executeQuery() {
		if (!tableName || !connectionId) return;

		// Validaciones básicas
		if (queryConfig.operation === 'query' && !queryConfig.partitionValue) {
			error = 'El valor de la clave de partición es requerido para consultas';
			return;
		}

		isLoading = true;
		error = '';
		results = [];

		try {
			let response;

			if (queryConfig.operation === 'query') {
				const partitionKeyName = getCurrentPartitionKey() || queryConfig.partitionKey;
				const sortKeyName = getCurrentSortKey();

				/** @type {any} */
				const params = {
					limit: queryConfig.limit,
					keyCondition: `#pk = :pkval`,
					expressionAttributeNames: { '#pk': partitionKeyName },
					expressionAttributeValues: { ':pkval': queryConfig.partitionValue }
				};

				// Agregar condición de Sort Key si se especificó valor
				if (sortKeyName && queryConfig.sortKeyValue) {
					params.expressionAttributeNames['#sk'] = sortKeyName;

					if (queryConfig.sortKeyOperator === 'between') {
						params.keyCondition += ` AND #sk BETWEEN :skval1 AND :skval2`;
						params.expressionAttributeValues[':skval1'] = queryConfig.sortKeyValue;
						params.expressionAttributeValues[':skval2'] = queryConfig.sortKeyValue2;
					} else if (queryConfig.sortKeyOperator === 'begins_with') {
						params.keyCondition += ` AND begins_with(#sk, :skval)`;
						params.expressionAttributeValues[':skval'] = queryConfig.sortKeyValue;
					} else {
						params.keyCondition += ` AND #sk ${queryConfig.sortKeyOperator} :skval`;
						params.expressionAttributeValues[':skval'] = queryConfig.sortKeyValue;
					}
				}

				// Agregar índice si está seleccionado
				if (queryConfig.selectedIndex) {
					params.indexName = queryConfig.selectedIndex;
				}

				response = await dynamoDbApi.queryTable(tableName, params);
			} else {
				// Scan operation
				/** @type {any} */
				const params = {
					limit: queryConfig.limit
				};

				response = await dynamoDbApi.scanTable(tableName, params);
			}

			if (response.success) {
				results = response.data.items || [];
			} else {
				error = response.error || 'Error ejecutando operación';
			}
		} catch (/** @type {any} */ err) {
			console.error('Error ejecutando operación:', err);
			error = `Error: ${err.message}`;
		} finally {
			isLoading = false;
		}
	}

	/**
	 * Exportar resultados como JSON
	 */
	function exportResults() {
		const dataStr = JSON.stringify(results, null, 2);
		const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

		const linkElement = document.createElement('a');
		linkElement.setAttribute('href', dataUri);
		linkElement.setAttribute('download', `${tableName}_query_results.json`);
		linkElement.click();
	}

	/**
	 * Obtener índices disponibles
	 */
	/** @type {Array<{ value: string; label: string; type: string; partitionKey?: string }>} */
	let indexOptions = $state([]);

	/**
	 * Obtener opciones de índices
	 */
	function getIndexOptions() {
		if (!tableInfo) return [];

		/** @type {Array<{ value: string; label: string; type: string; partitionKey?: string }>} */
		const options = [{ value: '', label: tableName, type: 'table' }];

		const gsis =
			/** @type {Array<{ IndexName: string; KeySchema?: { KeyType: string; AttributeName: string }[] }>} */ (
				tableInfo.GlobalSecondaryIndexes
			);
		if (gsis) {
			gsis.forEach((gsi) => {
				options.push({
					value: gsi.IndexName,
					label: `${gsi.IndexName} (GSI)`,
					type: 'gsi',
					partitionKey: gsi.KeySchema?.find(
						(/** @param {{ KeyType: string }} k */ k) => k.KeyType === 'HASH'
					)?.AttributeName
				});
			});
		}

		const lsis =
			/** @type {Array<{ IndexName: string; KeySchema?: { KeyType: string; AttributeName: string }[] }>} */ (
				tableInfo.LocalSecondaryIndexes
			);
		if (lsis) {
			lsis.forEach((lsi) => {
				options.push({
					value: lsi.IndexName,
					label: `${lsi.IndexName} (LSI)`,
					type: 'lsi',
					partitionKey: lsi.KeySchema?.find(
						(/** @param {{ KeyType: string }} k */ k) => k.KeyType === 'HASH'
					)?.AttributeName
				});
			});
		}

		return options;
	}

	/**
	 * Obtener la clave de partición actual basada en la selección
	 */
	function getCurrentPartitionKey() {
		if (!queryConfig.selectedIndex) {
			return queryConfig.partitionKey;
		}
		const selectedOption = indexOptions.find((opt) => opt.value === queryConfig.selectedIndex);
		return selectedOption?.partitionKey || queryConfig.partitionKey;
	}

	/**
	 * Obtener la Sort Key del esquema actual (tabla o índice seleccionado)
	 */
	function getCurrentSortKey() {
		if (!tableInfo) return null;

		if (!queryConfig.selectedIndex) {
			// Tabla principal
			const sk = /** @type {Array<{ KeyType: string; AttributeName: string }>} */ (
				tableInfo.KeySchema
			)?.find((k) => k.KeyType === 'RANGE');
			return sk?.AttributeName || null;
		}

		// Buscar en GSI o LSI
		const allIndexes = [
			.../** @type {any[]} */ (tableInfo.GlobalSecondaryIndexes || []),
			.../** @type {any[]} */ (tableInfo.LocalSecondaryIndexes || [])
		];
		const idx = allIndexes.find((i) => i.IndexName === queryConfig.selectedIndex);
		if (!idx?.KeySchema) return null;
		const sk = /** @type {Array<{ KeyType: string; AttributeName: string }>} */ (
			idx.KeySchema
		).find((k) => k.KeyType === 'RANGE');
		return sk?.AttributeName || null;
	}

	/**
	 * Actualizar clave de partición cuando cambia la selección de tabla/índice
	 */
	function handleTableIndexChange() {
		const currentPartitionKey = getCurrentPartitionKey();
		if (currentPartitionKey && currentPartitionKey !== queryConfig.partitionKey) {
			queryConfig.partitionKey = currentPartitionKey;
			queryConfig.partitionValue = '';
		}
		queryConfig.sortKeyValue = '';
		queryConfig.sortKeyValue2 = '';
	}

	// Cargar info de tabla al montar
	$effect(() => {
		if (tableName && connectionId) {
			loadTableInfo();
		}
	});

	// Actualizar opciones de índices cuando cambie tableInfo
	$effect(() => {
		if (tableInfo) {
			indexOptions = getIndexOptions();
		}
	});

	// Actualizar clave de partición cuando cambie la selección
	$effect(() => {
		if (queryConfig.selectedIndex !== undefined) {
			handleTableIndexChange();
		}
	});

	/**
	 * Manejar edición de registro
	 * @param {Object} record - Registro a editar
	 */
	function handleEditRecord(record) {
		editingRecord = record;
		editorOpen = true;
	}

	/**
	 * Manejar eliminación de registro (muestra confirmación)
	 * @param {Object} record - Registro a eliminar
	 */
	function handleDeleteRecord(record) {
		recordToDelete = record;
		deleteConfirmOpen = true;
	}

	/**
	 * Confirmar y ejecutar eliminación de registro
	 */
	async function confirmDeleteRecord() {
		if (!tableName || !recordToDelete) return;

		isDeleting = true;
		error = '';

		try {
			// Extraer claves primarias del registro
			/** @type {Record<string, any>} */
			const key = {};
			const rec = /** @type {Record<string, any>} */ (recordToDelete);
			if (tableInfo?.KeySchema && rec) {
				/** @type {Array<{ AttributeName: string }>} */ (tableInfo.KeySchema).forEach((keyDef) => {
					key[keyDef.AttributeName] = rec[keyDef.AttributeName];
				});
			}

			const response = await dynamoDbApi.deleteItem(tableName, key);

			if (response.success) {
				notifySuccess(m['notifications.recordDeleted']());
				// Recargar los resultados
				await executeQuery();
				// Cerrar modal
				deleteConfirmOpen = false;
				recordToDelete = null;
			} else {
				error = response.error || m['notifications.deleteError']();
				notifyError(error);
			}
		} catch (/** @type {any} */ err) {
			error = `Error: ${err.message}`;
			notifyError(error);
		} finally {
			isDeleting = false;
		}
	}

	/**
	 * Cancelar eliminación
	 */
	function cancelDeleteRecord() {
		deleteConfirmOpen = false;
		recordToDelete = null;
		isDeleting = false;
	}

	/**
	 * Manejar guardado de registro editado
	 * @param {Object} updatedRecord - Registro actualizado
	 */
	async function handleSaveRecord(updatedRecord) {
		if (!tableName) return;

		try {
			const response = await dynamoDbApi.putItem(tableName, updatedRecord);

			if (response.success) {
				notifySuccess(m['notifications.recordSaved']());
				// Recargar los resultados
				await executeQuery();
				editorOpen = false;
				editingRecord = null;
			} else {
				error = response.error || m['notifications.saveError']();
				notifyError(error);
			}
		} catch (/** @type {any} */ err) {
			error = `Error: ${err.message}`;
			notifyError(error);
		}
	}

	/**
	 * Cancelar edición
	 */
	function handleCancelEdit() {
		editorOpen = false;
		editingRecord = null;
	}

	/**
	 * Extrae las claves primarias del registro para identificar el item
	 * @param {Object} record - Registro
	 * @returns {Object} Claves primarias
	 */
	/** @param {Record<string, any>} record */
	function extractKeys(record) {
		/** @type {Record<string, any>} */
		const keys = {};
		if (tableInfo?.KeySchema) {
			tableInfo.KeySchema.forEach((keyDef) => {
				if (record[keyDef.AttributeName] !== undefined) {
					keys[keyDef.AttributeName] = record[keyDef.AttributeName];
				}
			});
		}
		return keys;
	}

	/**
	 * Actualiza un campo de un registro (edición inline en la tabla)
	 * @param {Object} record - Registro completo
	 * @param {string} field - Campo a actualizar
	 * @param {any} value - Nuevo valor
	 */
	async function handleUpdateField(record, field, value) {
		if (!tableName || !connectionId) return;

		try {
			const updatedRecord = { ...record, [field]: value };
			const response = await dynamoDbApi.putItem(tableName, updatedRecord);

			if (response.success) {
				error = '';
				notifySuccess(m['notifications.fieldUpdated']());
				const recordKeys = extractKeys(record);
				const arr = Array.isArray(results) ? results : [];
				results = arr.map((/** @type {any} */ r) =>
					JSON.stringify(extractKeys(r)) === JSON.stringify(recordKeys) ? updatedRecord : r
				);
			} else {
				error = response.error || m['notifications.updateError']();
				notifyError(error);
			}
		} catch (/** @type {any} */ err) {
			error = `${m['notifications.updateError']()}: ${err.message}`;
			notifyError(error);
		}
	}
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<div class="border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
		<div class="flex items-center justify-between">
			<h2 class="text-xl font-semibold text-gray-900 dark:text-white">Elementos de la tabla</h2>
			<div class="flex items-center gap-4">
				<!-- Toggle vista tabla/JSON -->
				{#if results.length > 0}
					<!-- Toggle de modo de edición -->
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
				{/if}

				<div class="flex gap-2">
					<Button variant="secondary" onclick={exportResults} disabled={results.length === 0}>
						<Download size={16} />
						Exportar
					</Button>
					<Button onclick={executeQuery} loading={isLoading} disabled={!tableName}>
						<Play size={16} />
						Ejecutar
					</Button>
				</div>
			</div>
		</div>
	</div>
	<!-- Configuración -->
	<div
		class="border-b border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-800/50"
	>
		<div class="space-y-4">
			<!-- Selector Examen/Consulta -->
			<div>
				<div class="flex gap-4">
					<label class="flex items-center">
						<input
							type="radio"
							bind:group={queryConfig.operation}
							value="scan"
							class="mr-2 text-blue-600 dark:text-blue-400"
						/>
						<span class="text-sm font-medium text-gray-700 dark:text-gray-300">Examen</span>
					</label>
					<label class="flex items-center">
						<input
							type="radio"
							bind:group={queryConfig.operation}
							value="query"
							class="mr-2 text-blue-600 dark:text-blue-400"
						/>
						<span class="text-sm font-medium text-gray-700 dark:text-gray-300">Consulta</span>
					</label>
				</div>
			</div>

			<!-- Selector de tabla/índice -->
			<div>
				<label
					for="table-index-selector"
					class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
				>
					Seleccione una tabla o un índice
				</label>
				<Select
					id="table-index-selector"
					bind:value={queryConfig.selectedIndex}
					options={indexOptions}
					placeholder="Seleccionar tabla o índice"
				/>
			</div>

			<!-- Campo de clave de partición para consultas -->
			{#if queryConfig.operation === 'query'}
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label
							for="partition-key-value"
							class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							Clave de partición: <span class="font-mono text-blue-600 dark:text-blue-400"
								>{getCurrentPartitionKey() || '...'}</span
							>
						</label>
						<TextInput
							id="partition-key-value"
							bind:value={queryConfig.partitionValue}
							placeholder="Ingrese el valor"
							required
						/>
					</div>
					<div>
						<label
							for="limit-query"
							class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
							>Límite de resultados</label
						>
						<TextInput
							id="limit-query"
							type="number"
							bind:value={queryConfig.limit}
							min="1"
							max="1000"
							placeholder="100"
						/>
					</div>
				</div>

				<!-- Sort Key (opcional) -->
				{#if getCurrentSortKey()}
					{@const sortKeyName = getCurrentSortKey()}
					<div
						class="rounded-md border border-gray-200 bg-white p-4 dark:border-gray-600 dark:bg-gray-800"
					>
						<div class="mb-3 flex items-center gap-2">
							<span class="text-sm font-medium text-gray-700 dark:text-gray-300">
								Clave de ordenación: <span class="font-mono text-blue-600 dark:text-blue-400"
									>{sortKeyName}</span
								>
							</span>
							<span
								class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400"
								>Opcional</span
							>
						</div>
						<div
							class="grid gap-3 {queryConfig.sortKeyOperator === 'between'
								? 'grid-cols-3'
								: 'grid-cols-2'}"
						>
							<div>
								<label for="sk-operator" class="mb-1 block text-xs text-gray-500 dark:text-gray-400"
									>Condición</label
								>
								<Select
									id="sk-operator"
									bind:value={queryConfig.sortKeyOperator}
									options={sortKeyOperators}
								/>
							</div>
							<div>
								<label for="sk-value" class="mb-1 block text-xs text-gray-500 dark:text-gray-400">
									{queryConfig.sortKeyOperator === 'between' ? 'Valor desde' : 'Valor'}
								</label>
								<TextInput
									id="sk-value"
									bind:value={queryConfig.sortKeyValue}
									placeholder="Dejar vacío para ignorar"
								/>
							</div>
							{#if queryConfig.sortKeyOperator === 'between'}
								<div>
									<label for="sk-value2" class="mb-1 block text-xs text-gray-500 dark:text-gray-400"
										>Valor hasta</label
									>
									<TextInput
										id="sk-value2"
										bind:value={queryConfig.sortKeyValue2}
										placeholder="Valor final"
									/>
								</div>
							{/if}
						</div>
					</div>
				{/if}
			{:else}
				<!-- Límite para scan -->
				<div>
					<label
						for="limit-scan"
						class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
						>Límite de resultados</label
					>
					<TextInput
						id="limit-scan"
						type="number"
						bind:value={queryConfig.limit}
						min="1"
						max="1000"
						placeholder="100"
					/>
				</div>
			{/if}
		</div>
	</div>

	<!-- Resultados -->
	<div class="flex flex-1 flex-col overflow-hidden">
		<!-- Error -->
		{#if error}
			<div class="border-b border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
				<div class="flex items-center gap-2">
					<CircleAlert size={20} class="text-red-500 dark:text-red-400" />
					<span class="text-sm text-red-700 dark:text-red-300">{error}</span>
				</div>
			</div>
		{/if}

		<!-- Contenido principal -->
		<div class="flex flex-1 flex-col overflow-auto">
			{#if isLoading}
				<div class="flex h-full items-center justify-center">
					<div class="text-center">
						<Search size={48} class="mx-auto mb-4 animate-pulse text-gray-400 dark:text-gray-500" />
						<p class="text-gray-600 dark:text-gray-400">
							Ejecutando {queryConfig.operation === 'scan' ? 'examen' : 'consulta'}...
						</p>
					</div>
				</div>
			{:else if results.length > 0}
				<!-- Vista de resultados con toggle tabla/JSON -->
				<div class="h-full overflow-hidden">
					{#if viewMode === 'table'}
						<TableView
							records={results}
							onEditRecord={handleEditRecord}
							onDeleteRecord={handleDeleteRecord}
							onUpdateField={handleUpdateField}
							{tableInfo}
						/>
					{:else}
						<JsonView
							records={results}
							onEditRecord={handleEditRecord}
							onDeleteRecord={handleDeleteRecord}
						/>
					{/if}
				</div>
			{:else if !isLoading}
				<!-- Estado inicial -->
				<div class="flex h-full items-center justify-center">
					<div class="max-w-md text-center">
						<Search size={48} class="mx-auto mb-4 text-gray-400 dark:text-gray-500" />
						<h3 class="mb-2 text-lg font-medium text-gray-900 dark:text-white">
							{queryConfig.operation === 'scan' ? 'Configurar examen' : 'Configurar consulta'}
						</h3>
						<div class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
							{#if queryConfig.operation === 'scan'}
								<p>Configure el límite y filtros opcionales, luego haga clic en "Ejecutar"</p>
							{:else}
								<p>Ingrese el valor de la clave de partición y haga clic en "Ejecutar"</p>
							{/if}
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
<!-- Modal de edición de registros -->
{#if editorOpen && editingRecord}
	<DynamoDBRecordEditor
		{tableName}
		{connectionId}
		record={editingRecord}
		isOpen={editorOpen}
		onClose={handleCancelEdit}
		onSave={handleSaveRecord}
	/>
{/if}

<!-- Modal de confirmación de eliminación -->
<ConfirmDeleteModal
	bind:open={deleteConfirmOpen}
	title={m['confirmDelete.title']()}
	message={m['confirmDelete.message']()}
	recordKeys={recordToDelete ? extractKeys(recordToDelete) : null}
	{tableName}
	{isDeleting}
	onConfirm={confirmDeleteRecord}
	onCancel={cancelDeleteRecord}
/>
