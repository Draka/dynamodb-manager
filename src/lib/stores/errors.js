/**
 * Store centralizado para manejo de errores
 * Clasifica, registra y gestiona errores de la aplicación
 */

import { writable } from 'svelte/store';

/**
 * @typedef {'network' | 'validation' | 'auth' | 'dynamodb' | 'unknown'} ErrorType
 */

/**
 * @typedef {Object} AppError
 * @property {string} id - ID único del error
 * @property {ErrorType} type - Tipo de error
 * @property {string} message - Mensaje del error
 * @property {string} [details] - Detalles adicionales
 * @property {Date} timestamp - Cuándo ocurrió
 * @property {boolean} handled - Si fue manejado
 * @property {string} [stack] - Stack trace (solo en dev)
 */

/**
 * Store de errores activos
 * @type {import('svelte/store').Writable<AppError[]>}
 */
export const errors = writable([]);

/**
 * Store de historial de errores (últimos 50)
 * @type {import('svelte/store').Writable<AppError[]>}
 */
const errorHistory = writable([]);

const MAX_HISTORY = 50;
let errorCount = 0;

/**
 * Clasifica un error según su mensaje
 * @param {Error | string} error - Error a clasificar
 * @returns {ErrorType}
 */
function classifyError(error) {
	const message = typeof error === 'string' ? error : error.message;
	const lowerMessage = message.toLowerCase();

	if (
		lowerMessage.includes('network') ||
		lowerMessage.includes('fetch') ||
		lowerMessage.includes('connection')
	) {
		return 'network';
	}
	if (
		lowerMessage.includes('validation') ||
		lowerMessage.includes('invalid') ||
		lowerMessage.includes('required')
	) {
		return 'validation';
	}
	if (
		lowerMessage.includes('auth') ||
		lowerMessage.includes('credential') ||
		lowerMessage.includes('unauthorized')
	) {
		return 'auth';
	}
	if (
		lowerMessage.includes('dynamodb') ||
		lowerMessage.includes('table') ||
		lowerMessage.includes('item')
	) {
		return 'dynamodb';
	}

	return 'unknown';
}

/**
 * Registra un nuevo error
 * @param {Error | string} error - Error a registrar
 * @param {Object} [options] - Opciones adicionales
 * @param {ErrorType} [options.type] - Tipo de error (si no se especifica, se clasifica automáticamente)
 * @param {string} [options.details] - Detalles adicionales
 * @param {boolean} [options.silent] - No mostrar en UI (solo log)
 * @returns {string} ID del error
 */
export function logError(error, options = {}) {
	const errorId = `err_${++errorCount}_${Date.now()}`;
	const message = typeof error === 'string' ? error : error.message;
	const type = options.type || classifyError(error);

	/** @type {AppError} */
	const appError = {
		id: errorId,
		type,
		message,
		details: options.details,
		timestamp: new Date(),
		handled: false,
		stack: typeof error === 'object' && error.stack ? error.stack : undefined
	};

	// Log a consola en desarrollo
	if (import.meta.env.DEV) {
		console.error(`[${type.toUpperCase()}] ${message}`, {
			details: options.details,
			stack: appError.stack
		});
	}

	// Agregar al historial
	errorHistory.update((history) => {
		const newHistory = [appError, ...history].slice(0, MAX_HISTORY);
		return newHistory;
	});

	// Agregar a errores activos (si no es silencioso)
	if (!options.silent) {
		errors.update((errs) => [...errs, appError]);

		// Auto-remover después de 10 segundos
		setTimeout(() => {
			dismissError(errorId);
		}, 10000);
	}

	return errorId;
}

/**
 * Marca un error como manejado y lo remueve de la lista activa
 * @param {string} errorId - ID del error
 */
export function dismissError(errorId) {
	errors.update((errs) => errs.filter((e) => e.id !== errorId));

	errorHistory.update((history) => {
		return history.map((e) => (e.id === errorId ? { ...e, handled: true } : e));
	});
}

/**
 * Limpia todos los errores activos
 */
export function clearErrors() {
	errors.set([]);
}

/**
 * Obtiene estadísticas de errores
 * @returns {{ total: number, byType: Record<ErrorType, number>, recent: AppError[] }}
 */
export function getErrorStats() {
	/** @type {AppError[]} */
	let history = [];
	errorHistory.subscribe((h) => (history = h))();

	const byType = history.reduce((acc, err) => {
		acc[err.type] = (acc[err.type] || 0) + 1;
		return acc;
	}, /** @type {Record<ErrorType, number>} */ ({}));

	return {
		total: history.length,
		byType,
		recent: history.slice(0, 10)
	};
}

/**
 * Wrapper para funciones async que maneja errores automáticamente
 * @template T
 * @param {() => Promise<T>} fn - Función async a ejecutar
 * @param {Object} [options] - Opciones de manejo de errores
 * @param {string} [options.errorMessage] - Mensaje personalizado de error
 * @param {ErrorType} [options.type] - Tipo de error
 * @returns {Promise<T | null>}
 */
export async function withErrorHandling(fn, options = {}) {
	try {
		return await fn();
	} catch (error) {
		logError(error instanceof Error ? error : new Error(String(error)), {
			type: options.type,
			details: options.errorMessage
		});
		return null;
	}
}

/**
 * Hook para boundary de errores en componentes
 * @param {() => void} onError - Callback cuando ocurre un error
 * @returns {(error: Error) => void}
 */
export function useErrorBoundary(onError) {
	return (error) => {
		logError(error, { type: 'unknown' });
		onError?.();
	};
}
