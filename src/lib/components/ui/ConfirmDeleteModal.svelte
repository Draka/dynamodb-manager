<!--
 * Modal de confirmación para eliminar registros
 * Muestra las claves primarias del registro a eliminar
-->
<script>
	import { Modal } from './Modal';
	import { Button } from './Button';
	import { AlertTriangle } from 'lucide-svelte';
	import * as m from '$lib/paraglide/messages.js';

	let {
		/** @type {boolean} */
		open = $bindable(false),
		/** @type {string} */
		title = 'Confirmar eliminación',
		/** @type {string} */
		message = '¿Estás seguro de que deseas eliminar este registro?',
		/** @type {Object | null} */
		recordKeys = null,
		/** @type {string | null} */
		tableName = null,
		/** @type {boolean} */
		isDeleting = false,
		/** @type {() => void} */
		onConfirm,
		/** @type {() => void} */
		onCancel
	} = $props();
</script>

<Modal bind:open {title} size="md">
	<div class="space-y-4">
		<!-- Icono de advertencia -->
		<div class="flex items-center gap-3">
			<div
				class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30"
			>
				<AlertTriangle class="h-6 w-6 text-red-600 dark:text-red-400" />
			</div>
			<div class="flex-1">
				<h3 class="text-lg font-medium text-gray-900 dark:text-white">
					{title}
				</h3>
				<p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
					{message}
				</p>
			</div>
		</div>

		<!-- Información del registro -->
		{#if tableName}
			<div class="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
				<p class="text-sm font-medium text-gray-700 dark:text-gray-300">
					{m['confirmDelete.table']()}
				</p>
				<p class="mt-1 font-mono text-sm text-gray-900 dark:text-white">{tableName}</p>
			</div>
		{/if}

		{#if recordKeys && Object.keys(recordKeys).length > 0}
			<div class="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
				<p class="text-sm font-medium text-gray-700 dark:text-gray-300">
					{m['confirmDelete.primaryKeys']()}
				</p>
				<div class="mt-2 space-y-1">
					{#each Object.entries(recordKeys) as [key, value] (key)}
						<div class="flex items-center gap-2">
							<span class="font-mono text-xs text-gray-600 dark:text-gray-400">{key}:</span>
							<span class="font-mono text-sm text-gray-900 dark:text-white">
								{typeof value === 'object' ? JSON.stringify(value) : value}
							</span>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Advertencia -->
		<div
			class="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20"
		>
			<p class="text-sm font-medium text-red-800 dark:text-red-200">
				{m['confirmDelete.warning']()}
			</p>
			<p class="mt-1 text-xs text-red-700 dark:text-red-300">
				{m['confirmDelete.warningDesc']()}
			</p>
		</div>

		<!-- Botones de acción -->
		<div class="flex justify-end gap-3 pt-2">
			<Button variant="secondary" onclick={onCancel} disabled={isDeleting}>
				{m['confirmDelete.cancel']()}
			</Button>
			<Button variant="danger" onclick={onConfirm} loading={isDeleting}>
				{isDeleting ? m['confirmDelete.deleting']() : m['confirmDelete.delete']()}
			</Button>
		</div>
	</div>
</Modal>
