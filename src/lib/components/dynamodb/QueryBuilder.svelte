<!--
 * Query Builder rediseñado estilo AWS Console
 * Interfaz simplificada con toggle Examen/Consulta
-->
<script>
	import { Button } from '../ui/Button';
	import TableView from './TableView.svelte';
	import JsonView from './JsonView.svelte';
	import DynamoDBRecordEditor from './DynamoDBRecordEditor.svelte';
	import { TextInput, Select } from '../ui';
	import { dynamoDbApi } from '../../services/api-client.js';
	import { Search, Play, Download, CircleAlert } from 'lucide-svelte';

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
		/** @type {number} */
		limit: 100
	});

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
				// Construir parámetros de query
				const partitionKeyName = getCurrentPartitionKey() || queryConfig.partitionKey;

				/** @type {any} */
				const params = {
					limit: queryConfig.limit,
					keyCondition: `#pk = :pkval`,
					expressionAttributeNames: {
						'#pk': partitionKeyName
					},
					expressionAttributeValues: {
						':pkval': queryConfig.partitionValue
					}
				};

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
	let indexOptions = $state([]);

	/**
	 * Obtener opciones de índices
	 */
	function getIndexOptions() {
		if (!tableInfo) return [];

		const options = [{ value: '', label: tableName, type: 'table' }];

		if (tableInfo.GlobalSecondaryIndexes) {
			tableInfo.GlobalSecondaryIndexes.forEach((gsi) => {
				options.push({
					value: gsi.IndexName,
					label: `${gsi.IndexName} (GSI)`,
					type: 'gsi',
					partitionKey: gsi.KeySchema?.find((k) => k.KeyType === 'HASH')?.AttributeName
				});
			});
		}

		if (tableInfo.LocalSecondaryIndexes) {
			tableInfo.LocalSecondaryIndexes.forEach((lsi) => {
				options.push({
					value: lsi.IndexName,
					label: `${lsi.IndexName} (LSI)`,
					type: 'lsi',
					partitionKey: lsi.KeySchema?.find((k) => k.KeyType === 'HASH')?.AttributeName
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
			// Tabla principal
			return queryConfig.partitionKey;
		}

		// Buscar en los índices
		const selectedOption = indexOptions.find((opt) => opt.value === queryConfig.selectedIndex);
		return selectedOption?.partitionKey || queryConfig.partitionKey;
	}

	/**
	 * Actualizar clave de partición cuando cambia la selección de tabla/índice
	 */
	function handleTableIndexChange() {
		const currentPartitionKey = getCurrentPartitionKey();
		if (currentPartitionKey && currentPartitionKey !== queryConfig.partitionKey) {
			queryConfig.partitionKey = currentPartitionKey;
			// Limpiar el valor cuando cambia la clave
			queryConfig.partitionValue = '';
		}
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
	 * Manejar eliminación de registro
	 * @param {Object} record - Registro a eliminar
	 */
	async function handleDeleteRecord(record) {
		if (!tableName) return;

		error = '';

		try {
			// Extraer claves primarias del registro
			const key = {};
			if (tableInfo?.KeySchema) {
				tableInfo.KeySchema.forEach((keyDef) => {
					key[keyDef.AttributeName] = record[keyDef.AttributeName];
				});
			}

			const response = await dynamoDbApi.deleteItem(tableName, key);

			if (response.success) {
				// Recargar los resultados
				await executeQuery();
			} else {
				error = response.error || 'Error eliminando registro';
			}
		} catch (/** @type {any} */ err) {
			error = `Error: ${err.message}`;
		}
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
				// Recargar los resultados
				await executeQuery();
				editorOpen = false;
				editingRecord = null;
			} else {
				error = response.error || 'Error guardando registro';
			}
		} catch (/** @type {any} */ err) {
			error = `Error: ${err.message}`;
		}
	}

	/**
	 * Cancelar edición
	 */
	function handleCancelEdit() {
		editorOpen = false;
		editingRecord = null;
	}
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<div class="border-b border-gray-200 bg-white px-6 py-4">
		<div class="flex items-center justify-between">
			<h2 class="text-xl font-semibold text-gray-900">Elementos de la tabla</h2>
			<div class="flex items-center gap-4">
				<!-- Toggle vista tabla/JSON -->
				{#if results.length > 0}
					<!-- Toggle de modo de edición -->
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
	<div class="border-b border-gray-200 bg-gray-50 px-6 py-4">
		<div class="space-y-4">
			<!-- Selector Examen/Consulta -->
			<div>
				<div class="flex gap-4">
					<label class="flex items-center">
						<input
							type="radio"
							bind:group={queryConfig.operation}
							value="scan"
							class="mr-2 text-blue-600"
						/>
						<span class="text-sm font-medium text-gray-700">Examen</span>
					</label>
					<label class="flex items-center">
						<input
							type="radio"
							bind:group={queryConfig.operation}
							value="query"
							class="mr-2 text-blue-600"
						/>
						<span class="text-sm font-medium text-gray-700">Consulta</span>
					</label>
				</div>
			</div>

			<!-- Selector de tabla/índice -->
			<div>
				<label for="table-index-selector" class="mb-1 block text-sm font-medium text-gray-700">
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
						<label for="partition-key-value" class="mb-1 block text-sm font-medium text-gray-700">
							Clave de partición: {getCurrentPartitionKey() || 'Nombre del campo'}
						</label>
						<TextInput
							id="partition-key-value"
							bind:value={queryConfig.partitionValue}
							placeholder="Ingrese el valor"
							required
						/>
					</div>
					<div>
						<label for="limit-query" class="mb-1 block text-sm font-medium text-gray-700"
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
			{:else}
				<!-- Límite para scan -->
				<div>
					<label for="limit-scan" class="mb-1 block text-sm font-medium text-gray-700"
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
			<div class="border-b border-red-200 bg-red-50 p-4">
				<div class="flex items-center gap-2">
					<CircleAlert size={20} class="text-red-500" />
					<span class="text-sm text-red-700">{error}</span>
				</div>
			</div>
		{/if}

		<!-- Contenido principal -->
		<div class="flex flex-1 flex-col overflow-auto">
			{#if isLoading}
				<div class="flex h-full items-center justify-center">
					<div class="text-center">
						<Search size={48} class="mx-auto mb-4 animate-pulse text-gray-400" />
						<p class="text-gray-600">
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
						<Search size={48} class="mx-auto mb-4 text-gray-400" />
						<h3 class="mb-2 text-lg font-medium text-gray-900">
							{queryConfig.operation === 'scan' ? 'Configurar examen' : 'Configurar consulta'}
						</h3>
						<div class="space-y-2 text-sm text-gray-600">
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
