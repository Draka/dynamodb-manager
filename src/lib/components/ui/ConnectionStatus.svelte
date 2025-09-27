<!--
 * Indicador de estado de conexión
 * Muestra el estado actual de la conexión y permite reconectarse manualmente
-->
<script>
	import { connectionStatus, reconnect } from '../../stores/current-connection.js';
	import { Button } from './Button';
	import { Wifi, WifiOff, Loader, RefreshCw, AlertTriangle } from 'lucide-svelte';

	/** Estados reactivos */
	let reconnecting = $state(false);

	/**
	 * Maneja la reconexión manual
	 */
	async function handleReconnect() {
		if (reconnecting) return;

		reconnecting = true;
		try {
			await reconnect();
		} finally {
			reconnecting = false;
		}
	}

	/**
	 * Obtiene el color del indicador según el estado
	 * @param {string} status - Estado de conexión
	 * @returns {string} Clase CSS para el color
	 */
	function getStatusColor(status) {
		switch (status) {
			case 'connected':
				return 'text-green-500';
			case 'reconnecting':
			case 'testing':
				return 'text-yellow-500';
			case 'error':
			case 'disconnected':
				return 'text-red-500';
			default:
				return 'text-gray-400';
		}
	}

	/**
	 * Obtiene el ícono según el estado
	 * @param {string} status - Estado de conexión
	 * @returns {any} Componente del ícono
	 */
	function getStatusIcon(status) {
		switch (status) {
			case 'connected':
				return Wifi;
			case 'reconnecting':
			case 'testing':
				return Loader;
			case 'error':
			case 'disconnected':
				return WifiOff;
			default:
				return AlertTriangle;
		}
	}

	/**
	 * Obtiene el texto descriptivo del estado
	 * @param {string} status - Estado de conexión
	 * @returns {string} Descripción del estado
	 */
	function getStatusText(status) {
		switch (status) {
			case 'connected':
				return 'Conectado';
			case 'reconnecting':
				return 'Reconectando...';
			case 'testing':
				return 'Verificando...';
			case 'error':
				return 'Error de conexión';
			case 'disconnected':
				return 'Desconectado';
			default:
				return 'Estado desconocido';
		}
	}

	// Componente de icono reactivo
	const IconComponent = $derived(getStatusIcon($connectionStatus));
</script>

<!-- Contenedor principal -->
<div
	class="flex items-center gap-2 rounded-md border px-3 py-2 transition-colors {$connectionStatus ===
	'connected'
		? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
		: $connectionStatus === 'error'
			? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
			: 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20'}"
>
	<!-- Ícono de estado -->
	<div class="{getStatusColor($connectionStatus)} flex-shrink-0">
		{#if $connectionStatus === 'reconnecting' || $connectionStatus === 'testing'}
			<IconComponent size={16} class="animate-spin" />
		{:else}
			<IconComponent size={16} />
		{/if}
	</div>

	<!-- Texto de estado -->
	<span class="text-sm font-medium text-gray-700 dark:text-gray-200">
		{getStatusText($connectionStatus)}
	</span>

	<!-- Botón de reconexión (solo visible en error) -->
	{#if $connectionStatus === 'error'}
		<Button
			variant="ghost"
			size="sm"
			onclick={handleReconnect}
			disabled={reconnecting}
			class="ml-2 h-6 px-2 text-xs"
		>
			{#if reconnecting}
				<Loader size={12} class="mr-1 animate-spin" />
				Conectando...
			{:else}
				<RefreshCw size={12} class="mr-1" />
				Reconectar
			{/if}
		</Button>
	{/if}
</div>
