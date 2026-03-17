/**
 * Store para manejar atajos de teclado globales
 * Permite registrar, ejecutar y mostrar atajos de teclado
 */

import { writable } from 'svelte/store';

/**
 * @typedef {Object} KeyboardShortcut
 * @property {string} key - Tecla (e.g., 'n', 'r', 'f')
 * @property {boolean} [ctrl] - Requiere Ctrl (Cmd en Mac)
 * @property {boolean} [shift] - Requiere Shift
 * @property {boolean} [alt] - Requiere Alt
 * @property {string} description - Descripción del atajo
 * @property {string} category - Categoría (e.g., 'General', 'Tabla', 'Edición')
 * @property {() => void} handler - Función a ejecutar
 * @property {boolean} [preventDefault] - Si prevenir comportamiento por defecto (default: true)
 */

/**
 * Store para controlar si el modal de ayuda está abierto
 */
export const showShortcutsHelp = writable(false);

/**
 * Mapa de atajos de teclado registrados
 * @type {Map<string, KeyboardShortcut>}
 */
const shortcuts = new Map();

/**
 * Detecta si estamos en Mac
 */
const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.userAgent);

/**
 * Genera una clave única para el atajo
 * @param {KeyboardShortcut} shortcut - Atajo
 * @returns {string} Clave única
 */
function getShortcutKey(shortcut) {
	const parts = [];
	if (shortcut.ctrl) parts.push('ctrl');
	if (shortcut.shift) parts.push('shift');
	if (shortcut.alt) parts.push('alt');
	parts.push(shortcut.key.toLowerCase());
	return parts.join('+');
}

/**
 * Genera una representación legible del atajo
 * @param {KeyboardShortcut} shortcut - Atajo
 * @returns {string} Representación legible
 */
export function getShortcutDisplay(shortcut) {
	const parts = [];
	if (shortcut.ctrl) parts.push(isMac ? '⌘' : 'Ctrl');
	if (shortcut.shift) parts.push('⇧');
	if (shortcut.alt) parts.push(isMac ? '⌥' : 'Alt');
	parts.push(shortcut.key.toUpperCase());
	return parts.join('+');
}

/**
 * Registra un atajo de teclado
 * @param {KeyboardShortcut} shortcut - Atajo a registrar
 */
export function registerShortcut(shortcut) {
	const key = getShortcutKey(shortcut);
	shortcuts.set(key, {
		...shortcut,
		preventDefault: shortcut.preventDefault ?? true
	});
}

/**
 * Elimina un atajo de teclado
 * @param {Partial<KeyboardShortcut>} shortcut - Atajo a eliminar
 */
export function unregisterShortcut(shortcut) {
	const key = getShortcutKey(/** @type {KeyboardShortcut} */ (shortcut));
	shortcuts.delete(key);
}

/**
 * Obtiene todos los atajos registrados agrupados por categoría
 * @returns {Record<string, KeyboardShortcut[]>}
 */
export function getShortcutsByCategory() {
	const byCategory = /** @type {Record<string, KeyboardShortcut[]>} */ ({});

	for (const shortcut of shortcuts.values()) {
		if (!byCategory[shortcut.category]) {
			byCategory[shortcut.category] = [];
		}
		byCategory[shortcut.category].push(shortcut);
	}

	return byCategory;
}

/**
 * Maneja un evento de teclado y ejecuta el atajo si coincide
 * @param {KeyboardEvent} event - Evento de teclado
 * @returns {boolean} Si se ejecutó un atajo
 */
export function handleKeyboardEvent(event) {
	// Ignorar si estamos en un input, textarea o contenteditable
	const target = /** @type {HTMLElement} */ (event.target);
	if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
		// Excepción: permitir Escape siempre
		if (event.key !== 'Escape') {
			return false;
		}
	}

	// Construir la clave del atajo presionado
	const parts = [];
	const ctrlKey = isMac ? event.metaKey : event.ctrlKey;

	if (ctrlKey) parts.push('ctrl');
	if (event.shiftKey) parts.push('shift');
	if (event.altKey) parts.push('alt');
	parts.push(event.key.toLowerCase());

	const pressedKey = parts.join('+');

	// Buscar atajo coincidente
	const shortcut = shortcuts.get(pressedKey);

	if (shortcut) {
		if (shortcut.preventDefault) {
			event.preventDefault();
			event.stopPropagation();
		}
		shortcut.handler();
		return true;
	}

	return false;
}

/**
 * Inicializa el listener global de teclado
 */
export function initKeyboardShortcuts() {
	if (typeof window === 'undefined') return;

	// Listener global
	window.addEventListener('keydown', handleKeyboardEvent);

	// Registrar atajo de ayuda (?)
	registerShortcut({
		key: '?',
		shift: true,
		description: 'Mostrar ayuda de atajos de teclado',
		category: 'General',
		handler: () => {
			showShortcutsHelp.update((v) => !v);
		}
	});
}

/**
 * Limpia el listener global de teclado
 */
export function cleanupKeyboardShortcuts() {
	if (typeof window === 'undefined') return;
	window.removeEventListener('keydown', handleKeyboardEvent);
	shortcuts.clear();
}
