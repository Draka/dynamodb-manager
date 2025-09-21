/**
 * Store para manejar múltiples conexiones abiertas
 * Permite tener varias conexiones DynamoDB abiertas simultáneamente
 */

import { writable, derived } from 'svelte/store';
import { setCurrentConnectionCookie } from '../services/connection-manager.js';
import { setConnection } from './current-connection.js';

/**
 * @typedef {import('../services/aws-config.js').AWSConnection} AWSConnection
 * @typedef {Object} OpenConnection
 * @property {AWSConnection} connection - Datos de la conexión
 * @property {string | null} selectedTable - Tabla seleccionada
 * @property {string} activeDataTab - Pestaña de datos activa
 * @property {boolean} isLoading - Si está cargando
 * @property {string | null} error - Error si existe
 * @property {string[]} tables - Tablas cargadas
 * @property {boolean} tablesLoading - Si está cargando tablas
 * @property {string | null} tablesError - Error si existe en tablas
 */

/** Store de conexiones abiertas */
export const openConnections = writable(/** @type {Map<string, OpenConnection>} */ (new Map()));

/** Store de la conexión activa */
export const activeConnectionId = writable(/** @type {string | null} */ (null));

/** Store derivado de la conexión activa */
export const activeConnection = derived(
	[openConnections, activeConnectionId],
	([$openConnections, $activeConnectionId]) => {
		if (!$activeConnectionId) return null;
		return $openConnections.get($activeConnectionId) || null;
	}
);

/** Store derivado de la lista de pestañas de conexión */
export const connectionTabs = derived(openConnections, ($openConnections) => {
	return Array.from($openConnections.entries()).map(([id, openConn]) => ({
		id,
		title: openConn.connection.name,
		closable: true,
		data: openConn
	}));
});

/**
 * Abre una nueva conexión
 * @param {AWSConnection} connection - Conexión a abrir
 * @returns {string} ID de la conexión abierta
 */
export function openConnection(connection) {
	const connectionId = connection.id;

	openConnections.update((connections) => {
		connections.set(connectionId, {
			connection,
			selectedTable: null,
			activeDataTab: 'table',
			isLoading: false,
			error: null,
			// Estado de tablas independiente por conexión
			tables: [],
			tablesLoading: false,
			tablesError: null
		});
		return connections;
	});

	// Activar la conexión recién abierta
	setActiveConnection(connectionId);

	return connectionId;
}

/**
 * Cierra una conexión
 * @param {string} connectionId - ID de la conexión a cerrar
 */
export function closeConnection(connectionId) {
	openConnections.update((connections) => {
		connections.delete(connectionId);
		return connections;
	});

	// Si cerramos la conexión activa, activar otra
	activeConnectionId.update((current) => {
		if (current === connectionId) {
			// Obtener la primera conexión disponible
			let firstConnection = null;
			openConnections.subscribe((connections) => {
				const first = connections.keys().next().value;
				firstConnection = first || null;
			})();

			return firstConnection;
		}
		return current;
	});
}

/**
 * Activa una conexión
 * @param {string} connectionId - ID de la conexión a activar
 */
export function setActiveConnection(connectionId) {
	activeConnectionId.set(connectionId);

	// Sincronizar con el store de current-connection para compatibilidad
	openConnections.subscribe((connections) => {
		const openConn = connections.get(connectionId);

		if (openConn) {
			setCurrentConnectionCookie(openConn.connection);
			setConnection(openConn.connection);
		} else {
			console.warn('❌ No se encontró openConn para ID:', connectionId);
		}
	})();
}

/**
 * Actualiza las tablas de una conexión específica
 * @param {string} connectionId - ID de la conexión
 * @param {string[]} tables - Lista de tablas
 * @param {boolean} loading - Estado de carga
 * @param {string | null} error - Error si existe
 */
export function updateConnectionTables(connectionId, tables, loading = false, error = null) {
	openConnections.update((connections) => {
		const openConn = connections.get(connectionId);
		if (openConn) {
			connections.set(connectionId, {
				...openConn,
				tables,
				tablesLoading: loading,
				tablesError: error
			});
		}
		return connections;
	});
}

/**
 * Obtiene una conexión específica por ID (para usar en servidor)
 * @param {string} connectionId - ID de la conexión
 * @returns {import('../services/aws-config.js').AWSConnection | null} Conexión o null si no existe
 */
export function getConnectionById(connectionId) {
	// En el servidor, los stores no están disponibles, retornar null
	// Los endpoints deberían usar el fallback de cookies
	if (typeof window === 'undefined') {
		console.warn(
			'⚠️ getConnectionById llamado desde servidor, retornando null. Usar fallback de cookies.'
		);
		return null;
	}

	let result = null;
	openConnections.subscribe((connections) => {
		const openConn = connections.get(connectionId);
		result = openConn ? openConn.connection : null;
	})();
	return result;
}

/**
 * Selecciona una tabla en la conexión activa
 * @param {string} tableName - Nombre de la tabla
 */
export function selectTable(tableName) {
	let connectionId;
	const unsubscribe = activeConnectionId.subscribe((id) => (connectionId = id));
	unsubscribe();

	if (!connectionId) return;

	openConnections.update((connections) => {
		const openConn = connections.get(connectionId);
		if (openConn) {
			// Si tableName está vacío, deseleccionar la tabla
			openConn.selectedTable = tableName || null;
			if (tableName) {
				openConn.activeDataTab = 'table'; // Resetear a vista de tabla solo si hay tabla
			}
		}
		return connections;
	});
}

/**
 * Cambia la pestaña de datos activa
 * @param {string} tabId - ID de la pestaña de datos
 */
export function setActiveDataTab(tabId) {
	activeConnectionId.subscribe((connectionId) => {
		if (!connectionId) return;

		openConnections.update((connections) => {
			const openConn = connections.get(connectionId);
			if (openConn) {
				openConn.activeDataTab = tabId;
			}
			return connections;
		});
	})();
}

/**
 * Establece el estado de carga de una conexión
 * @param {string} connectionId - ID de la conexión
 * @param {boolean} loading - Estado de carga
 */
export function setConnectionLoading(connectionId, loading) {
	openConnections.update((connections) => {
		const openConn = connections.get(connectionId);
		if (openConn) {
			openConn.isLoading = loading;
		}
		return connections;
	});
}

/**
 * Establece error en una conexión
 * @param {string} connectionId - ID de la conexión
 * @param {string | null} error - Mensaje de error
 */
export function setConnectionError(connectionId, error) {
	openConnections.update((connections) => {
		const openConn = connections.get(connectionId);
		if (openConn) {
			openConn.error = error;
		}
		return connections;
	});
}

/**
 * Obtiene la conexión activa actual
 * @returns {OpenConnection | null}
 */
export function getActiveConnection() {
	let active = null;
	activeConnection.subscribe((value) => (active = value))();
	return active;
}

/**
 * Verifica si hay conexiones abiertas
 * @returns {boolean}
 */
export function hasOpenConnections() {
	let hasConnections = false;
	openConnections.subscribe((connections) => {
		hasConnections = connections.size > 0;
	})();
	return hasConnections;
}
