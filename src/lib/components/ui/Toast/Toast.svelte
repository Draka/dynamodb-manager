<!--
 * Componente Toast para notificaciones temporales
 * Muestra mensajes de éxito, error, advertencia e info
-->
<script>
	import { notifications, removeNotification } from '$lib/stores/notifications.js';
	import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-svelte';
	import { fly, fade } from 'svelte/transition';
	import * as m from '$lib/paraglide/messages.js';

	/**
	 * Obtiene el icono según el tipo de notificación
	 * @param {'success' | 'error' | 'warning' | 'info'} type
	 * @returns {typeof CheckCircle2} Componente de icono
	 */
	function getIcon(type) {
		switch (type) {
			case 'success':
				return CheckCircle2;
			case 'error':
				return XCircle;
			case 'warning':
				return AlertTriangle;
			case 'info':
			default:
				return Info;
		}
	}

	/**
	 * Obtiene las clases CSS según el tipo
	 * @param {'success' | 'error' | 'warning' | 'info'} type
	 * @returns {string} Clases CSS
	 */
	function getTypeClasses(type) {
		const baseClasses =
			'flex items-start gap-3 min-w-80 max-w-md p-4 rounded-lg shadow-lg border backdrop-blur-sm transition-all';

		switch (type) {
			case 'success':
				return `${baseClasses} bg-green-50/95 dark:bg-green-900/40 border-green-200 dark:border-green-700 text-green-900 dark:text-green-100`;
			case 'error':
				return `${baseClasses} bg-red-50/95 dark:bg-red-900/40 border-red-200 dark:border-red-700 text-red-900 dark:text-red-100`;
			case 'warning':
				return `${baseClasses} bg-yellow-50/95 dark:bg-yellow-900/40 border-yellow-200 dark:border-yellow-700 text-yellow-900 dark:text-yellow-100`;
			case 'info':
			default:
				return `${baseClasses} bg-blue-50/95 dark:bg-blue-900/40 border-blue-200 dark:border-blue-700 text-blue-900 dark:text-blue-100`;
		}
	}

	/**
	 * Obtiene el color del icono según el tipo
	 * @param {'success' | 'error' | 'warning' | 'info'} type
	 * @returns {string} Clase de color
	 */
	function getIconColor(type) {
		switch (type) {
			case 'success':
				return 'text-green-600 dark:text-green-400';
			case 'error':
				return 'text-red-600 dark:text-red-400';
			case 'warning':
				return 'text-yellow-600 dark:text-yellow-400';
			case 'info':
			default:
				return 'text-blue-600 dark:text-blue-400';
		}
	}
</script>

<!-- Contenedor de notificaciones -->
<div class="pointer-events-none fixed right-0 bottom-0 z-50 flex flex-col gap-2 p-4">
	{#each $notifications as notification (notification.id)}
		<div
			class="pointer-events-auto"
			in:fly={{ x: 300, duration: 300 }}
			out:fade={{ duration: 200 }}
		>
			<div class={getTypeClasses(notification.type)} role="alert">
				<!-- Icono -->
				<div class="flex-shrink-0">
					<svelte:component
						this={getIcon(notification.type)}
						class={`${getIconColor(notification.type)}`}
						size={20}
					/>
				</div>

				<!-- Mensaje -->
				<div class="flex-1 text-sm font-medium">
					{notification.message}
				</div>

				<!-- Botón cerrar -->
				{#if notification.dismissible}
					<button
						type="button"
						class="flex-shrink-0 rounded-md p-1 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
						onclick={() => removeNotification(notification.id)}
						aria-label={m['aria.closeNotification']()}
					>
						<X size={16} />
					</button>
				{/if}
			</div>
		</div>
	{/each}
</div>
