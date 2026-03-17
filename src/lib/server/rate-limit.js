/**
 * Sistema de rate limiting para operaciones de API
 * Limita operaciones de escritura por minuto
 */

/**
 * @typedef {Object} RateLimitConfig
 * @property {number} maxRequests - Máximo de requests permitidos
 * @property {number} windowMs - Ventana de tiempo en milisegundos
 */

/**
 * @typedef {Object} ClientRecord
 * @property {number[]} timestamps - Timestamps de requests
 * @property {number} count - Contador de requests
 */

/**
 * Mapa de clientes y sus requests
 * @type {Map<string, ClientRecord>}
 */
const clients = new Map();

/**
 * Configuraciones de rate limiting por tipo de operación
 */
const rateLimitConfigs = {
	// Operaciones de escritura (más restrictivas)
	write: {
		maxRequests: 30,
		windowMs: 60 * 1000 // 1 minuto
	},
	// Operaciones de lectura (más permisivas)
	read: {
		maxRequests: 100,
		windowMs: 60 * 1000 // 1 minuto
	},
	// Operaciones de conexión
	connection: {
		maxRequests: 10,
		windowMs: 60 * 1000 // 1 minuto
	}
};

/**
 * Limpia timestamps antiguos fuera de la ventana
 * @param {string} clientId - ID del cliente
 * @param {number} windowMs - Ventana de tiempo
 */
function cleanupOldTimestamps(clientId, windowMs) {
	const record = clients.get(clientId);
	if (!record) return;

	const now = Date.now();
	const cutoff = now - windowMs;

	record.timestamps = record.timestamps.filter((ts) => ts > cutoff);
	record.count = record.timestamps.length;

	// Eliminar cliente si no tiene requests recientes
	if (record.count === 0) {
		clients.delete(clientId);
	}
}

/**
 * Verifica si un cliente excedió el rate limit
 * @param {string} clientId - ID del cliente (connection ID, IP, etc.)
 * @param {'write' | 'read' | 'connection'} type - Tipo de operación
 * @returns {{ allowed: boolean, remaining: number, resetAt: number }}
 */
export function checkRateLimit(clientId, type = 'write') {
	const config = rateLimitConfigs[type];
	const now = Date.now();

	// Limpiar timestamps antiguos
	cleanupOldTimestamps(clientId, config.windowMs);

	// Obtener o crear record del cliente
	let record = clients.get(clientId);
	if (!record) {
		record = {
			timestamps: [],
			count: 0
		};
		clients.set(clientId, record);
	}

	// Verificar límite
	const allowed = record.count < config.maxRequests;
	const remaining = Math.max(0, config.maxRequests - record.count);
	const oldestTimestamp = record.timestamps[0] || now;
	const resetAt = oldestTimestamp + config.windowMs;

	return {
		allowed,
		remaining,
		resetAt
	};
}

/**
 * Registra un request para rate limiting
 * @param {string} clientId - ID del cliente
 * @param {'write' | 'read' | 'connection'} type - Tipo de operación
 * @returns {boolean} Si el request fue permitido
 */
export function recordRequest(clientId, type = 'write') {
	const check = checkRateLimit(clientId, type);

	if (!check.allowed) {
		return false;
	}

	// Registrar el request
	const record = clients.get(clientId);
	if (record) {
		record.timestamps.push(Date.now());
		record.count++;
	}

	return true;
}

/**
 * Middleware para rate limiting en SvelteKit
 * @param {'write' | 'read' | 'connection'} type - Tipo de operación
 * @returns {(request: Request) => { allowed: boolean, headers: Record<string, string> }}
 */
export function rateLimitMiddleware(type = 'write') {
	return (request) => {
		// Obtener ID del cliente (usar connection ID del header o IP)
		const connectionId = request.headers.get('x-connection-id');
		const ip =
			request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
		const clientId = connectionId || ip;

		const check = checkRateLimit(clientId, type);

		const headers = {
			'X-RateLimit-Limit': String(rateLimitConfigs[type].maxRequests),
			'X-RateLimit-Remaining': String(check.remaining),
			'X-RateLimit-Reset': new Date(check.resetAt).toISOString()
		};

		if (!check.allowed) {
			return {
				allowed: false,
				headers: {
					...headers,
					'Retry-After': String(Math.ceil((check.resetAt - Date.now()) / 1000))
				}
			};
		}

		// Registrar el request
		recordRequest(clientId, type);

		return {
			allowed: true,
			headers
		};
	};
}

/**
 * Reinicia el rate limit para un cliente
 * @param {string} clientId - ID del cliente
 */
export function resetRateLimit(clientId) {
	clients.delete(clientId);
}

/**
 * Obtiene estadísticas de rate limiting
 * @returns {{ totalClients: number, totalRequests: number }}
 */
export function getRateLimitStats() {
	let totalRequests = 0;

	for (const record of clients.values()) {
		totalRequests += record.count;
	}

	return {
		totalClients: clients.size,
		totalRequests
	};
}

// Limpieza periódica (cada 5 minutos)
if (typeof setInterval !== 'undefined') {
	setInterval(
		() => {
			const maxWindowMs = Math.max(...Object.values(rateLimitConfigs).map((c) => c.windowMs));

			for (const [clientId] of clients.entries()) {
				cleanupOldTimestamps(clientId, maxWindowMs);
			}
		},
		5 * 60 * 1000
	);
}
