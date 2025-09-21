<!--
 * Pestañas específicas para visualización de datos
 * Incluye Table View, JSON View, Query Builder, etc.
-->
<script>
	import { Code, Search, Table, SquarePen, Braces } from 'lucide-svelte';

	/**
	 * @typedef {Object} DataTab
	 * @property {string} id - Identificador único
	 * @property {string} title - Título a mostrar
	 * @property {string} icon - Icono a mostrar
	 * @property {boolean} [active] - Si está activa
	 */

	let {
		/** @type {DataTab[]} Lista de pestañas de datos */
		tabs = [],
		/** @type {string | null} ID de la pestaña activa */
		activeTab = null,
		/** @type {((tabId: string) => void) | undefined} Callback al cambiar pestaña */
		onTabChange,
		/** @type {import('svelte').Snippet} Snippet para el contenido */
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
</script>

<div class="flex h-full flex-col">
	<!-- Barra de pestañas -->
	<div class="flex items-center border-b border-gray-300 bg-gray-100">
		{#each tabs as tab (tab.id)}
			<button
				class="flex items-center gap-2 border-r border-gray-300 px-4 py-3 text-sm font-medium transition-all duration-200 first:border-l-0 {activeTab ===
				tab.id
					? '-mb-px border-b-2 border-blue-500 bg-white text-gray-900'
					: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}"
				onclick={() => handleTabClick(tab.id)}
			>
				<!-- Icono -->
				{#if tab.icon === 'table'}
					<Table size={16} />
				{:else if tab.icon === 'json'}
					<Braces size={16} />
				{:else if tab.icon === 'query'}
					<Search size={16} />
				{:else if tab.icon === 'edit'}
					<SquarePen size={16} />
				{:else if tab.icon === 'info'}
					<Code size={16} />
				{:else}
					<Table size={16} />
				{/if}

				<span>{tab.title}</span>
			</button>
		{/each}
	</div>

	<!-- Contenido de la pestaña activa -->
	<div class="relative flex-1 overflow-hidden bg-white">
		{#if children}
			{@render children()}
		{/if}
	</div>
</div>
