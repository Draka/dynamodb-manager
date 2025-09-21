/**
 * Almacén server-side para conexiones activas
 * Mantiene las conexiones en memoria para que los endpoints puedan acceder a ellas
 */

/**
 * @typedef {import('../services/aws-config.js').AWSConnection} AWSConnection
 */

/** Almacén en memoria de conexiones activas */
const activeConnections = new Map();

/**
 * Registra una conexión activa
 * @param {string} connectionId - ID de la conexión
 * @param {AWSConnection} connection - Datos de la conexión
 */
export function registerConnection(connectionId, connection) {
	activeConnections.set(connectionId, {
		...connection,
		registeredAt: new Date(),
		lastUsed: new Date()
	});
}

/**
 * Obtiene una conexión por su ID
 * @param {string} connectionId - ID de la conexión
 * @returns {AWSConnection | null} Conexión o null si no existe
 */
export function getServerConnection(connectionId) {
	const connection = activeConnections.get(connectionId);
	if (connection) {
		// Actualizar lastUsed
		connection.lastUsed = new Date();
		return connection;
	}
	console.warn(`❌ Conexión no encontrada: ${connectionId}`);
	return null;
}

/**
 * Desregistra una conexión
 * @param {string} connectionId - ID de la conexión
 */
export function unregisterConnection(connectionId) {
	if (activeConnections.delete(connectionId)) {
		return true;
	}
	return false;
}

/**
 * Lista todas las conexiones activas
 * @returns {Array<{id: string, connection: AWSConnection}>} Lista de conexiones
 */
export function listActiveConnections() {
	return Array.from(activeConnections.entries()).map(([id, connection]) => ({
		id,
		connection
	}));
}

/**
 * Limpia conexiones antiguas (más de 1 hora sin usar)
 */
export function cleanupOldConnections() {
	const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
	let cleaned = 0;

	for (const [id, connection] of activeConnections) {
		if (connection.lastUsed < oneHourAgo) {
			activeConnections.delete(id);
			cleaned++;
		}
	}

	if (cleaned > 0) {
		return true;
	}
}

// Limpiar conexiones antiguas cada 30 minutos
setInterval(cleanupOldConnections, 30 * 60 * 1000);
