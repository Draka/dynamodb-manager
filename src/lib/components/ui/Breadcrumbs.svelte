<!--
 * Componente Breadcrumbs para navegación jerárquica
 * Muestra la ruta actual: Conexión > Tabla > Vista
-->
<script>
	import { ChevronRight, Home } from 'lucide-svelte';
	import * as m from '$lib/paraglide/messages.js';

	/**
	 * @typedef {Object} BreadcrumbItem
	 * @property {string} label - Texto a mostrar
	 * @property {string} [href] - URL opcional (si es clickeable)
	 * @property {() => void} [onclick] - Callback opcional al hacer clic
	 * @property {boolean} [current] - Si es el item actual
	 */

	let {
		/** @type {BreadcrumbItem[]} Lista de items del breadcrumb */
		items = [],
		/** @type {boolean} Mostrar icono de home al inicio */
		showHome = true
	} = $props();
</script>

<nav aria-label="Breadcrumb" class="flex items-center space-x-1 text-sm">
	{#if showHome && items.length > 0}
		<Home size={14} class="text-gray-400 dark:text-gray-500" aria-label={m['aria.home']()} />
		<ChevronRight size={14} class="text-gray-400 dark:text-gray-500" aria-hidden="true" />
	{/if}

	{#each items as item, index (index)}
		{#if item.current}
			<!-- Item actual (no clickeable) -->
			<span class="font-medium text-gray-900 dark:text-white" aria-current="page">
				{item.label}
			</span>
		{:else if item.onclick || item.href}
			<!-- Item clickeable -->
			<button
				type="button"
				class="text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
				onclick={item.onclick}
			>
				{item.label}
			</button>
		{:else}
			<!-- Item no clickeable -->
			<span class="text-gray-600 dark:text-gray-400">
				{item.label}
			</span>
		{/if}

		{#if index < items.length - 1}
			<ChevronRight size={14} class="text-gray-400 dark:text-gray-500" aria-hidden="true" />
		{/if}
	{/each}
</nav>
