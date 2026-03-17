/**
 * Store para cachear esquemas de tablas DynamoDB
 * Evita llamadas repetidas a describeTable()
 */

import { writable } from 'svelte/store';

/** TTL del cache en milisegundos (5 minutos) */
const CACHE_TTL = 5 * 60 * 1000;

/**
 * @typedef {Object} CachedSchema
 * @property {Object} data - Datos del esquema de la tabla
 * @property {number} timestamp - Timestamp de cuando se cacheó
 * @property {string} connectionId - ID de la conexión
 * @property {string} tableName - Nombre de la tabla
 */

/**
 * Store que almacena los esquemas cacheados
 * Key: `${connectionId}:${tableName}`
 * @type {import('svelte/store').Writable<Map<string, CachedSchema>>}
 */
const schemaCache = writable(new Map());

/**
 * Genera una clave de cache única
 * @param {string} connectionId - ID de la conexión
 * @param {string} tableName - Nombre de la tabla
 * @returns {string} Clave de cache
 */
function getCacheKey(connectionId, tableName) {
	return `${connectionId}:${tableName}`;
}

/**
 * Verifica si un item del cache es válido
 * @param {CachedSchema} cached - Item cacheado
 * @returns {boolean} Si el item es válido
 */
function isCacheValid(cached) {
	const now = Date.now();
	return now - cached.timestamp < CACHE_TTL;
}

/**
 * Obtiene un esquema del cache si existe y es válido
 * @param {string} connectionId - ID de la conexión
 * @param {string} tableName - Nombre de la tabla
 * @returns {Object | null} Esquema cacheado o null
 */
export function getCachedSchema(connectionId, tableName) {
	/** @type {Map<string, CachedSchema> | undefined} */
	let cache;
	schemaCache.subscribe((value) => {
		cache = value;
	})();

	const key = getCacheKey(connectionId, tableName);
	const cached = cache ? cache.get(key) : undefined;

	if (cached && isCacheValid(cached)) {
		return cached.data;
	}

	// Limpiar cache expirado si existe
	if (cached) {
		schemaCache.update((c) => {
			c.delete(key);
			return c;
		});
	}

	return null;
}

/**
 * Guarda un esquema en el cache
 * @param {string} connectionId - ID de la conexión
 * @param {string} tableName - Nombre de la tabla
 * @param {Object} schemaData - Datos del esquema
 */
export function cacheSchema(connectionId, tableName, schemaData) {
	const key = getCacheKey(connectionId, tableName);

	schemaCache.update((cache) => {
		cache.set(key, {
			data: schemaData,
			timestamp: Date.now(),
			connectionId,
			tableName
		});
		return cache;
	});
}

/**
 * Invalida (elimina) un esquema específico del cache
 * @param {string} connectionId - ID de la conexión
 * @param {string} tableName - Nombre de la tabla
 */
export function invalidateSchema(connectionId, tableName) {
	const key = getCacheKey(connectionId, tableName);

	schemaCache.update((cache) => {
		cache.delete(key);
		return cache;
	});
}

/**
 * Invalida todos los esquemas de una conexión
 * @param {string} connectionId - ID de la conexión
 */
export function invalidateConnectionSchemas(connectionId) {
	schemaCache.update((cache) => {
		const keysToDelete = [];

		// Encontrar todas las claves de esta conexión
		for (const [key, value] of cache.entries()) {
			if (value.connectionId === connectionId) {
				keysToDelete.push(key);
			}
		}

		// Eliminar las claves
		keysToDelete.forEach((key) => cache.delete(key));

		return cache;
	});
}

/**
 * Limpia todo el cache
 */
export function clearAllCache() {
	schemaCache.set(new Map());
}

/**
 * Limpia entradas expiradas del cache
 */
export function cleanExpiredCache() {
	schemaCache.update((cache) => {
		const keysToDelete = [];

		for (const [key, value] of cache.entries()) {
			if (!isCacheValid(value)) {
				keysToDelete.push(key);
			}
		}

		keysToDelete.forEach((key) => cache.delete(key));

		return cache;
	});
}

/**
 * Obtiene estadísticas del cache (útil para debugging)
 * @returns {{total: number, valid: number, expired: number}}
 */
export function getCacheStats() {
	let stats = { total: 0, valid: 0, expired: 0 };

	schemaCache.subscribe((cache) => {
		stats.total = cache.size;
		for (const value of cache.values()) {
			if (isCacheValid(value)) {
				stats.valid++;
			} else {
				stats.expired++;
			}
		}
	})();

	return stats;
}

// Limpiar cache expirado cada 2 minutos
/** @type {ReturnType<typeof setInterval> | undefined} */
let cleanupIntervalId = undefined;
const existing =
	typeof globalThis !== 'undefined'
		? /** @type {ReturnType<typeof setInterval> | undefined} */ (
				/** @type {any} */ (globalThis).__schemaCleanupIntervalId
			)
		: undefined;
if (existing) {
	clearInterval(existing);
}

cleanupIntervalId = setInterval(cleanExpiredCache, 2 * 60 * 1000);
if (typeof globalThis !== 'undefined') {
	/** @type {any} */ (globalThis).__schemaCleanupIntervalId = cleanupIntervalId;
}

/**
 * Detiene el intervalo de limpieza automática
 */
export function stopCleanupInterval() {
	if (cleanupIntervalId) {
		clearInterval(cleanupIntervalId);
		cleanupIntervalId = undefined;
		if (typeof globalThis !== 'undefined') {
			/** @type {any} */ (globalThis).__schemaCleanupIntervalId = undefined;
		}
	}
}
