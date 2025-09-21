<!--
 * Modal de confirmación para eliminar tablas DynamoDB
 * Diferentes niveles de confirmación según el tipo de conexión:
 * - Local: Modal simple con confirmación
 * - AWS: Requiere escribir el nombre de la tabla
-->
<script>
	import { Button } from './Button';
	import { TextInput } from './Input';
	import { Modal } from './Modal';
	import { AlertTriangle, Info } from 'lucide-svelte';

	let {
		/** @type {boolean} Si el modal está abierto */
		isOpen = false,
		/** @type {string} Nombre de la tabla a eliminar */
		tableName = '',
		/** @type {boolean} Si es una conexión local (DynamoDB local) */
		isLocal = false,
		/** @type {string} Nombre de la conexión para contexto */
		connectionName = '',
		/** @type {(() => void) | undefined} Callback al cerrar */
		onClose,
		/** @type {(() => void) | undefined} Callback al confirmar eliminación */
		onConfirm
	} = $props();

	/** Estados del componente */
	let confirmationText = $state('');
	let isDeleting = $state(false);

	/** Validación para eliminar */
	const canDelete = $derived(isLocal ? true : confirmationText.trim() === tableName);

	/**
	 * Maneja la confirmación de eliminación
	 */
	async function handleConfirm() {
		if (!canDelete || isDeleting) return;

		isDeleting = true;
		try {
			await onConfirm?.();
		} finally {
			isDeleting = false;
		}
	}

	/**
	 * Maneja el cierre del modal
	 */
	function handleClose() {
		if (isDeleting) return;

		confirmationText = '';
		onClose?.();
	}

	/**
	 * Resetea el estado cuando se abre/cierra el modal
	 */
	$effect(() => {
		if (!isOpen) {
			confirmationText = '';
			isDeleting = false;
		}
	});
</script>

<Modal open={isOpen} onclose={handleClose} size="md">
	<div class="p-6">
		<!-- Header -->
		<div class="flex items-center gap-4">
			<div class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
				<AlertTriangle size={24} class="text-red-600" />
			</div>
			<div>
				<h3 class="text-lg font-medium text-gray-900">Eliminar tabla</h3>
				<p class="text-sm text-gray-500">
					{connectionName} • {isLocal ? 'Local' : 'AWS'}
				</p>
			</div>
		</div>

		<!-- Contenido -->
		<div class="mt-6">
			<div class="mb-4">
				<p class="text-sm text-gray-700">
					{#if isLocal}
						¿Estás seguro de que deseas eliminar la tabla
						<code class="rounded bg-gray-100 px-1 py-0.5 font-mono text-sm font-medium"
							>{tableName}</code
						>?
					{:else}
						¿Estás seguro de que deseas eliminar permanentemente la tabla
						<code class="rounded bg-gray-100 px-1 py-0.5 font-mono text-sm font-medium"
							>{tableName}</code
						>
						de AWS?
					{/if}
				</p>
			</div>

			{#if !isLocal}
				<!-- Confirmación especial para AWS -->
				<div class="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
					<div class="flex">
						<div class="flex-shrink-0">
							<AlertTriangle size={20} class="text-yellow-400" />
						</div>
						<div class="ml-3">
							<h4 class="text-sm font-medium text-yellow-800">Confirmación requerida</h4>
							<p class="mt-1 text-sm text-yellow-700">
								Esta acción eliminará permanentemente la tabla y todos sus datos de AWS DynamoDB.
								Esta operación <strong>no se puede deshacer</strong>.
							</p>
						</div>
					</div>
				</div>

				<div class="mt-4">
					<label for="confirmation" class="block text-sm font-medium text-gray-700">
						Para confirmar, escribe el nombre de la tabla:
					</label>
					<div class="mt-2">
						<TextInput
							id="confirmation"
							bind:value={confirmationText}
							placeholder="Escribe: {tableName}"
							disabled={isDeleting}
							class="font-mono"
						/>
					</div>
				</div>
			{:else}
				<!-- Advertencia más simple para local -->
				<div class="rounded-lg border border-orange-200 bg-orange-50 p-4">
					<div class="flex">
						<div class="flex-shrink-0">
							<Info size={20} class="text-orange-400" />
						</div>
						<div class="ml-3">
							<p class="text-sm text-orange-700">
								Esta acción eliminará la tabla y todos sus datos del DynamoDB local.
							</p>
						</div>
					</div>
				</div>
			{/if}
		</div>

		<!-- Footer con botones -->
		<div class="mt-6 flex justify-end gap-3">
			<Button variant="secondary" onclick={handleClose} disabled={isDeleting}>Cancelar</Button>
			<Button variant="danger" onclick={handleConfirm} disabled={!canDelete} loading={isDeleting}>
				{isDeleting ? 'Eliminando...' : 'Eliminar tabla'}
			</Button>
		</div>
	</div>
</Modal>
