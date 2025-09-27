<!--
 * Página principal con diseño de pestañas
 * Inspirado en Studio 3T para mejor UX
-->
<script>
	import { Modal } from '$lib/components/ui';
	import { ConnectionForm, ConnectionList } from '$lib/components/dynamodb';
	import ConnectionWorkspace from '$lib/components/workspace/ConnectionWorkspace.svelte';
	import { openConnection } from '$lib/stores/open-connections.js';
	import { ChevronLeft, Plus, Menu } from 'lucide-svelte';
	import { ThemeToggle } from '$lib/components/ui';
	import ConnectionStatus from '$lib/components/ui/ConnectionStatus.svelte';
	import * as m from '$lib/paraglide/messages.js';

	/**
	 * @typedef {import('$lib/services/aws-config.js').AWSConnection} AWSConnection
	 */

	/** Estados del modal de conexión */
	let showConnectionModal = $state(false);
	let editingConnection = $state(/** @type {AWSConnection | null} */ (null));
	let showConnectionList = $state(true);

	/**
	 * Abre el modal para nueva conexión
	 */
	function openNewConnection() {
		editingConnection = null;
		showConnectionModal = true;
	}

	/**
	 * Abre el modal para editar conexión
	 * @param {AWSConnection} connection - Conexión a editar
	 */
	function openEditConnection(connection) {
		editingConnection = connection;
		showConnectionModal = true;
	}

	/**
	 * Cierra el modal de conexión
	 */
	function closeConnectionModal() {
		showConnectionModal = false;
		editingConnection = null;
	}

	/**
	 * Maneja cuando se guarda una conexión
	 */
	function handleConnectionSaved() {
		closeConnectionModal();
	}

	/**
	 * Maneja cuando se selecciona una conexión para abrir
	 * @param {AWSConnection} connection - Conexión seleccionada
	 */
	function handleConnectionSelected(connection) {
		openConnection(connection);
		showConnectionList = false;
	}

	/**
	 * Alterna la visibilidad de la lista de conexiones
	 */
	function toggleConnectionList() {
		showConnectionList = !showConnectionList;
	}
</script>

<svelte:head>
	<title>{m['app.title']()}</title>
	<meta name="description" content={m['app.description']()} />
</svelte:head>

<main class="flex h-screen bg-gray-100 dark:bg-gray-900">
	<!-- Panel lateral izquierdo: Lista de conexiones -->
	<div
		class="flex w-80 flex-col border-r border-gray-700 bg-gray-800 text-white dark:border-gray-600 dark:bg-gray-900 {showConnectionList
			? ''
			: 'hidden'}"
	>
		<!-- Header del panel -->
		<div class="border-b border-gray-700 bg-gray-900 p-4 dark:border-gray-600 dark:bg-gray-800">
			<div class="flex items-center justify-between">
				<h1 class="text-lg font-semibold">{m['app.title']()}</h1>
				<button
					class="rounded p-1 hover:bg-gray-700 dark:hover:bg-gray-600"
					onclick={toggleConnectionList}
					title={m['navigation.hidePanel']()}
				>
					<ChevronLeft size={16} />
					<span class="sr-only">{m['navigation.hidePanel']()}</span>
				</button>
			</div>

			<!-- Botón nueva conexión -->
			<button
				class="mt-3 flex w-full items-center justify-center gap-2 rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
				onclick={openNewConnection}
			>
				<Plus size={16} />
				{m['navigation.newConnection']()}
			</button>
		</div>

		<!-- Lista de conexiones -->
		<div class="flex-1 overflow-y-auto">
			<div class="p-4">
				<h2 class="mb-3 text-sm font-medium tracking-wide text-gray-300 uppercase dark:text-gray-400">
					{m['navigation.connections']()}
				</h2>
				<ConnectionList
					onEditConnection={openEditConnection}
					onConnectionSelected={handleConnectionSelected}
					theme="dark"
				/>
			</div>
		</div>
	</div>

	<!-- Contenido principal -->
	<div class="flex flex-1 flex-col overflow-hidden">
		<!-- Barra superior -->
		<div
			class="flex items-center justify-between gap-4 border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-800"
		>
			{#if !showConnectionList}
				<button
					class="rounded p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
					onclick={toggleConnectionList}
					title={m['navigation.showConnections']()}
				>
					<Menu size={20} />
					<span class="sr-only">Mostrar conexiones</span>
				</button>
			{/if}

			<div class="flex flex-1 items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
				<span>{m['app.title']()}</span>
				<ConnectionStatus />
			</div>

			<!-- Theme Toggle -->
			<ThemeToggle />
		</div>

		<!-- Área de trabajo con pestañas -->
		<div class="flex-1 overflow-hidden">
			<ConnectionWorkspace />
		</div>
	</div>
</main>

<!-- Modal de conexión -->
<Modal
	bind:open={showConnectionModal}
	title={editingConnection ? 'Editar Conexión' : 'Nueva Conexión'}
	size="md"
>
	<ConnectionForm
		connection={editingConnection}
		onsaved={handleConnectionSaved}
		oncancelled={closeConnectionModal}
	/>
</Modal>
