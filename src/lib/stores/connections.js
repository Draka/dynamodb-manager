/**
 * Store global para gestión de conexiones DynamoDB
 * Maneja el estado de todas las conexiones guardadas
 */

import { writable } from 'svelte/store';
import { browser } from '$app/environment';

/**
 * @typedef {import('../services/aws-config.js').AWSConnection} AWSConnection
 */

/** Clave para almacenamiento local */
const STORAGE_KEY = 'dynamodb_connections';

/**
 * Carga las conexiones desde localStorage
 * @returns {AWSConnection[]} Conexiones guardadas
 */
function loadConnections() {
	if (!browser) return [];

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (!stored) return [];

		const connections = JSON.parse(stored);
		return connections.map((conn) => ({
			...conn,
			createdAt: new Date(conn.createdAt),
			lastUsed: new Date(conn.lastUsed)
		}));
	} catch (error) {
		console.error('Error cargando conexiones:', error);
		return [];
	}
}

/**
 * Guarda las conexiones en localStorage
 * @param {AWSConnection[]} connections - Conexiones a guardar
 */
function saveConnections(connections) {
	if (!browser) return;

	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(connections));
	} catch (error) {
		console.error('Error guardando conexiones:', error);
	}
}

/** Store de conexiones */
export const connections = writable(loadConnections());

/**
 * Añade una nueva conexión
 * @param {AWSConnection} connection - Nueva conexión
 */
export function addConnection(connection) {
	connections.update((current) => {
		const updated = [...current, connection];
		saveConnections(updated);
		return updated;
	});
}

/**
 * Actualiza una conexión existente
 * @param {string} id - ID de la conexión
 * @param {Partial<AWSConnection>} updates - Actualizaciones
 */
export function updateConnection(id, updates) {
	connections.update((current) => {
		const updated = current.map((conn) =>
			conn.id === id ? { ...conn, ...updates, lastUsed: new Date() } : conn
		);
		saveConnections(updated);
		return updated;
	});
}

/**
 * Elimina una conexión
 * @param {string} id - ID de la conexión a eliminar
 */
export function removeConnection(id) {
	connections.update((current) => {
		const updated = current.filter((conn) => conn.id !== id);
		saveConnections(updated);
		return updated;
	});
}

/**
 * Busca una conexión por ID
 * @param {string} id - ID de la conexión
 * @returns {AWSConnection | null} Conexión encontrada o null
 */
export function findConnection(id) {
	let found = null;
	const unsubscribe = connections.subscribe((current) => {
		found = current.find((conn) => conn.id === id) || null;
	});
	unsubscribe();
	return found;
}

/**
 * Actualiza la fecha de último uso de una conexión
 * @param {string} id - ID de la conexión
 */
export function markConnectionUsed(id) {
	updateConnection(id, { lastUsed: new Date() });
}

/**
 * Limpia todas las conexiones
 */
export function clearConnections() {
	connections.set([]);
	if (browser) {
		localStorage.removeItem(STORAGE_KEY);
	}
}

/**
 * Exporta las conexiones a JSON
 * @returns {string} JSON con las conexiones
 */
export function exportConnections() {
	let current = [];
	const unsubscribe = connections.subscribe((value) => (current = value));
	unsubscribe();
	return JSON.stringify(current, null, 2);
}

/**
 * Importa conexiones desde JSON
 * @param {string} json - JSON con las conexiones
 * @returns {boolean} Si la importación fue exitosa
 */
export function importConnections(json) {
	try {
		const imported = JSON.parse(json);

		if (!Array.isArray(imported)) {
			throw new Error('El formato debe ser un array');
		}

		const validated = imported.map((conn) => ({
			...conn,
			createdAt: new Date(conn.createdAt || Date.now()),
			lastUsed: new Date(conn.lastUsed || Date.now())
		}));

		connections.set(validated);
		saveConnections(validated);
		return true;
	} catch (error) {
		console.error('Error importando conexiones:', error);
		return false;
	}
}
