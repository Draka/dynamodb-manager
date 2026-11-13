/**
 * Store para historial de queries en QueryBuilder
 * Persiste en localStorage las últimas queries ejecutadas
 */

import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const STORAGE_KEY = 'dynamodb_query_history';
const MAX_HISTORY = 50;

/**
 * @typedef {Object} QueryHistoryEntry
 * @property {string} id
 * @property {string} tableName
 * @property {string} connectionId
 * @property {'query' | 'scan'} operation
 * @property {Object} config - Query configuration snapshot
 * @property {number} resultCount
 * @property {number} timestamp
 */

/**
 * Carga el historial desde localStorage
 * @returns {QueryHistoryEntry[]}
 */
function loadHistory() {
	if (!browser) return [];
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		return stored ? JSON.parse(stored) : [];
	} catch {
		return [];
	}
}

/**
 * Guarda el historial en localStorage
 * @param {QueryHistoryEntry[]} history
 */
function saveHistory(history) {
	if (!browser) return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
	} catch {
		// localStorage full or unavailable
	}
}

/** @type {import('svelte/store').Writable<QueryHistoryEntry[]>} */
export const queryHistory = writable(loadHistory());

/**
 * Añade una entrada al historial
 * @param {Omit<QueryHistoryEntry, 'id' | 'timestamp'>} entry
 */
export function addQueryToHistory(entry) {
	queryHistory.update((current) => {
		const newEntry = {
			...entry,
			id: `qh_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
			timestamp: Date.now()
		};
		const updated = [newEntry, ...current].slice(0, MAX_HISTORY);
		saveHistory(updated);
		return updated;
	});
}

/**
 * Elimina una entrada del historial
 * @param {string} id
 */
export function removeFromHistory(id) {
	queryHistory.update((current) => {
		const updated = current.filter((e) => e.id !== id);
		saveHistory(updated);
		return updated;
	});
}

/**
 * Limpia todo el historial
 */
export function clearHistory() {
	queryHistory.set([]);
	if (browser) {
		localStorage.removeItem(STORAGE_KEY);
	}
}

/**
 * Obtiene historial filtrado por tabla
 * @param {QueryHistoryEntry[]} history
 * @param {string} tableName
 * @returns {QueryHistoryEntry[]}
 */
export function getHistoryForTable(history, tableName) {
	return history.filter((e) => e.tableName === tableName);
}
