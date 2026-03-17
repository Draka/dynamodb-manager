<!--
 * Pestaña de información avanzada de tabla DynamoDB
 * Muestra análisis de datos, configuración y herramientas de administración
-->
<script>
	import { Button } from '../ui/Button';
	import { LoadingSpinner } from '../ui/LoadingSpinner';
	import { isConnected } from '../../stores/current-connection.js';
	import { dynamoDbApi } from '../../services/api-client.js';
	import { notifySuccess, notifyError } from '../../stores/notifications.js';
	import { AlertTriangle, BarChart3, FileText, Copy, ExternalLink, Download } from 'lucide-svelte';
	import * as m from '$lib/paraglide/messages.js';

	let {
		/** @type {string} Nombre de la tabla */
		tableName
	} = $props();

	/** Estados del componente */
	/** @type {Record<string, any> | null} - Info de tabla (TableArn, TimeToLiveDescription, etc.) */
	let tableInfo = $state(null);
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
				error = response.error || m['tableInfo.loadError']();
			}
		} catch (/** @type {unknown} */ err) {
			error = `${m['tableInfo.loadTableError']()}: ${err instanceof Error ? err.message : String(err)}`;
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

		/** @type {Record<string, Set<string>>} */
		const fieldTypes = {};
		/** @type {Record<string, { count: number; nullCount: number; examples: any[] }>} */
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

	/** Valor tipado para uso en script/template (Svelte 5 derived devuelve getter) */
	const dataAnalysisValue = $derived(
		/** @type {{ totalFields: number; fieldTypes: Record<string, string[]>; fieldStats: Record<string, { count: number; nullCount: number; examples: any[] }> } | null} */ (
			/** @type {unknown} */ (dataAnalysis)
		)
	);

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

	/** Valor tipado de advancedConfig para uso en template */
	const advancedConfigValue = $derived(
		/** @type {{ ttl: boolean; ttlAttribute: any; streams: any; streamViewType: any; encryption: boolean; encryptionType: any; pointInTimeRecovery: boolean; billingMode: any; provisionedThroughput: any } | null} */ (
			/** @type {unknown} */ (advancedConfig)
		)
	);

	/**
	 * Formatea el throughput
	 * @param {{ ReadCapacityUnits?: number; WriteCapacityUnits?: number } | null | undefined} throughput
	 */
	function formatThroughput(throughput) {
		if (!throughput) return 'No configurado';
		return `${throughput.ReadCapacityUnits} RCU / ${throughput.WriteCapacityUnits} WCU`;
	}

	/**
	 * Obtiene el color de estado
	 * @param {boolean} enabled
	 */
	function getStatusColor(enabled) {
		return enabled ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400';
	}

	/**
	 * Obtiene el ícono de estado
	 * @param {boolean} enabled
	 */
	function getStatusIcon(enabled) {
		return enabled ? '✓' : '✗';
	}

	/**
	 * Copia texto al portapapeles
	 * @param {string} text
	 * @param {string} label
	 */
	async function copyToClipboard(text, label) {
		try {
			await navigator.clipboard.writeText(text);
			notifySuccess(m['tableInfo.copiedToClipboardWithLabel']({ label }));
		} catch (err) {
			console.error('Error copiando al portapapeles:', err);
			notifyError(m['notifications.copyError']());
		}
	}

	/**
	 * Abre CloudWatch metrics para la tabla
	 */
	function openCloudWatch() {
		if (!tableInfo) return;

		// Extraer región del ARN (arn:aws:dynamodb:REGION:...)
		const arnParts = tableInfo.TableArn.split(':');
		const region = arnParts[3] || 'us-east-1';

		const cloudWatchUrl = `https://${region}.console.aws.amazon.com/cloudwatch/home?region=${region}#metricsV2:graph=~();query=~'*7bAWS*2fDynamoDB*2cTableName*7d*20TableName*3d*22${tableName}*22`;

		window.open(cloudWatchUrl, '_blank');
	}

	/**
	 * Abre la tabla en AWS Console
	 */
	function openInAWSConsole() {
		if (!tableInfo) return;

		const arnParts = tableInfo.TableArn.split(':');
		const region = arnParts[3] || 'us-east-1';

		const consoleUrl = `https://${region}.console.aws.amazon.com/dynamodbv2/home?region=${region}#table?name=${tableName}`;

		window.open(consoleUrl, '_blank');
	}

	/**
	 * Exporta el análisis de datos
	 */
	function exportDataAnalysis() {
		const analysis = dataAnalysisValue;
		if (!analysis) return;

		const analysisReport = {
			tableName,
			analyzedAt: new Date().toISOString(),
			sampleSize: sampleData.length,
			totalFields: analysis.totalFields,
			fields: Object.entries(analysis.fieldStats).map(([field, stats]) => ({
				name: field,
				types: analysis.fieldTypes[field],
				count: stats.count,
				nullCount: stats.nullCount,
				fillPercentage: (((stats.count - stats.nullCount) / stats.count) * 100).toFixed(1) + '%',
				examples: stats.examples
			}))
		};

		const dataStr = JSON.stringify(analysisReport, null, 2);
		const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

		const linkElement = document.createElement('a');
		linkElement.setAttribute('href', dataUri);
		linkElement.setAttribute('download', `${tableName}_analysis.json`);
		linkElement.click();

		notifySuccess('Análisis exportado correctamente');
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
			<h3 class="mb-2 text-lg font-medium text-gray-900 dark:text-white">
				{m['tableInfo.loadInfoError']()}
			</h3>
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
		{#if advancedConfigValue}
			<div
				class="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
			>
				<h4 class="text-md mb-4 font-medium text-gray-900 dark:text-white">
					⚙️ Configuración Avanzada
				</h4>

				<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
					<!-- TTL -->
					<div class="rounded-md border border-gray-100 p-3 dark:border-gray-600 dark:bg-gray-700">
						<div class="flex items-center gap-2">
							<span class="text-lg {getStatusColor(advancedConfigValue.ttl)}">
								{getStatusIcon(advancedConfigValue.ttl)}
							</span>
							<div>
								<p class="text-sm font-medium text-gray-900 dark:text-white">Time To Live (TTL)</p>
								<p class="text-xs text-gray-600 dark:text-gray-300">
									{#if advancedConfigValue.ttl}
										Atributo: {advancedConfigValue.ttlAttribute}
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
							<span class="text-lg {getStatusColor(advancedConfigValue.streams)}">
								{getStatusIcon(advancedConfigValue.streams)}
							</span>
							<div>
								<p class="text-sm font-medium text-gray-900 dark:text-white">DynamoDB Streams</p>
								<p class="text-xs text-gray-600 dark:text-gray-300">
									{#if advancedConfigValue.streams}
										{advancedConfigValue.streamViewType}
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
							<span class="text-lg {getStatusColor(advancedConfigValue.encryption)}">
								{getStatusIcon(advancedConfigValue.encryption)}
							</span>
							<div>
								<p class="text-sm font-medium text-gray-900 dark:text-white">Cifrado</p>
								<p class="text-xs text-gray-600 dark:text-gray-300">
									{#if advancedConfigValue.encryption}
										{advancedConfigValue.encryptionType}
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
							<span class="text-lg {getStatusColor(advancedConfigValue.pointInTimeRecovery)}">
								{getStatusIcon(advancedConfigValue.pointInTimeRecovery)}
							</span>
							<div>
								<p class="text-sm font-medium text-gray-900 dark:text-white">
									Point-in-time Recovery
								</p>
								<p class="text-xs text-gray-600 dark:text-gray-300">
									{advancedConfigValue.pointInTimeRecovery ? 'Habilitado' : 'Deshabilitado'}
								</p>
							</div>
						</div>
					</div>

					<!-- Billing Mode -->
					<div class="rounded-md border border-gray-100 p-3 dark:border-gray-600 dark:bg-gray-700">
						<div>
							<p class="text-sm font-medium text-gray-900 dark:text-white">
								💳 Modo de Facturación
							</p>
							<p class="text-xs text-gray-600 dark:text-gray-300">
								{tableInfo.BillingModeSummary?.BillingMode || 'PROVISIONED'}
							</p>
							{#if (tableInfo.BillingModeSummary?.BillingMode || 'PROVISIONED') === 'PROVISIONED' && advancedConfigValue.provisionedThroughput}
								<p class="mt-1 text-xs text-blue-600 dark:text-blue-400">
									{formatThroughput(advancedConfigValue.provisionedThroughput)}
								</p>
							{/if}
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Análisis de Datos -->
		{#if loadingAnalysis}
			<div
				class="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
			>
				<div class="flex items-center gap-3">
					<LoadingSpinner size="sm" />
					<span class="text-sm text-gray-600 dark:text-gray-300"
						>Analizando estructura de datos...</span
					>
				</div>
			</div>
		{:else if dataAnalysisValue}
			<div
				class="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
			>
				<h4 class="text-md mb-4 font-medium text-gray-900 dark:text-white">📊 Análisis de Datos</h4>

				<div class="mb-4">
					<p class="text-sm text-gray-600 dark:text-gray-300">
						Basado en {sampleData.length} registros de muestra • {dataAnalysisValue?.totalFields ||
							0} campos únicos
					</p>
				</div>

				<div class="space-y-3">
					{#each Object.entries(dataAnalysisValue?.fieldStats || {}) as [field, stats] (field)}
						{@const types = dataAnalysisValue?.fieldTypes[field] || []}
						{@const fillPercentage = (
							((stats.count - stats.nullCount) / stats.count) *
							100
						).toFixed(1)}

						<div
							class="rounded-md border border-gray-100 bg-white p-3 dark:border-gray-600 dark:bg-gray-700"
						>
							<div class="flex items-start justify-between">
								<div class="flex-1">
									<div class="mb-1 flex items-center gap-2">
										<span class="font-mono text-sm font-medium text-gray-900 dark:text-white"
											>{field}</span
										>
										<span
											class="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
										>
											{types.join(', ')}
										</span>
									</div>

									<div class="text-xs text-gray-600 dark:text-gray-300">
										{fillPercentage}% poblado ({stats.count - stats.nullCount}/{stats.count})
										{#if stats.nullCount > 0}
											• {stats.nullCount} nulos
										{/if}
									</div>

									{#if stats.examples.length > 0}
										<div class="mt-2 text-xs text-gray-500 dark:text-gray-400">
											<span class="font-medium">Ejemplos:</span>
											{#each stats.examples as example, i (i)}
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
									<div class="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-600">
										<div
											class="h-2 rounded-full bg-blue-500 dark:bg-blue-400"
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
			<div
				class="rounded-lg border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800"
			>
				<div class="text-center">
					<BarChart3 size={48} class="mx-auto mb-3 text-gray-400 dark:text-gray-500" />
					<h4 class="text-md mb-2 font-medium text-gray-900 dark:text-white">
						📊 Sin Datos para Análisis
					</h4>
					<p class="text-sm text-gray-600 dark:text-gray-300">
						La tabla parece estar vacía. Agrega algunos registros para ver el análisis de estructura
						de datos.
					</p>
				</div>
			</div>
		{/if}

		<!-- Herramientas de Administración -->
		<div
			class="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
		>
			<h4 class="text-md mb-4 font-medium text-gray-900 dark:text-white">
				🛠 Herramientas de Administración
			</h4>

			<div class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
				<!-- CloudWatch -->
				<div
					class="rounded-md border border-gray-100 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700"
				>
					<h5 class="mb-2 font-medium text-gray-900 dark:text-white">📈 Métricas</h5>
					<p class="mb-3 text-sm text-gray-600 dark:text-gray-300">Ver métricas de CloudWatch</p>
					<Button size="sm" variant="secondary" onclick={openCloudWatch}>
						<ExternalLink size={14} class="mr-1" />
						CloudWatch
					</Button>
				</div>

				<!-- AWS Console -->
				<div
					class="rounded-md border border-gray-100 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700"
				>
					<h5 class="mb-2 font-medium text-gray-900 dark:text-white">🌐 AWS Console</h5>
					<p class="mb-3 text-sm text-gray-600 dark:text-gray-300">Abrir tabla en consola de AWS</p>
					<Button size="sm" variant="secondary" onclick={openInAWSConsole}>
						<ExternalLink size={14} class="mr-1" />
						Abrir Console
					</Button>
				</div>

				<!-- Copiar ARN -->
				<div
					class="rounded-md border border-gray-100 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700"
				>
					<h5 class="mb-2 font-medium text-gray-900 dark:text-white">📋 Copiar ARN</h5>
					<p class="mb-3 text-sm text-gray-600 dark:text-gray-300">
						{m['tableInfo.copyArnToClipboard']()}
					</p>
					<Button
						size="sm"
						variant="secondary"
						onclick={() => tableInfo && copyToClipboard(tableInfo.TableArn, 'ARN')}
					>
						<Copy size={14} class="mr-1" />
						Copiar ARN
					</Button>
				</div>

				<!-- Exportar Schema -->
				<div
					class="rounded-md border border-gray-100 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700"
				>
					<h5 class="mb-2 font-medium text-gray-900 dark:text-white">💾 Exportar Schema</h5>
					<p class="mb-3 text-sm text-gray-600 dark:text-gray-300">Descargar definición en JSON</p>
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
						<Download size={14} class="mr-1" />
						Schema
					</Button>
				</div>

				<!-- Exportar Análisis -->
				{#if dataAnalysisValue}
					<div
						class="rounded-md border border-gray-100 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700"
					>
						<h5 class="mb-2 font-medium text-gray-900 dark:text-white">📊 Exportar Análisis</h5>
						<p class="mb-3 text-sm text-gray-600 dark:text-gray-300">Descargar análisis de datos</p>
						<Button size="sm" variant="secondary" onclick={exportDataAnalysis}>
							<Download size={14} class="mr-1" />
							Análisis
						</Button>
					</div>
				{/if}

				<!-- Actualizar -->
				<div
					class="rounded-md border border-gray-100 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700"
				>
					<h5 class="mb-2 font-medium text-gray-900 dark:text-white">🔄 Actualizar Info</h5>
					<p class="mb-3 text-sm text-gray-600 dark:text-gray-300">
						Recargar información y análisis
					</p>
					<Button size="sm" onclick={loadTableInfo} {loading}>Actualizar</Button>
				</div>
			</div>
		</div>

		<!-- Información Técnica -->
		<div
			class="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
		>
			<h4 class="text-md mb-4 font-medium text-gray-900 dark:text-white">🔧 Información Técnica</h4>

			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<div>
					<div class="mb-2 flex items-center justify-between">
						<h5 class="font-medium text-gray-700 dark:text-gray-300">ARN de la Tabla</h5>
						<button
							type="button"
							class="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
							onclick={() => tableInfo && copyToClipboard(tableInfo.TableArn, 'ARN de tabla')}
						>
							<Copy size={14} />
						</button>
					</div>
					<p
						class="rounded bg-gray-50 p-2 font-mono text-xs break-all text-gray-600 dark:bg-gray-700 dark:text-gray-300"
					>
						{tableInfo.TableArn}
					</p>
				</div>

				<div>
					<h5 class="mb-2 font-medium text-gray-700 dark:text-gray-300">Fecha de Creación</h5>
					<p class="text-sm text-gray-600 dark:text-gray-300">
						{new Date(tableInfo.CreationDateTime).toLocaleString('es-ES')}
					</p>
				</div>

				{#if tableInfo.LatestStreamArn}
					<div class="md:col-span-2">
						<div class="mb-2 flex items-center justify-between">
							<h5 class="font-medium text-gray-700 dark:text-gray-300">ARN del Stream</h5>
							<button
								type="button"
								class="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
								onclick={() =>
									tableInfo && copyToClipboard(tableInfo.LatestStreamArn, 'ARN de stream')}
							>
								<Copy size={14} />
							</button>
						</div>
						<p
							class="rounded bg-gray-50 p-2 font-mono text-xs break-all text-gray-600 dark:bg-gray-700 dark:text-gray-300"
						>
							{tableInfo.LatestStreamArn}
						</p>
					</div>
				{/if}
			</div>
		</div>
	{:else}
		<div class="py-12 text-center">
			<div class="mx-auto mb-4 h-12 w-12 text-gray-400 dark:text-gray-600">
				<FileText size={48} />
			</div>
			<h3 class="text-lg font-medium text-gray-900 dark:text-white">Selecciona una tabla</h3>
			<p class="text-gray-600 dark:text-gray-400">
				Elige una tabla para ver su información avanzada
			</p>
		</div>
	{/if}
</div>
