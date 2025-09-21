<!--
 * Espacio de trabajo principal con pestañas de conexiones
 * Maneja múltiples conexiones abiertas y la navegación entre ellas
-->
<script>
	import { Tabs } from '../ui/Tabs';
	import { DataTabs } from '../ui/DataTabs';
	import TableExplorer from '../dynamodb/TableExplorer.svelte';
	import RecordViewer from '../dynamodb/RecordViewer.svelte';
	import TableDetails from '../dynamodb/TableDetails.svelte';
	import TableInfo from '../dynamodb/TableInfo.svelte';
	import QueryBuilder from '../dynamodb/QueryBuilder.svelte';
	import {
		connectionTabs,
		activeConnectionId,
		activeConnection,
		closeConnection,
		setActiveConnection,
		selectTable,
		setActiveDataTab,
		updateConnectionTables
	} from '../../stores/open-connections.js';
	import { dynamoDbApi } from '../../services/api-client.js';
	import { HardDrive, Table } from 'lucide-svelte';

	/** Pestañas de datos disponibles */
	const dataTabs = [
		{ id: 'table', title: 'Tabla', icon: 'table' },
		{ id: 'query', title: 'Query Builder', icon: 'query' },
		{ id: 'details', title: 'Detalles', icon: 'info' },
		{ id: 'info', title: 'Info', icon: 'edit' }
	];

	/**
	 * Maneja el cambio de pestaña de conexión
	 * @param {string} connectionId - ID de la conexión
	 */
	function handleConnectionTabChange(connectionId) {
		setActiveConnection(connectionId);
	}

	/**
	 * Maneja el cierre de una pestaña de conexión
	 * @param {string} connectionId - ID de la conexión a cerrar
	 */
	function handleConnectionTabClose(connectionId) {
		closeConnection(connectionId);
	}

	/**
	 * Maneja la selección de una tabla
	 * @param {string} tableName - Nombre de la tabla seleccionada
	 */
	function handleTableSelected(tableName) {
		selectTable(tableName);
	}

	/**
	 * Maneja el cambio de pestaña de datos
	 * @param {string} tabId - ID de la pestaña de datos
	 */
	function handleDataTabChange(tabId) {
		setActiveDataTab(tabId);
	}

	/**
	 * Fuerza la recarga de tablas para la conexión activa
	 */
	async function forceRefreshTables() {
		if (!$activeConnectionId) return;
		await loadTablesForConnection($activeConnectionId, true);
	}

	/**
	 * Carga las tablas para una conexión
	 * @param {string} connectionId - ID de la conexión
	 * @param {boolean} force - Forzar recarga aunque ya tenga tablas
	 */
	// Set para rastrear conexiones que ya están cargando para prevenir bucles
	let loadingConnections = $state(new Set());

	/**
	 * @param {string} connectionId
	 */
	async function loadTablesForConnection(connectionId, force = false) {
		if (!connectionId) return;

		// Prevenir cargas duplicadas
		if (loadingConnections.has(connectionId) && !force) {
			return;
		}

		const connectionData = $connectionTabs.find((tab) => tab.id === connectionId);
		if (!connectionData) return;

		/** @type {import('../../stores/open-connections.js').OpenConnection} */
		const openConn = connectionData.data;

		// Solo cargar si es forzado, o no tiene tablas y no está cargando y no se ha intentado antes
		const needsLoading =
			force || (openConn.tables.length === 0 && !openConn.tablesLoading && !openConn.tablesError);
		const hasNeverTried = !openConn.tablesError; // Si hay error, es porque ya se intentó

		if (needsLoading && (force || hasNeverTried)) {
			// Marcar como cargando
			loadingConnections.add(connectionId);
			loadingConnections = loadingConnections; // Trigger reactivity

			// Actualizar estado de carga
			updateConnectionTables(connectionId, [], true, null);

			try {
				const response = await dynamoDbApi.listTables();

				if (response.success) {
					updateConnectionTables(connectionId, response.data, false, null);
				} else {
					const errorMsg = response.error || 'Error desconocido cargando tablas';
					console.error('❌ Error en respuesta:', errorMsg);
					updateConnectionTables(connectionId, [], false, errorMsg);
				}
			} catch (/** @type {any} */ err) {
				const errorMsg = `Error cargando tablas: ${err.message}`;
				console.error('❌ Error en catch:', errorMsg);
				updateConnectionTables(connectionId, [], false, errorMsg);
			} finally {
				// Remover del set de carga
				loadingConnections.delete(connectionId);
				loadingConnections = loadingConnections; // Trigger reactivity
			}
		}
	}

	/**
	 * Carga las tablas para una conexión si no las tiene
	 * @param {string} connectionId - ID de la conexión
	 */
	async function loadTablesIfNeeded(connectionId) {
		await loadTablesForConnection(connectionId, false);
	}

	/**
	 * Registra una conexión en el servidor para que esté disponible en los endpoints
	 * @param {string} connectionId
	 */
	async function registerConnectionInServer(connectionId) {
		if (!connectionId) return;

		const connectionData = $connectionTabs.find((tab) => tab.id === connectionId);
		if (!connectionData) return;

		try {
			const response = await dynamoDbApi.registerConnection(
				connectionId,
				connectionData.data.connection
			);
			if (!response.success) {
				console.error('❌ Error registrando conexión:', response.error);
			}
		} catch (error) {
			console.error('❌ Error registrando conexión:', error);
		}
	}

	// Cargar tablas automáticamente cuando cambie la conexión activa
	// IMPORTANTE: Solo debe dispararse cuando cambia la conexión, no cuando cambia el estado
	let lastConnectionId = $state('');
	$effect(() => {
		if ($activeConnectionId && $activeConnectionId !== lastConnectionId) {
			lastConnectionId = $activeConnectionId;

			// Registrar la conexión en el servidor primero
			registerConnectionInServer($activeConnectionId);

			// Luego cargar las tablas
			loadTablesIfNeeded($activeConnectionId);
		}
	});
</script>

<div class="h-full bg-white">
	{#if $connectionTabs.length === 0}
		<!-- Estado inicial sin conexiones -->
		<div class="flex h-full items-center justify-center bg-gray-50">
			<div class="text-center">
				<HardDrive size={24} class="mx-auto mb-4 text-gray-400" />
				<h3 class="mb-2 text-lg font-medium text-gray-900">Bienvenido a DynamoDB Manager</h3>
				<p class="mb-6 max-w-sm text-gray-600">
					Conecta a una base de datos DynamoDB para comenzar a explorar tus tablas y datos.
				</p>
				<p class="text-sm text-gray-500">
					Usa el panel lateral para crear o seleccionar una conexión.
				</p>
			</div>
		</div>
	{:else}
		<!-- Pestañas de conexiones -->
		<Tabs
			tabs={$connectionTabs}
			activeTab={$activeConnectionId}
			onTabChange={handleConnectionTabChange}
			onTabClose={handleConnectionTabClose}
		>
			{#if $activeConnection}
				<div class="flex h-full">
					<!-- Panel lateral con explorador de tablas -->
					<div class="flex w-80 flex-col overflow-hidden border-r border-gray-200 bg-gray-50">
						<div class="border-b border-gray-200 bg-white p-4">
							<h3 class="font-medium text-gray-900">
								{$activeConnection.connection.name}
							</h3>
							<p class="text-sm text-gray-600">
								{$activeConnection.connection.region}
								{#if $activeConnection.connection.endpoint}
									• {$activeConnection.connection.endpoint}
								{/if}
							</p>
						</div>

						<TableExplorer
							connection={$activeConnection.connection}
							tables={$activeConnection.tables}
							tablesLoading={$activeConnection.tablesLoading}
							tablesError={$activeConnection.tablesError}
							onTableSelected={handleTableSelected}
							onRefreshTables={forceRefreshTables}
							selectedTable={$activeConnection.selectedTable}
						/>
					</div>

					<!-- Panel principal con datos -->
					<div class="flex flex-1 flex-col overflow-hidden">
						{#if $activeConnection.selectedTable}
							<!-- Pestañas de datos -->
							<DataTabs
								tabs={dataTabs}
								activeTab={$activeConnection.activeDataTab}
								onTabChange={handleDataTabChange}
							>
								<div class="h-full flex-1 overflow-hidden p-4">
									{#if $activeConnection.activeDataTab === 'table'}
										<RecordViewer
											tableName={$activeConnection.selectedTable}
											connectionId={$activeConnectionId}
										/>
									{:else if $activeConnection.activeDataTab === 'details'}
										<TableDetails tableName={$activeConnection.selectedTable} />
									{:else if $activeConnection.activeDataTab === 'query'}
										<QueryBuilder
											tableName={$activeConnection.selectedTable}
											connectionId={$activeConnectionId}
										/>
									{:else if $activeConnection.activeDataTab === 'info'}
										<TableInfo tableName={$activeConnection.selectedTable} />
									{/if}
								</div>
							</DataTabs>
						{:else}
							<!-- Estado sin tabla seleccionada -->
							<div class="flex h-full items-center justify-center text-gray-500">
								<div class="text-center">
									<Table size={24} class="mx-auto mb-4" />
									<h3 class="mb-2 text-lg font-medium text-gray-900">Selecciona una tabla</h3>
									<p class="text-gray-600">
										Elige una tabla del panel lateral para comenzar a explorar sus datos.
									</p>
								</div>
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</Tabs>
	{/if}
</div>
