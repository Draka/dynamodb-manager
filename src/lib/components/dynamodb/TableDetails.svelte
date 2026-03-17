<!--
 * Vista de detalles de tabla DynamoDB
 * Muestra información completa de la tabla incluyendo claves, índices, configuración, etc.
-->
<script>
	import { LoadingSpinner } from '../ui/LoadingSpinner';
	import { dynamoDbApi } from '../../services/api-client.js';
	import { AlertTriangle, Table, HardDrive, MapPin, List, Code } from 'lucide-svelte';
	import * as m from '$lib/paraglide/messages.js';

	let {
		/** @type {string} Nombre de la tabla */
		tableName,
		/** @type {string} Clases CSS adicionales */
		className = ''
	} = $props();

	/** Estados del componente */
	let tableInfo = $state(/** @type {any | null} */ (null));
	let loading = $state(false);
	let error = $state(/** @type {string | null} */ (null));

	/**
	 * Carga los detalles de la tabla
	 */
	async function loadTableDetails() {
		if (!tableName) return;

		loading = true;
		error = null;

		try {
			const response = await dynamoDbApi.getTableInfo(tableName);
			if (response.success) {
				tableInfo = response.data;
			} else {
				error = response.error || 'Error cargando detalles de la tabla';
			}
		} catch (/** @type {any} */ err) {
			error = `Error cargando detalles: ${err.message}`;
			console.error('Error cargando detalles de tabla:', err);
		} finally {
			loading = false;
		}
	}

	/**
	 * Obtiene las claves de la tabla
	 * @param {any} tableData - Datos de la tabla
	 * @returns {any} Información de claves
	 */
	function getTableKeys(tableData) {
		if (!tableData?.KeySchema) return null;

		const hashKey = tableData.KeySchema.find(
			(/** @type {{ KeyType: string; }} */ key) => key.KeyType === 'HASH'
		);
		const rangeKey = tableData.KeySchema.find(
			(/** @type {{ KeyType: string; }} */ key) => key.KeyType === 'RANGE'
		);

		return {
			hashKey: hashKey?.AttributeName,
			rangeKey: rangeKey?.AttributeName
		};
	}

	/**
	 * Formatea el tamaño en bytes
	 * @param {number} bytes - Tamaño en bytes
	 * @returns {string} Tamaño formateado
	 */
	function formatSize(bytes) {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
		return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
	}

	/**
	 * Formatea el conteo de items
	 * @param {number} count - Número de items
	 * @returns {string} Número formateado
	 */
	function formatItemCount(count) {
		if (count < 1000) return count.toString();
		if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
		return `${(count / 1000000).toFixed(1)}M`;
	}

	/**
	 * Obtiene el color del estado de la tabla
	 * @param {string} status - Estado de la tabla
	 * @returns {string} Clases CSS
	 */
	function getStatusColor(status) {
		switch (status) {
			case 'ACTIVE':
				return 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
			case 'CREATING':
			case 'UPDATING':
				return 'text-yellow-700 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30';
			case 'DELETING':
				return 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
			default:
				return 'text-gray-700 bg-gray-100 dark:text-gray-400 dark:bg-gray-700';
		}
	}

	/**
	 * Formatea una fecha
	 * @param {string} dateString - Fecha como string
	 * @returns {string} Fecha formateada
	 */
	function formatDate(dateString) {
		return new Date(dateString).toLocaleDateString('es-ES', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Cargar detalles cuando cambie la tabla
	$effect(() => {
		if (tableName) {
			loadTableDetails();
		}
	});
</script>

<div class="h-full overflow-y-auto {className}">
	{#if loading}
		<div class="flex h-full items-center justify-center">
			<div class="text-center">
				<LoadingSpinner size="lg" />
				<p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
					Cargando detalles de la tabla...
				</p>
			</div>
		</div>
	{:else if error}
		<div class="flex h-full items-center justify-center">
			<div class="text-center">
				<AlertTriangle size={48} class="mx-auto text-red-500 dark:text-red-400" />
				<h3 class="mt-2 text-lg font-medium text-gray-900 dark:text-white">
					Error cargando detalles
				</h3>
				<p class="mt-1 text-sm text-gray-600 dark:text-gray-400">{error}</p>
				<button
					class="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
					onclick={loadTableDetails}
				>
					Reintentar
				</button>
			</div>
		</div>
	{:else if tableInfo}
		{@const keys = getTableKeys(tableInfo)}

		<div class="space-y-6 p-6">
			<!-- Header con nombre y estado -->
			<div class="border-b border-gray-200 pb-4 dark:border-gray-700">
				<div class="flex items-start justify-between">
					<div>
						<h1 class="text-2xl font-bold text-gray-900 dark:text-white">{tableName}</h1>
						<p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
							Información detallada de la tabla DynamoDB
						</p>
					</div>
					<div class="flex items-center gap-2">
						<span
							class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {getStatusColor(
								tableInfo.TableStatus
							)}"
						>
							{tableInfo.TableStatus}
						</span>
					</div>
				</div>
			</div>

			<!-- Métricas principales -->
			<div class="grid grid-cols-1 gap-6 sm:grid-cols-3">
				<div
					class="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
				>
					<div class="flex items-center gap-3">
						<div class="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
							<Table size={20} class="text-blue-600 dark:text-blue-400" />
						</div>
						<div>
							<p class="text-sm font-medium text-gray-600 dark:text-gray-400">Items</p>
							<p class="text-2xl font-semibold text-gray-900 dark:text-white">
								{formatItemCount(tableInfo.ItemCount || 0)}
							</p>
						</div>
					</div>
				</div>

				<div
					class="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
				>
					<div class="flex items-center gap-3">
						<div class="rounded-lg bg-green-100 p-2 dark:bg-green-900/30">
							<HardDrive size={20} class="text-green-600 dark:text-green-400" />
						</div>
						<div>
							<p class="text-sm font-medium text-gray-600 dark:text-gray-400">Tamaño</p>
							<p class="text-2xl font-semibold text-gray-900 dark:text-white">
								{formatSize(tableInfo.TableSizeBytes || 0)}
							</p>
						</div>
					</div>
				</div>

				<div
					class="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
				>
					<div class="flex items-center gap-3">
						<div class="rounded-lg bg-purple-100 p-2 dark:bg-purple-900/30">
							<svg
								class="h-5 w-5 text-purple-600 dark:text-purple-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
								/>
							</svg>
						</div>
						<div>
							<p class="text-sm font-medium text-gray-600 dark:text-gray-400">Claves</p>
							<p class="text-2xl font-semibold text-gray-900 dark:text-white">
								{keys?.rangeKey ? '2' : '1'}
							</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Esquema de claves -->
			{#if keys}
				<div
					class="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
				>
					<div
						class="border-b border-gray-200 bg-gray-50 px-6 py-3 dark:border-gray-700 dark:bg-gray-900"
					>
						<h2 class="text-lg font-medium text-gray-900 dark:text-white">Esquema de Claves</h2>
					</div>
					<div class="p-6">
						<div class="space-y-4">
							<!-- Clave primaria (Hash) -->
							<div class="flex items-center gap-4">
								<div class="flex items-center gap-2">
									<div class="rounded-lg bg-red-100 p-2 dark:bg-red-900/30">
										<MapPin
											size={16}
											class="text-red-600 dark:text-red-400"
											aria-label={m['tableDetails.primaryKeyIconAriaLabel']()}
										/>
									</div>
									<div>
										<p class="font-medium text-gray-900 dark:text-white">Clave Primaria (Hash)</p>
										<p class="text-sm text-gray-600 dark:text-gray-400">Clave de partición</p>
									</div>
								</div>
								<div class="flex-1">
									<code
										class="rounded-md bg-gray-100 px-2 py-1 font-mono text-sm dark:bg-gray-700 dark:text-gray-300"
										>{keys.hashKey}</code
									>
								</div>
							</div>

							<!-- Clave de ordenación (Range) -->
							{#if keys.rangeKey}
								<div class="flex items-center gap-4">
									<div class="flex items-center gap-2">
										<div class="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
											<List size={16} class="text-blue-600 dark:text-blue-400" />
										</div>
										<div>
											<p class="font-medium text-gray-900 dark:text-white">
												Clave de Ordenación (Range)
											</p>
											<p class="text-sm text-gray-600 dark:text-gray-400">Clave de ordenación</p>
										</div>
									</div>
									<div class="flex-1">
										<code
											class="rounded-md bg-gray-100 px-2 py-1 font-mono text-sm dark:bg-gray-700 dark:text-gray-300"
											>{keys.rangeKey}</code
										>
									</div>
								</div>
							{/if}
						</div>
					</div>
				</div>
			{/if}

			<!-- Atributos -->
			{#if tableInfo.AttributeDefinitions}
				<div
					class="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
				>
					<div
						class="border-b border-gray-200 bg-gray-50 px-6 py-3 dark:border-gray-700 dark:bg-gray-900"
					>
						<h2 class="text-lg font-medium text-gray-900 dark:text-white">
							Definiciones de Atributos
						</h2>
					</div>
					<div class="p-0">
						<div class="overflow-x-auto">
							<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
								<thead class="bg-gray-50 dark:bg-gray-900">
									<tr>
										<th
											class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400"
											>Nombre</th
										>
										<th
											class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400"
											>Tipo</th
										>
										<th
											class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400"
											>Uso</th
										>
									</tr>
								</thead>
								<tbody
									class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800"
								>
									{#each tableInfo.AttributeDefinitions as attr (attr.AttributeName)}
										<tr>
											<td class="px-6 py-4 whitespace-nowrap">
												<code class="font-mono text-sm dark:text-gray-300"
													>{attr.AttributeName}</code
												>
											</td>
											<td class="px-6 py-4 whitespace-nowrap">
												<span
													class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {attr.AttributeType ===
													'S'
														? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
														: attr.AttributeType === 'N'
															? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
															: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}"
												>
													{attr.AttributeType === 'S'
														? 'String'
														: attr.AttributeType === 'N'
															? 'Number'
															: attr.AttributeType === 'B'
																? 'Binary'
																: attr.AttributeType}
												</span>
											</td>
											<td
												class="px-6 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400"
											>
												{#if keys?.hashKey === attr.AttributeName}
													<span
														class="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-400"
													>
														Clave Primaria
													</span>
												{:else if keys?.rangeKey === attr.AttributeName}
													<span
														class="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
													>
														Clave Ordenación
													</span>
												{:else}
													<span class="text-gray-400 dark:text-gray-500">Índice</span>
												{/if}
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			{/if}

			<!-- Información general -->
			<div class="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
				<div
					class="border-b border-gray-200 bg-gray-50 px-6 py-3 dark:border-gray-700 dark:bg-gray-900"
				>
					<h2 class="text-lg font-medium text-gray-900 dark:text-white">Información General</h2>
				</div>
				<div class="p-6">
					<dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div>
							<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">ARN de la tabla</dt>
							<dd class="mt-1 font-mono text-sm break-all text-gray-900 dark:text-gray-300">
								{tableInfo.TableArn}
							</dd>
						</div>
						<div>
							<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">
								Fecha de creación
							</dt>
							<dd class="mt-1 text-sm text-gray-900 dark:text-white">
								{formatDate(tableInfo.CreationDateTime)}
							</dd>
						</div>
						<div>
							<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Clase de tabla</dt>
							<dd class="mt-1 text-sm text-gray-900 dark:text-white">
								{tableInfo.TableClassSummary?.TableClass || 'STANDARD'}
							</dd>
						</div>
						<div>
							<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">
								Modo de facturación
							</dt>
							<dd class="mt-1 text-sm text-gray-900 dark:text-white">
								{tableInfo.BillingModeSummary?.BillingMode || 'PROVISIONED'}
							</dd>
						</div>
					</dl>
				</div>
			</div>
		</div>
	{:else}
		<div class="flex h-full items-center justify-center">
			<div class="text-center">
				<Code size={48} class="mx-auto text-gray-400 dark:text-gray-600" />
				<p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
					Selecciona una tabla para ver sus detalles
				</p>
			</div>
		</div>
	{/if}
</div>
