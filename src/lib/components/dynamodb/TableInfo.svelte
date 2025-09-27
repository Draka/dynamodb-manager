<!--
 * Pestaña de información avanzada de tabla DynamoDB
 * Muestra análisis de datos, configuración y herramientas de administración
-->
<script>
	import { Button } from '../ui/Button';
	import { LoadingSpinner } from '../ui/LoadingSpinner';
	import { isConnected } from '../../stores/current-connection.js';
	import { dynamoDbApi } from '../../services/api-client.js';
	import { AlertTriangle, BarChart3, FileText } from 'lucide-svelte';

	let {
		/** @type {string} Nombre de la tabla */
		tableName
	} = $props();

	/** Estados del componente */
	let tableInfo = $state(/** @type {Object | null} */ (null));
	let sampleData = $state(/** @type {Object[]} */ ([]));
	let loading = $state(false);
	let error = $state(/** @type {string | null} */ (null));
	let loadingAnalysis = $state(false);

	/**
	 * Carga información completa de la tabla
	 */
	async function loadTableInfo() {
		if (!tableName) return;

		loading = true;
		error = null;

		try {
			const response = await dynamoDbApi.getTableInfo(tableName);
			if (response.success) {
				tableInfo = response.data;
				await loadSampleDataForAnalysis();
			} else {
				error = response.error || 'Error cargando información de tabla';
			}
		} catch (err) {
			error = `Error cargando tabla: ${err.message}`;
			console.error('Error en loadTableInfo:', err);
		} finally {
			loading = false;
		}
	}

	/**
	 * Carga datos de muestra para análisis
	 */
	async function loadSampleDataForAnalysis() {
		loadingAnalysis = true;
		try {
			const response = await dynamoDbApi.scanTable(tableName, { limit: 50 });
			if (response.success) {
				sampleData = response.data.items;
			}
		} catch (err) {
			console.warn('Error cargando muestra de datos:', err);
		} finally {
			loadingAnalysis = false;
		}
	}

	/**
	 * Analiza los tipos de datos en los registros de muestra
	 */
	const dataAnalysis = $derived(() => {
		if (sampleData.length === 0) return null;

		const fieldTypes = {};
		const fieldStats = {};

		// Analizar cada registro
		sampleData.forEach((record) => {
			Object.entries(record).forEach(([field, value]) => {
				if (!fieldTypes[field]) {
					fieldTypes[field] = new Set();
					fieldStats[field] = {
						count: 0,
						nullCount: 0,
						examples: []
					};
				}

				const stats = fieldStats[field];
				stats.count++;

				if (value === null || value === undefined) {
					stats.nullCount++;
				} else {
					const type = Array.isArray(value) ? 'array' : typeof value;
					fieldTypes[field].add(type);

					// Guardar algunos ejemplos
					if (stats.examples.length < 3) {
						stats.examples.push(value);
					}
				}
			});
		});

		return {
			totalFields: Object.keys(fieldTypes).length,
			fieldTypes: Object.fromEntries(
				Object.entries(fieldTypes).map(([field, types]) => [field, Array.from(types)])
			),
			fieldStats
		};
	});

	/**
	 * Obtiene información de configuración avanzada
	 */
	const advancedConfig = $derived(() => {
		if (!tableInfo) return null;

		return {
			ttl: tableInfo.TimeToLiveDescription?.TimeToLiveStatus === 'ENABLED',
			ttlAttribute: tableInfo.TimeToLiveDescription?.AttributeName,
			streams: tableInfo.StreamSpecification?.StreamEnabled,
			streamViewType: tableInfo.StreamSpecification?.StreamViewType,
			encryption: tableInfo.SSEDescription?.Status === 'ENABLED',
			encryptionType: tableInfo.SSEDescription?.SSEType,
			pointInTimeRecovery:
				tableInfo.ContinuousBackupsDescription?.PointInTimeRecoveryDescription
					?.PointInTimeRecoveryStatus === 'ENABLED',
			billingMode: tableInfo.BillingModeSummary?.BillingMode,
			provisionedThroughput: tableInfo.ProvisionedThroughput
		};
	});

	/**
	 * Formatea el throughput
	 */
	function formatThroughput(throughput) {
		if (!throughput) return 'No configurado';
		return `${throughput.ReadCapacityUnits} RCU / ${throughput.WriteCapacityUnits} WCU`;
	}

	/**
	 * Obtiene el color de estado
	 */
	function getStatusColor(enabled) {
		return enabled ? 'text-green-600' : 'text-gray-500';
	}

	/**
	 * Obtiene el ícono de estado
	 */
	function getStatusIcon(enabled) {
		return enabled ? '✓' : '✗';
	}

	// Cargar datos cuando cambie la tabla
	$effect(() => {
		if (tableName && $isConnected) {
			loadTableInfo();
		} else {
			tableInfo = null;
			sampleData = [];
			error = null;
		}
	});
</script>

<div class="flex h-full flex-col gap-4 overflow-y-auto p-4">
	{#if loading}
		<div class="py-12 text-center">
			<LoadingSpinner size="lg" text="Cargando información de tabla..." center />
		</div>
	{:else if error}
		<div class="py-12 text-center">
			<div class="mx-auto mb-4 h-12 w-12 text-red-500">
				<AlertTriangle size={24} />
			</div>
			<h3 class="mb-2 text-lg font-medium text-gray-900 dark:text-white">Error cargando información</h3>
			<p class="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>
			<Button onclick={loadTableInfo}>Reintentar</Button>
		</div>
	{:else if tableInfo}
		<!-- Header -->
		<div class="border-b border-gray-200 pb-4 dark:border-gray-700">
			<h3 class="text-lg font-medium text-gray-900 dark:text-white">
				Información Avanzada: {tableName}
			</h3>
			<p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
				Configuración, análisis de datos y herramientas de administración
			</p>
		</div>

		<!-- Configuración Avanzada -->
		{#if advancedConfig}
			<div class="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
				<h4 class="text-md mb-4 font-medium text-gray-900 dark:text-white">⚙️ Configuración Avanzada</h4>

				<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
					<!-- TTL -->
					<div class="rounded-md border border-gray-100 p-3 dark:border-gray-600 dark:bg-gray-700">
						<div class="flex items-center gap-2">
							<span class="text-lg {getStatusColor(advancedConfig.ttl)}">
								{getStatusIcon(advancedConfig.ttl)}
							</span>
							<div>
								<p class="text-sm font-medium text-gray-900 dark:text-white">Time To Live (TTL)</p>
								<p class="text-xs text-gray-600 dark:text-gray-300">
									{#if advancedConfig.ttl}
										Atributo: {advancedConfig.ttlAttribute}
									{:else}
										Deshabilitado
									{/if}
								</p>
							</div>
						</div>
					</div>

					<!-- Streams -->
					<div class="rounded-md border border-gray-100 p-3 dark:border-gray-600 dark:bg-gray-700">
						<div class="flex items-center gap-2">
							<span class="text-lg {getStatusColor(advancedConfig.streams)}">
								{getStatusIcon(advancedConfig.streams)}
							</span>
							<div>
								<p class="text-sm font-medium text-gray-900 dark:text-white">DynamoDB Streams</p>
								<p class="text-xs text-gray-600 dark:text-gray-300">
									{#if advancedConfig.streams}
										{advancedConfig.streamViewType}
									{:else}
										Deshabilitado
									{/if}
								</p>
							</div>
						</div>
					</div>

					<!-- Encryption -->
					<div class="rounded-md border border-gray-100 p-3 dark:border-gray-600 dark:bg-gray-700">
						<div class="flex items-center gap-2">
							<span class="text-lg {getStatusColor(advancedConfig.encryption)}">
								{getStatusIcon(advancedConfig.encryption)}
							</span>
							<div>
								<p class="text-sm font-medium text-gray-900 dark:text-white">Cifrado</p>
								<p class="text-xs text-gray-600 dark:text-gray-300">
									{#if advancedConfig.encryption}
										{advancedConfig.encryptionType}
									{:else}
										Sin cifrado
									{/if}
								</p>
							</div>
						</div>
					</div>

					<!-- Point in Time Recovery -->
					<div class="rounded-md border border-gray-100 p-3 dark:border-gray-600 dark:bg-gray-700">
						<div class="flex items-center gap-2">
							<span class="text-lg {getStatusColor(advancedConfig.pointInTimeRecovery)}">
								{getStatusIcon(advancedConfig.pointInTimeRecovery)}
							</span>
							<div>
								<p class="text-sm font-medium text-gray-900 dark:text-white">Point-in-time Recovery</p>
								<p class="text-xs text-gray-600 dark:text-gray-300">
									{advancedConfig.pointInTimeRecovery ? 'Habilitado' : 'Deshabilitado'}
								</p>
							</div>
						</div>
					</div>

					<!-- Billing Mode -->
					<div class="rounded-md border border-gray-100 p-3 dark:border-gray-600 dark:bg-gray-700">
						<div>
							<p class="text-sm font-medium text-gray-900 dark:text-white">💳 Modo de Facturación</p>
							<p class="text-xs text-gray-600 dark:text-gray-300">
								{tableInfo.BillingModeSummary?.BillingMode || 'PROVISIONED'}
							</p>
							{#if (tableInfo.BillingModeSummary?.BillingMode || 'PROVISIONED') === 'PROVISIONED' && advancedConfig.provisionedThroughput}
								<p class="mt-1 text-xs text-blue-600 dark:text-blue-400">
									{formatThroughput(advancedConfig.provisionedThroughput)}
								</p>
							{/if}
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Análisis de Datos -->
		{#if loadingAnalysis}
			<div class="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
				<div class="flex items-center gap-3">
					<LoadingSpinner size="sm" />
					<span class="text-sm text-gray-600 dark:text-gray-300">Analizando estructura de datos...</span>
				</div>
			</div>
		{:else if dataAnalysis}
			<div class="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
				<h4 class="text-md mb-4 font-medium text-gray-900 dark:text-white">📊 Análisis de Datos</h4>

				<div class="mb-4">
					<p class="text-sm text-gray-600 dark:text-gray-300">
						Basado en {sampleData.length} registros de muestra • {dataAnalysis?.totalFields || 0} campos
						únicos
					</p>
				</div>

				<div class="space-y-3">
					{#each Object.entries(dataAnalysis?.fieldStats || {}) as [field, stats]}
						{@const types = dataAnalysis?.fieldTypes[field] || []}
						{@const fillPercentage = (
							((stats.count - stats.nullCount) / stats.count) *
							100
						).toFixed(1)}

						<div class="rounded-md border border-gray-100 p-3">
							<div class="flex items-start justify-between">
								<div class="flex-1">
									<div class="mb-1 flex items-center gap-2">
										<span class="font-mono text-sm font-medium text-gray-900">{field}</span>
										<span class="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
											{types.join(', ')}
										</span>
									</div>

									<div class="text-xs text-gray-600">
										{fillPercentage}% poblado ({stats.count - stats.nullCount}/{stats.count})
										{#if stats.nullCount > 0}
											• {stats.nullCount} nulos
										{/if}
									</div>

									{#if stats.examples.length > 0}
										<div class="mt-2 text-xs text-gray-500">
											<span class="font-medium">Ejemplos:</span>
											{#each stats.examples as example, i}
												<span class="font-mono">
													{JSON.stringify(example)}
													{#if i < stats.examples.length - 1},
													{/if}
												</span>
											{/each}
										</div>
									{/if}
								</div>

								<!-- Barra de progreso -->
								<div class="ml-4 w-20">
									<div class="h-2 w-full rounded-full bg-gray-200">
										<div
											class="h-2 rounded-full bg-blue-500"
											style="width: {fillPercentage}%"
										></div>
									</div>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{:else}
			<!-- Sin datos para análisis -->
			<div class="rounded-lg border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800">
				<div class="text-center">
					<BarChart3 size={48} class="mx-auto mb-3 text-gray-400 dark:text-gray-500" />
					<h4 class="text-md mb-2 font-medium text-gray-900 dark:text-white">📊 Sin Datos para Análisis</h4>
					<p class="text-sm text-gray-600 dark:text-gray-300">
						La tabla parece estar vacía. Agrega algunos registros para ver el análisis de estructura
						de datos.
					</p>
				</div>
			</div>
		{/if}

		<!-- Herramientas de Administración -->
		<div class="rounded-lg border border-gray-200 bg-white p-6">
			<h4 class="text-md mb-4 font-medium text-gray-900">🛠 Herramientas de Administración</h4>

			<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
				<div class="rounded-md border border-gray-100 p-4">
					<h5 class="mb-2 font-medium text-gray-900">📈 Métricas</h5>
					<p class="mb-3 text-sm text-gray-600">Ver métricas de CloudWatch para esta tabla</p>
					<Button size="sm" variant="secondary" disabled>Ver en CloudWatch</Button>
				</div>

				<div class="rounded-md border border-gray-100 p-4">
					<h5 class="mb-2 font-medium text-gray-900">💾 Backup</h5>
					<p class="mb-3 text-sm text-gray-600">Crear backup bajo demanda de la tabla</p>
					<Button size="sm" variant="secondary" disabled>Crear Backup</Button>
				</div>

				<div class="rounded-md border border-gray-100 p-4">
					<h5 class="mb-2 font-medium text-gray-900">📋 Exportar Schema</h5>
					<p class="mb-3 text-sm text-gray-600">Exportar definición de la tabla en JSON</p>
					<Button
						size="sm"
						variant="secondary"
						onclick={() => {
							const schema = {
								TableName: tableName,
								...tableInfo
							};
							const dataStr = JSON.stringify(schema, null, 2);
							const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

							const linkElement = document.createElement('a');
							linkElement.setAttribute('href', dataUri);
							linkElement.setAttribute('download', `${tableName}_schema.json`);
							linkElement.click();
						}}
					>
						Descargar Schema
					</Button>
				</div>

				<div class="rounded-md border border-gray-100 p-4">
					<h5 class="mb-2 font-medium text-gray-900">🔄 Actualizar Info</h5>
					<p class="mb-3 text-sm text-gray-600">Recargar información y análisis</p>
					<Button size="sm" onclick={loadTableInfo} {loading}>Actualizar</Button>
				</div>
			</div>
		</div>

		<!-- Información Técnica -->
		<div class="rounded-lg border border-gray-200 bg-white p-6">
			<h4 class="text-md mb-4 font-medium text-gray-900">🔧 Información Técnica</h4>

			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<div>
					<h5 class="mb-2 font-medium text-gray-700">ARN de la Tabla</h5>
					<p class="rounded bg-gray-50 p-2 font-mono text-xs break-all text-gray-600">
						{tableInfo.TableArn}
					</p>
				</div>

				<div>
					<h5 class="mb-2 font-medium text-gray-700">Fecha de Creación</h5>
					<p class="text-sm text-gray-600">
						{new Date(tableInfo.CreationDateTime).toLocaleString('es-ES')}
					</p>
				</div>

				{#if tableInfo.LatestStreamArn}
					<div class="md:col-span-2">
						<h5 class="mb-2 font-medium text-gray-700">ARN del Stream</h5>
						<p class="rounded bg-gray-50 p-2 font-mono text-xs break-all text-gray-600">
							{tableInfo.LatestStreamArn}
						</p>
					</div>
				{/if}
			</div>
		</div>
	{:else}
		<div class="py-12 text-center">
			<div class="mx-auto mb-4 h-12 w-12 text-gray-400">
				<FileText size={24} />
			</div>
			<h3 class="text-lg font-medium text-gray-900">Selecciona una tabla</h3>
			<p class="text-gray-600">Elige una tabla para ver su información avanzada</p>
		</div>
	{/if}
</div>
