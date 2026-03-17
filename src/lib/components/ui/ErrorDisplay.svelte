<!--
 * Componente para mostrar errores de la aplicación
 * Usa el store centralizado de errores
-->
<script>
	import { errors, dismissError } from '$lib/stores/errors.js';
	import { AlertCircle, X, Wifi, ShieldAlert, Database, HelpCircle } from 'lucide-svelte';
	import { fly } from 'svelte/transition';
	import * as m from '$lib/paraglide/messages.js';

	/**
	 * Obtiene el icono según el tipo de error
	 * @param {import('$lib/stores/errors.js').ErrorType} type
	 */
	function getErrorIcon(type) {
		switch (type) {
			case 'network':
				return Wifi;
			case 'auth':
				return ShieldAlert;
			case 'dynamodb':
				return Database;
			case 'validation':
				return AlertCircle;
			default:
				return HelpCircle;
		}
	}

	/**
	 * Obtiene el color según el tipo de error
	 * @param {import('$lib/stores/errors.js').ErrorType} type
	 */
	function getErrorColor(type) {
		switch (type) {
			case 'network':
				return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-200';
			case 'auth':
				return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200';
			case 'dynamodb':
				return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200';
			case 'validation':
				return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200';
			default:
				return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200';
		}
	}

	/**
	 * Traduce el tipo de error
	 * @param {import('$lib/stores/errors.js').ErrorType} type
	 */
	function getErrorTypeLabel(type) {
		const labels = {
			network: m['errors.network'](),
			auth: m['errors.auth'](),
			dynamodb: m['errors.dynamodb'](),
			validation: m['errors.validation'](),
			unknown: m['errors.general']()
		};
		return labels[type] || m['errors.general']();
	}
</script>

<!-- Contenedor de errores (esquina superior derecha) -->
<div class="fixed top-20 right-4 z-50 flex max-w-md flex-col gap-2">
	{#each $errors as error (error.id)}
		<div
			class="rounded-lg border-2 p-4 shadow-lg {getErrorColor(error.type)}"
			transition:fly={{ x: 300, duration: 300 }}
			role="alert"
			aria-live="assertive"
		>
			<div class="flex items-start gap-3">
				<!-- Icono -->
				<div class="flex-shrink-0">
					<svelte:component this={getErrorIcon(error.type)} size={20} />
				</div>

				<!-- Contenido -->
				<div class="min-w-0 flex-1">
					<h4 class="text-sm font-semibold">
						{getErrorTypeLabel(error.type)}
					</h4>
					<p class="mt-1 text-sm">
						{error.message}
					</p>
					{#if error.details}
						<p class="mt-1 text-xs opacity-80">
							{error.details}
						</p>
					{/if}
				</div>

				<!-- Botón cerrar -->
				<button
					type="button"
					class="flex-shrink-0 rounded transition-opacity hover:opacity-70"
					onclick={() => dismissError(error.id)}
					aria-label={m['errors.dismissAriaLabel']()}
				>
					<X size={16} />
				</button>
			</div>
		</div>
	{/each}
</div>
