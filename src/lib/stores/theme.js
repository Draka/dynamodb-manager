/**
 * Store para manejo del tema (claro/oscuro)
 * Incluye persistencia en localStorage y detección de tema del sistema
 */

import { writable } from 'svelte/store';
import { browser } from '$app/environment';

/** @typedef {'light' | 'dark' | 'system'} ThemeMode */

// Constantes para los temas
export const THEME_MODES = {
	LIGHT: /** @type {ThemeMode} */ ('light'),
	DARK: /** @type {ThemeMode} */ ('dark'),
	SYSTEM: /** @type {ThemeMode} */ ('system')
};

/**
 * Obtiene el tema inicial desde localStorage o sistema
 * @returns {ThemeMode}
 */
function getInitialTheme() {
	if (!browser) return THEME_MODES.SYSTEM;

	const stored = localStorage.getItem('theme');
	if (stored && Object.values(THEME_MODES).includes(/** @type {ThemeMode} */ (stored))) {
		return /** @type {ThemeMode} */ (stored);
	}

	return THEME_MODES.SYSTEM;
}

/**
 * Detecta si el sistema prefiere tema oscuro
 * @returns {boolean}
 */
function getSystemPrefersDark() {
	if (!browser) return false;
	return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Resuelve el tema actual basado en la configuración y sistema
 * @param {ThemeMode} themeMode - Modo de tema configurado
 * @returns {'light' | 'dark'}
 */
function resolveTheme(themeMode) {
	if (themeMode === THEME_MODES.SYSTEM) {
		return getSystemPrefersDark() ? THEME_MODES.DARK : THEME_MODES.LIGHT;
	}
	return themeMode;
}

// Store reactivo del modo de tema
export const themeMode = writable(getInitialTheme());

// Store derivado del tema actual (resuelto)
export const theme = writable(resolveTheme(getInitialTheme()));

// Sincronizar themeMode changes con theme
themeMode.subscribe((mode) => {
	if (browser) {
		const resolvedTheme = resolveTheme(mode);
		theme.set(resolvedTheme);
		applyThemeToDocument(resolvedTheme);
	}
});

/**
 * Cambia el modo de tema y lo persiste
 * @param {ThemeMode} mode - Nuevo modo de tema
 */
export function setThemeMode(mode) {
	if (!browser) return;

	// Persistir en localStorage
	localStorage.setItem('theme', mode);

	// Actualizar store (esto disparará la suscripción que actualiza theme y DOM)
	themeMode.set(mode);
}

/**
 * Alterna entre tema claro y oscuro
 */
export function toggleTheme() {
	let currentMode;
	const unsubscribe = themeMode.subscribe((mode) => (currentMode = mode));
	unsubscribe();

	// Si está en system, cambiar a light/dark según preferencia actual
	if (currentMode === THEME_MODES.SYSTEM) {
		const systemPrefersDark = getSystemPrefersDark();
		setThemeMode(systemPrefersDark ? THEME_MODES.LIGHT : THEME_MODES.DARK);
	} else if (currentMode === THEME_MODES.LIGHT) {
		setThemeMode(THEME_MODES.DARK);
	} else {
		setThemeMode(THEME_MODES.LIGHT);
	}
}

/**
 * Aplica el tema al documento HTML
 * @param {'light' | 'dark'} resolvedTheme - Tema resuelto
 */
function applyThemeToDocument(resolvedTheme) {
	if (!browser) return;

	const htmlElement = document.documentElement;

	if (resolvedTheme === THEME_MODES.DARK) {
		htmlElement.classList.add('dark');
	} else {
		htmlElement.classList.remove('dark');
	}
}

// Inicialización cuando está en browser
if (browser) {
	// Aplicar tema inicial
	const initialTheme = resolveTheme(getInitialTheme());
	theme.set(initialTheme);
	applyThemeToDocument(initialTheme);

	// Escuchar cambios en preferencias del sistema
	const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
	mediaQuery.addEventListener('change', (e) => {
		let currentMode;
		const unsubscribe = themeMode.subscribe((mode) => (currentMode = mode));
		unsubscribe();

		// Solo actualizar si está en modo sistema
		if (currentMode === THEME_MODES.SYSTEM) {
			const newTheme = e.matches ? THEME_MODES.DARK : THEME_MODES.LIGHT;
			theme.set(newTheme);
			applyThemeToDocument(newTheme);
		}
	});
}
