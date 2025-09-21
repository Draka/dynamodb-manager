<!--
 * Lista de conexiones DynamoDB guardadas
 * Permite seleccionar, editar y eliminar conexiones
-->
<script>
	import { LoadingSpinner } from '../ui/LoadingSpinner';
	import { connections, removeConnection, markConnectionUsed } from '../../stores/connections.js';
	import { currentConnection, setConnection } from '../../stores/current-connection.js';
	import { HardDrive, SquarePen } from 'lucide-svelte';

	/**
	 * @typedef {import('../../services/aws-config.js').AWSConnection} AWSConnection
	 */

	let {
		/** @type {((connection: AWSConnection) => void) | undefined} Callback al editar conexión */
		onEditConnection,
		/** @type {((connection: AWSConnection) => void) | undefined} Callback al seleccionar conexión */
		onConnectionSelected,
		/** @type {string} Tema visual */
		theme = 'light'
	} = $props();

	/** Estado de carga para cada conexión */
	let loadingConnections = $state(new Set());

	/** ID de la conexión actual */
	const currentConnectionId = $derived($currentConnection?.id || null);

	/**
	 * Selecciona y conecta a una conexión
	 * @param {AWSConnection} connection - Conexión a seleccionar
	 */
	async function selectConnection(connection) {
		if (loadingConnections.has(connection.id)) {
			return;
		}

		loadingConnections.add(connection.id);
		loadingConnections = loadingConnections;

		try {
			if (onConnectionSelected) {
				onConnectionSelected(connection);
			} else {
				setConnection(connection);
			}
			markConnectionUsed(connection.id);
		} catch (error) {
			console.error('❌ Error conectando:', error);
		} finally {
			loadingConnections.delete(connection.id);
			loadingConnections = loadingConnections;
		}
	}

	/**
	 * Elimina una conexión con confirmación
	 * @param {AWSConnection} connection - Conexión a eliminar
	 * @param {Event} event - Evento del click
	 */
	function deleteConnection(connection, event) {
		event.stopPropagation();

		const confirmed = confirm(
			`¿Estás seguro de eliminar la conexión "${connection.name}"?\n\nEsta acción no se puede deshacer.`
		);

		if (confirmed) {
			removeConnection(connection.id);

			// Si era la conexión activa, desconectar
			if (currentConnectionId === connection.id) {
				// El store se actualizará automáticamente
			}
		}
	}

	/**
	 * Edita una conexión
	 * @param {AWSConnection} connection - Conexión a editar
	 * @param {Event} event - Evento del click
	 */
	function editConnection(connection, event) {
		event.stopPropagation();
		onEditConnection?.(connection);
	}
</script>

<div class="space-y-4">
	<!-- Lista de conexiones -->

	<!-- Lista de conexiones -->
	{#if $connections.length === 0}
		<div class="py-8 text-center">
			<HardDrive size={24} class="mx-auto {theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}" />
			<p class="mt-3 text-sm {theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}">
				No hay conexiones guardadas
			</p>
		</div>
	{:else}
		<div class="space-y-2">
			{#each $connections as connection (connection.id)}
				{@const isLoading = loadingConnections.has(connection.id)}

				<div
					class="cursor-pointer rounded-lg p-3 transition-all duration-200 {theme === 'dark'
						? 'border border-gray-600 bg-gray-700 hover:bg-gray-600'
						: 'border border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'}"
					onclick={() => selectConnection(connection)}
					role="button"
					tabindex="0"
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							selectConnection(connection);
						}
					}}
				>
					<div class="flex items-start justify-between">
						<div class="min-w-0 flex-1">
							<!-- Título y región -->
							<div class="mb-2 flex items-center gap-2">
								<h4
									class="text-sm font-medium {theme === 'dark'
										? 'text-white'
										: 'text-gray-900'} truncate"
								>
									{connection.name}
								</h4>

								{#if connection.endpoint}
									<span
										class="rounded-full bg-yellow-500 px-2 py-1 text-xs font-medium text-yellow-900"
										>Local</span
									>
								{/if}
							</div>

							<!-- Información de la conexión -->
							<div class="text-xs {theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}">
								<div class="flex items-center gap-1">
									<span>{connection.region}</span>
									{#if connection.endpoint}
										<span>• {connection.endpoint}</span>
									{/if}
								</div>
							</div>
						</div>

						<!-- Botones de acción -->
						<div class="ml-2 flex items-center gap-1">
							{#if isLoading}
								<LoadingSpinner size="sm" />
							{:else}
								{#if onEditConnection}
									<button
										class="hover:bg-opacity-20 rounded p-1 {theme === 'dark'
											? 'text-gray-400 hover:bg-white hover:text-white'
											: 'text-gray-500 hover:bg-gray-500 hover:text-gray-700'}"
										onclick={(e) => editConnection(connection, e)}
										title="Editar conexión"
										aria-label="Editar conexión"
									>
										<SquarePen size={12} />
									</button>
								{/if}

								<button
									class="hover:bg-opacity-20 rounded p-1 text-red-500 hover:bg-red-500 hover:text-red-600"
									onclick={(e) => deleteConnection(connection, e)}
									title="Eliminar conexión"
									aria-label="Eliminar conexión"
								>
									<svg
										class="h-3 w-3"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
										aria-hidden="true"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
										/>
									</svg>
								</button>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
