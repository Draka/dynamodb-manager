<!--
 * Página principal con diseño de pestañas
 * Inspirado en Studio 3T para mejor UX
-->
<script>
	import { Modal, KeyboardShortcutsHelp } from '$lib/components/ui';
	import { ConnectionForm, ConnectionList } from '$lib/components/dynamodb';
	import ConnectionWorkspace from '$lib/components/workspace/ConnectionWorkspace.svelte';
	import { openConnection } from '$lib/stores/open-connections.js';
	import { ChevronLeft, Plus, Menu } from 'lucide-svelte';
	import { ThemeToggle } from '$lib/components/ui';
	import ConnectionStatus from '$lib/components/ui/ConnectionStatus.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import {
		initKeyboardShortcuts,
		cleanupKeyboardShortcuts,
		registerShortcut
	} from '$lib/stores/keyboard-shortcuts.js';
	import { theme } from '$lib/stores/theme.js';

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

	/**
	 * Inicializa los atajos de teclado
	 */
	$effect(() => {
		// Inicializar sistema de atajos
		initKeyboardShortcuts();

		// Registrar atajos específicos
		registerShortcut({
			key: 'n',
			ctrl: true,
			description: 'Nueva conexión',
			category: 'Conexiones',
			handler: openNewConnection
		});

		registerShortcut({
			key: 'r',
			ctrl: true,
			description: 'Refrescar tabla actual',
			category: 'Tabla',
			handler: () => {
				// Dispatch custom event para que componentes internos puedan escuchar
				window.dispatchEvent(new CustomEvent('keyboard-refresh'));
			}
		});

		registerShortcut({
			key: 'f',
			ctrl: true,
			description: 'Enfocar búsqueda',
			category: 'Navegación',
			handler: () => {
				// Dispatch custom event
				window.dispatchEvent(new CustomEvent('keyboard-focus-search'));
			}
		});

		registerShortcut({
			key: 'e',
			ctrl: true,
			description: 'Ejecutar consulta/escaneo',
			category: 'Consultas',
			handler: () => {
				// Dispatch custom event
				window.dispatchEvent(new CustomEvent('keyboard-execute-query'));
			}
		});

		registerShortcut({
			key: 's',
			ctrl: true,
			description: 'Guardar registro actual',
			category: 'Edición',
			handler: () => {
				// Dispatch custom event
				window.dispatchEvent(new CustomEvent('keyboard-save'));
			}
		});

		registerShortcut({
			key: 'Escape',
			description: 'Cerrar modal/editor',
			category: 'Navegación',
			handler: () => {
				// Dispatch custom event
				window.dispatchEvent(new CustomEvent('keyboard-close'));
				// También cerrar el modal de conexión si está abierto
				if (showConnectionModal) {
					closeConnectionModal();
				}
			}
		});

		// Cleanup al desmontar
		return () => {
			cleanupKeyboardShortcuts();
		};
	});
</script>

<svelte:head>
	<title>{m['app.title']()}</title>
	<meta name="description" content={m['app.description']()} />
</svelte:head>

<main class="flex h-screen bg-gray-100 dark:bg-gray-900">
	<!-- Panel lateral izquierdo: Lista de conexiones -->
	<div
		class="flex w-80 flex-col border-r border-gray-300 bg-gray-50 text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white {showConnectionList
			? ''
			: 'hidden'}"
	>
		<!-- Header del panel -->
		<div class="border-b border-gray-300 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
			<div class="flex items-center justify-between">
				<h1 class="text-lg font-semibold text-gray-900 dark:text-white">{m['app.title']()}</h1>
				<button
					class="rounded p-1 text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
					onclick={toggleConnectionList}
					title={m['navigation.hidePanel']()}
				>
					<ChevronLeft size={16} />
					<span class="sr-only">{m['navigation.hidePanel']()}</span>
				</button>
			</div>

			<!-- Botón nueva conexión -->
			<button
				class="mt-3 flex w-full items-center justify-center gap-2 rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:bg-blue-700 dark:hover:bg-blue-600 dark:focus:ring-offset-gray-800"
				onclick={openNewConnection}
			>
				<Plus size={16} />
				{m['navigation.newConnection']()}
			</button>
		</div>

		<!-- Lista de conexiones -->
		<div class="flex-1 overflow-y-auto">
			<div class="p-4">
				<h2
					class="mb-3 text-sm font-medium tracking-wide text-gray-600 uppercase dark:text-gray-400"
				>
					{m['navigation.connections']()}
				</h2>
				<ConnectionList
					onEditConnection={openEditConnection}
					onConnectionSelected={handleConnectionSelected}
					theme={$theme}
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
	title={editingConnection ? m['modal.editConnection']() : m['modal.newConnection']()}
	size="md"
>
	<ConnectionForm
		connection={editingConnection}
		onsaved={handleConnectionSaved}
		oncancelled={closeConnectionModal}
	/>
</Modal>

<!-- Modal de ayuda de atajos de teclado -->
<KeyboardShortcutsHelp />
