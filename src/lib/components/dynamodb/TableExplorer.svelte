<!--
 * Explorador de tablas DynamoDB
 * Lista todas las tablas disponibles y permite selección
-->
<script>
	import { Button } from '../ui/Button';
	import { LoadingSpinner } from '../ui/LoadingSpinner';
	import { TextInput } from '../ui/Input';
	import DeleteTableModal from '../ui/DeleteTableModal.svelte';
	import { dynamoDbApi } from '../../services/api-client.js';
	import { updateConnectionTables, activeConnectionId } from '../../stores/open-connections.js';
	import {
		Trash2,
		RefreshCw,
		Lock,
		AlertTriangle,
		Table,
		Search,
		CircleCheck,
		Key,
		Database,
		HardDrive,
		Eraser
	} from 'lucide-svelte';

	/**
	 * @typedef {Object} TableInfo
	 * @property {string} name - Nombre de la tabla
	 * @property {Object} details - Detalles de la tabla
	 * @property {Date} lastAccessed - Última vez accedida
	 */

	let {
		/** @type {import('../../services/aws-config.js').AWSConnection | null} Conexión activa */
		connection = null,
		/** @type {string[]} Lista de tablas de la conexión */
		tables = [],
		/** @type {boolean} Estado de carga de tablas */
		tablesLoading = false,
		/** @type {string | null} Error cargando tablas */
		tablesError = null,
		/** @type {((tableName: string) => void) | undefined} Callback al seleccionar tabla */
		onTableSelected,
		/** @type {(() => void) | undefined} Callback para refrescar tablas */
		onRefreshTables,
		/** @type {string | null} Tabla actualmente seleccionada */
		selectedTable = null
	} = $props();

	/** Estados del componente */
	let tableDetails = $state(/** @type {Record<string, any>} */ ({}));
	let searchTerm = $state('');
	let loadingDetails = $state(/** @type {Set<string>} */ (new Set()));
	let deleteModal = $state({
		isOpen: false,
		tableName: '',
		isLocal: false
	});

	let clearItemsModal = $state({
		isOpen: false,
		tableName: '',
		isProcessing: false
	});

	/** Tablas filtradas por búsqueda */
	const filteredTables = $derived(
		tables.filter((tableName) => tableName.toLowerCase().includes(searchTerm.toLowerCase())).sort()
	);

	/**
	 * Carga la lista de tablas usando API client
	 */
	async function loadTables() {
		if (!connection || !$activeConnectionId) {
			return;
		}

		// Actualizar estado de carga en el store
		updateConnectionTables($activeConnectionId, [], true, null);

		try {
			const response = await dynamoDbApi.listTables();

			if (response.success) {
				// Actualizar tablas en el store
				updateConnectionTables($activeConnectionId, response.data, false, null);

				// Cargar detalles básicos para las primeras tablas
				loadTableDetailsInBackground(response.data.slice(0, 5));
			} else {
				const errorMsg = response.error || 'Error desconocido cargando tablas';
				updateConnectionTables($activeConnectionId, [], false, errorMsg);
				console.error('Error en respuesta de tablas:', response.error);
			}
		} catch (/** @type {any} */ err) {
			const errorMsg = `Error cargando tablas: ${err.message}`;
			updateConnectionTables($activeConnectionId, [], false, errorMsg);
			console.error('Error cargando tablas:', err);
		}
	}

	/**
	 * Carga detalles de tablas en segundo plano usando API client
	 * @param {string[]} tableNames - Nombres de tablas
	 */
	async function loadTableDetailsInBackground(tableNames) {
		for (const tableName of tableNames) {
			if (tableDetails[tableName]) continue;

			try {
				const response = await dynamoDbApi.getTableInfo(tableName);
				if (response.success) {
					tableDetails[tableName] = response.data;
					tableDetails = tableDetails; // Trigger reactivity
				}
			} catch (err) {
				console.warn(`Error cargando detalles de ${tableName}:`, err);
			}
		}
	}

	/**
	 * Selecciona una tabla
	 * @param {string} tableName - Nombre de la tabla
	 */
	async function selectTable(tableName) {
		if (!connection) return;

		// Siempre cargar detalles al seleccionar tabla (para asegurar datos actualizados)
		loadingDetails.add(tableName);
		loadingDetails = loadingDetails;

		try {
			const response = await dynamoDbApi.getTableInfo(tableName);
			if (response.success) {
				tableDetails[tableName] = response.data;
			} else {
				console.error(`❌ Error cargando detalles de ${tableName}:`, response.error);
			}
		} catch (err) {
			console.error(`❌ Error cargando detalles de ${tableName}:`, err);
		} finally {
			loadingDetails.delete(tableName);
			loadingDetails = loadingDetails;
		}

		onTableSelected?.(tableName);
	}

	/**
	 * Refresca la lista de tablas
	 */
	async function refreshTables() {
		tableDetails = {};
		if (onRefreshTables) {
			onRefreshTables();
		} else {
			await loadTables();
		}
	}

	/**
	 * Abre el modal de confirmación para eliminar tabla
	 * @param {string} tableName - Nombre de la tabla a eliminar
	 */
	function openDeleteModal(tableName) {
		if (!connection) return;

		deleteModal = {
			isOpen: true,
			tableName,
			isLocal: isLocalConnection(connection)
		};
	}

	/**
	 * Cierra el modal de eliminación
	 */
	function closeDeleteModal() {
		deleteModal = {
			isOpen: false,
			tableName: '',
			isLocal: false
		};
	}

	/**
	 * Confirma la eliminación de la tabla
	 */
	async function handleDeleteTable() {
		if (!deleteModal.tableName) return;

		try {
			const response = await dynamoDbApi.deleteTable(deleteModal.tableName);

			if (response.success) {
				// Si la tabla eliminada es la seleccionada, deseleccionarla
				if (selectedTable === deleteModal.tableName) {
					onTableSelected?.(''); // Deseleccionar tabla
				}

				// Remover tabla de los detalles locales
				delete tableDetails[deleteModal.tableName];

				// Refrescar lista de tablas
				await refreshTables();

				closeDeleteModal();
			} else {
				console.error(`❌ Error eliminando tabla: ${response.error}`);
				alert(`Error eliminando tabla: ${response.error}`);
			}
		} catch (/** @type {any} */ error) {
			console.error('Error eliminando tabla:', error);
			alert(`Error eliminando tabla: ${error.message}`);
		}
	}

	/**
	 * Abre el modal de confirmación para limpiar todos los registros
	 * @param {string} tableName - Nombre de la tabla
	 */
	function openClearItemsModal(tableName) {
		clearItemsModal = {
			isOpen: true,
			tableName,
			isProcessing: false
		};
	}

	/**
	 * Cierra el modal de limpiar registros
	 */
	function closeClearItemsModal() {
		clearItemsModal = {
			isOpen: false,
			tableName: '',
			isProcessing: false
		};
	}

	/**
	 * Confirma el borrado de todos los registros
	 */
	async function handleClearItems() {
		if (!clearItemsModal.tableName) return;

		clearItemsModal.isProcessing = true;

		try {
			const response = await dynamoDbApi.clearTableItems(clearItemsModal.tableName);

			if (response.success) {
				const message = response.message || `Registros eliminados exitosamente`;
				alert(message);
				closeClearItemsModal();

				// Refrescar detalles de la tabla para actualizar el conteo
				if (tableDetails[clearItemsModal.tableName]) {
					loadingDetails.add(clearItemsModal.tableName);
					loadingDetails = loadingDetails;

					try {
						const tableResponse = await dynamoDbApi.getTableInfo(clearItemsModal.tableName);
						if (tableResponse.success) {
							tableDetails[clearItemsModal.tableName] = tableResponse.data;
						}
					} catch (err) {
						console.warn(`Error actualizando detalles de tabla:`, err);
					} finally {
						loadingDetails.delete(clearItemsModal.tableName);
						loadingDetails = loadingDetails;
					}
				}
			} else {
				console.error(`❌ Error limpiando registros: ${response.error}`);
				alert(`Error limpiando registros: ${response.error}`);
			}
		} catch (/** @type {any} */ error) {
			console.error('Error limpiando registros:', error);
			alert(`Error limpiando registros: ${error.message}`);
		} finally {
			clearItemsModal.isProcessing = false;
		}
	}

	/**
	 * Determina si una conexión es local (DynamoDB local)
	 * @param {import('../../services/aws-config.js').AWSConnection} connection - Conexión
	 * @returns {boolean} Si es conexión local
	 */
	function isLocalConnection(connection) {
		return /** @type {boolean} */ (
			connection.endpoint &&
				(connection.endpoint.includes('localhost') ||
					connection.endpoint.includes('127.0.0.1') ||
					connection.endpoint.includes('dynamo-local'))
		);
	}

	/**
	 * Formatea el número de items en una tabla
	 * @param {number} count - Número de items
	 * @returns {string} Número formateado
	 */
	function formatItemCount(count) {
		if (count < 1000) return count.toString();
		if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
		return `${(count / 1000000).toFixed(1)}M`;
	}

	/**
	 * Formatea el tamaño de una tabla
	 * @param {number} bytes - Tamaño en bytes
	 * @returns {string} Tamaño formateado
	 */
	function formatTableSize(bytes) {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
		return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
	}

	/**
	 * Obtiene el color de estado de una tabla
	 * @param {any} details - Detalles de la tabla
	 * @returns {string} Clase CSS del color
	 */
	function getTableStatusColor(details) {
		if (!details) return 'text-gray-500';

		switch (details.TableStatus) {
			case 'ACTIVE':
				return 'text-green-600';
			case 'CREATING':
			case 'UPDATING':
				return 'text-yellow-600';
			case 'DELETING':
				return 'text-red-600';
			default:
				return 'text-gray-500';
		}
	}

	/**
	 * Obtiene los atributos clave de una tabla
	 * @param {any} details - Detalles de la tabla
	 * @returns {any} Información de claves
	 */
	function getTableKeys(details) {
		if (!details?.KeySchema) return null;

		const hashKey = details.KeySchema.find(
			(/** @type {{ KeyType: string; }} */ key) => key.KeyType === 'HASH'
		);
		const rangeKey = details.KeySchema.find(
			(/** @type {{ KeyType: string; }} */ key) => key.KeyType === 'RANGE'
		);

		return {
			hashKey: hashKey?.AttributeName,
			rangeKey: rangeKey?.AttributeName
		};
	}

	// Limpiar detalles cuando cambie la conexión (solo limpieza, sin carga)
	$effect(() => {
		if (!connection) {
			tableDetails = {};
		}
	});
</script>

<div class="flex h-full flex-1 flex-col gap-2 overflow-hidden">
	<!-- Header con búsqueda -->
	<div class="flex items-center gap-2 p-2">
		<div class="flex-1">
			<TextInput bind:value={searchTerm} placeholder="Buscar tablas..." />
		</div>

		<Button
			variant="secondary"
			size="sm"
			onclick={refreshTables}
			disabled={tablesLoading || !connection}
			loading={tablesLoading}
			title="Refrescar"
		>
			<RefreshCw size={16} />
			<span class="sr-only">Refrescar</span>
		</Button>
	</div>

	<!-- Estado sin conexión -->
	{#if !connection}
		<div class="py-12 text-center">
			<Lock size={48} class="mx-auto text-gray-400" />
			<h3 class="mt-2 text-sm font-medium text-gray-900">Sin conexión</h3>
			<p class="mt-1 text-sm text-gray-500">
				Selecciona una conexión para ver las tablas disponibles.
			</p>
		</div>
	{:else if tablesLoading}
		<!-- Estado de carga -->
		<div class="py-12 text-center">
			<LoadingSpinner size="lg" text="Cargando tablas..." center />
		</div>
	{:else if tablesError}
		<!-- Estado de error -->
		<div class="py-12 text-center">
			<AlertTriangle size={48} class="mx-auto text-red-400" />
			<h3 class="mt-2 text-sm font-medium text-gray-900">Error cargando tablas</h3>
			<p class="mt-1 text-sm text-gray-500">{tablesError}</p>
			<div class="mt-6">
				<Button variant="primary" onclick={refreshTables}>Reintentar</Button>
			</div>
		</div>
	{:else if filteredTables.length === 0 && tables.length === 0}
		<!-- Sin tablas -->
		<div class="py-12 text-center">
			<Table size={48} class="mx-auto text-gray-400" />
			<h3 class="mt-2 text-sm font-medium text-gray-900">No hay tablas</h3>
			<p class="mt-1 text-sm text-gray-500">No se encontraron tablas DynamoDB en esta región.</p>
		</div>
	{:else if filteredTables.length === 0}
		<!-- Sin resultados de búsqueda -->
		<div class="py-12 text-center">
			<Search size={48} class="mx-auto text-gray-400" />
			<h3 class="mt-2 text-sm font-medium text-gray-900">Sin resultados</h3>
			<p class="mt-1 text-sm text-gray-500">
				No se encontraron tablas que coincidan con "{searchTerm}".
			</p>
		</div>
	{:else}
		<!-- Lista de tablas -->
		<div class="flex-1 space-y-2 overflow-y-auto p-2">
			<div class="mb-3 text-sm text-gray-500">
				Mostrando {filteredTables.length} de {tables.length} tablas
			</div>

			{#each filteredTables as tableName (tableName)}
				{@const details = tableDetails[tableName]}
				{@const isLoadingDetails = loadingDetails.has(tableName)}
				{@const keys = details ? getTableKeys(details) : null}
				{@const isSelected = selectedTable === tableName}

				<div
					class="group relative cursor-pointer rounded-lg border p-4 transition-all duration-200 hover:border-blue-300 hover:shadow-sm"
					class:border-4={isSelected}
					class:border-blue-600={isSelected}
					class:bg-blue-100={isSelected}
					class:border-gray-200={!isSelected}
					onclick={() => selectTable(tableName)}
					role="button"
					tabindex="0"
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							selectTable(tableName);
						}
					}}
				>
					<div class="flex items-start justify-between">
						<!-- Botones de acción -->
						<div class="absolute -top-2 -right-2 flex gap-1">
							<!-- Botón de limpiar registros -->
							<button
								class="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100 hover:bg-orange-600"
								onclick={(e) => {
									e.stopPropagation();
									openClearItemsModal(tableName);
								}}
								title="Borrar todos los registros"
							>
								<Eraser size={12} />
								<span class="sr-only">Borrar todos los registros</span>
							</button>
							
							<!-- Botón de eliminar tabla -->
							<button
								class="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100 hover:bg-red-600"
								onclick={(e) => {
									e.stopPropagation();
									openDeleteModal(tableName);
								}}
								title="Eliminar tabla"
							>
								<Trash2 size={12} />
								<span class="sr-only">Eliminar tabla</span>
							</button>
						</div>
						<div class="min-w-0 flex-1">
							<!-- Nombre de la tabla -->
							<div class="mb-2 flex items-center gap-2">
								<h4 class="truncate text-base font-medium text-gray-900">
									{tableName}
								</h4>

								{#if details}
									<span
										class="rounded-full bg-gray-100 px-2 py-1 text-xs {getTableStatusColor(
											details
										)}"
									>
										{details.TableStatus}
									</span>
								{/if}
							</div>

							<!-- Información de la tabla -->
							{#if isLoadingDetails}
								<div class="flex items-center gap-2 text-sm text-gray-500">
									<LoadingSpinner size="sm" />
									<span>Cargando detalles...</span>
								</div>
							{:else if details}
								<div class="space-y-1 text-sm text-gray-600">
									<!-- Claves -->
									{#if keys}
										<div class="flex items-center gap-4">
											<div class="flex items-center gap-1">
												<Key size={16} />
												<span
													>PK: <code class="rounded bg-gray-100 px-1 text-xs">{keys.hashKey}</code
													></span
												>
											</div>

											{#if keys.rangeKey}
												<div class="flex items-center gap-1">
													<span
														>SK: <code class="rounded bg-gray-100 px-1 text-xs"
															>{keys.rangeKey}</code
														></span
													>
												</div>
											{/if}
										</div>
									{/if}

									<!-- Estadísticas -->
									<div class="flex items-center gap-4">
										{#if details.ItemCount !== undefined}
											<div class="flex items-center gap-1">
												<Table size={16} />
												<span>{formatItemCount(details.ItemCount)} items</span>
											</div>
										{/if}

										{#if details.TableSizeBytes !== undefined}
											<div class="flex items-center gap-1">
												<HardDrive size={16} />
												<span>{formatTableSize(details.TableSizeBytes)}</span>
											</div>
										{/if}
									</div>
								</div>
							{:else}
								<div class="text-sm text-gray-500">Clic para cargar detalles</div>
							{/if}
						</div>

						<!-- Icono de selección -->
						{#if selectedTable === tableName}
							<div class="text-blue-500">
								<CircleCheck size={24} />
							</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Modal de eliminación -->
<DeleteTableModal
	isOpen={deleteModal.isOpen}
	tableName={deleteModal.tableName}
	isLocal={deleteModal.isLocal}
	connectionName={connection?.name || ''}
	onClose={closeDeleteModal}
	onConfirm={handleDeleteTable}
/>

<!-- Modal de confirmación para limpiar registros -->
{#if clearItemsModal.isOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
		<div class="max-w-md rounded-lg bg-white p-6 shadow-xl">
			<div class="mb-4">
				<h3 class="text-lg font-semibold text-gray-900">
					Confirmar eliminación de registros
				</h3>
				<p class="mt-2 text-sm text-gray-600">
					¿Estás seguro de que quieres <strong>borrar todos los registros</strong> de la tabla 
					<span class="font-mono bg-gray-100 px-1 rounded">{clearItemsModal.tableName}</span>?
				</p>
				<p class="mt-2 text-sm text-red-600">
					⚠️ Esta acción no se puede deshacer. Solo se eliminarán los registros, la tabla permanecerá.
				</p>
			</div>

			<div class="flex justify-end gap-3">
				<Button 
					variant="secondary" 
					onclick={closeClearItemsModal}
					disabled={clearItemsModal.isProcessing}
				>
					Cancelar
				</Button>
				<Button 
					variant="destructive" 
					onclick={handleClearItems}
					disabled={clearItemsModal.isProcessing}
					loading={clearItemsModal.isProcessing}
				>
					{clearItemsModal.isProcessing ? 'Eliminando...' : 'Eliminar todos'}
				</Button>
			</div>
		</div>
	</div>
{/if}
