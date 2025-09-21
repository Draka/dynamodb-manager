<!--
 * Componente de pestañas reutilizable
 * Soporta cerrar pestañas, pestañas activas, y slots personalizados
-->
<script>
	import { X, Grid3X3, Plus } from 'lucide-svelte';
	/**
	 * @typedef {Object} Tab
	 * @property {string} id - Identificador único
	 * @property {string} title - Título a mostrar
	 * @property {boolean} [closable] - Si se puede cerrar
	 * @property {boolean} [active] - Si está activa
	 * @property {any} [data] - Datos adicionales
	 */

	let {
		/** @type {Tab[]} Lista de pestañas */
		tabs = [],
		/** @type {string | null} ID de la pestaña activa */
		activeTab = null,
		/** @type {((tabId: string) => void) | undefined} Callback al cambiar pestaña */
		onTabChange,
		/** @type {((tabId: string) => void) | undefined} Callback al cerrar pestaña */
		onTabClose,
		/** @type {(() => void) | undefined} Callback para agregar nueva pestaña */
		onNewTab = undefined,
		/** @type {string} Texto del botón de nueva pestaña */
		newTabText = 'Nueva pestaña',
		/** @type {boolean} Si mostrar botón de nueva pestaña */
		showNewTab = false,
		/** @type {import('svelte').Snippet} Snippet para el contenido de las pestañas */
		children
	} = $props();

	/**
	 * Maneja el clic en una pestaña
	 * @param {string} tabId - ID de la pestaña
	 */
	function handleTabClick(tabId) {
		activeTab = tabId;
		onTabChange?.(tabId);
	}

	/**
	 * Maneja el cierre de una pestaña
	 * @param {Event} event - Evento de click
	 * @param {string} tabId - ID de la pestaña a cerrar
	 */
	function handleTabClose(event, tabId) {
		event.preventDefault();
		event.stopPropagation();
		onTabClose?.(tabId);
	}

	/**
	 * Maneja el botón de nueva pestaña
	 */
	function handleNewTab() {
		onNewTab?.();
	}
</script>

<div class="flex h-full flex-col">
	<!-- Barra de pestañas -->
	<div class="flex min-h-[40px] items-center border-b border-gray-200 bg-gray-50">
		<div class="flex flex-1 items-center overflow-x-auto">
			{#each tabs as tab (tab.id)}
				<div
					class="group flex items-center gap-2 border-r border-gray-200 px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-150 {activeTab ===
					tab.id
						? 'border-b-2 border-blue-600 bg-white text-blue-600'
						: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}"
					onclick={() => handleTabClick(tab.id)}
					title={tab.title}
					role="button"
					tabindex="0"
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							handleTabClick(tab.id);
						}
					}}
				>
					<!-- Icono de conexión -->
					<Grid3X3 size={16} class="text-green-500" />

					<span class="max-w-[150px] truncate">{tab.title}</span>

					<!-- Botón cerrar -->
					{#if tab.closable !== false}
						<button
							class="ml-1 rounded p-0.5 opacity-60 transition-opacity group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-600"
							onclick={(e) => handleTabClose(e, tab.id)}
							title="Cerrar pestaña"
						>
							<X size={12} />
							<span class="sr-only">Cerrar pestaña</span>
						</button>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Botón nueva pestaña -->
		{#if showNewTab}
			<button
				class="new-tab-button flex items-center gap-2 px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
				onclick={handleNewTab}
				title={newTabText}
			>
				<Plus size={16} />
				<span class="sr-only">{newTabText}</span>
			</button>
		{/if}
	</div>

	<!-- Contenido de la pestaña activa -->
	<div class="flex-1 overflow-hidden bg-white">
		{#if children}
			{@render children()}
		{/if}
	</div>
</div>
