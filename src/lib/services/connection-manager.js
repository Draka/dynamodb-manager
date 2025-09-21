/**
 * Gestor de conexión actual usando cookies
 * Maneja el estado de la conexión entre cliente y servidor
 */

import { browser } from '$app/environment';

/**
 * @typedef {import('./aws-config.js').AWSConnection} AWSConnection
 */

/**
 * Establece la conexión actual en cookies
 * @param {AWSConnection} connection - Conexión a establecer
 */
export function setCurrentConnectionCookie(connection) {
	if (!browser) return;

	// Guardar conexión en cookie segura (30 días)
	document.cookie = `current_connection=${encodeURIComponent(JSON.stringify(connection))}; path=/; SameSite=Strict; max-age=${60 * 60 * 24 * 30}`;
}

/**
 * Obtiene la conexión actual desde cookies
 * @returns {AWSConnection | null} Conexión actual o null
 */
export function getCurrentConnectionFromCookie() {
	if (!browser) return null;

	const cookies = document.cookie.split(';');
	const connectionCookie = cookies.find((c) => c.trim().startsWith('current_connection='));

	if (!connectionCookie) return null;

	try {
		const connectionData = connectionCookie.split('=')[1];
		return JSON.parse(decodeURIComponent(connectionData));
	} catch {
		return null;
	}
}

/**
 * Limpia la conexión actual de cookies
 */
export function clearCurrentConnectionCookie() {
	if (!browser) return;

	document.cookie = 'current_connection=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
}

/**
 * Verifica si hay una conexión activa
 * @returns {boolean} Si hay conexión activa
 */
export function hasActiveConnection() {
	return getCurrentConnectionFromCookie() !== null;
}
