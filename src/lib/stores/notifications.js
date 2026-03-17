/**
 * Store para manejar notificaciones toast
 * Sistema de mensajes temporales para feedback al usuario
 */

import { writable } from 'svelte/store';

/**
 * @typedef {Object} Notification
 * @property {string} id - ID único de la notificación
 * @property {'success' | 'error' | 'warning' | 'info'} type - Tipo de notificación
 * @property {string} message - Mensaje a mostrar
 * @property {number} duration - Duración en ms (0 = permanente)
 * @property {boolean} dismissible - Si se puede cerrar manualmente
 */

/** Store de notificaciones activas */
export const notifications = writable(/** @type {Notification[]} */ ([]));

/** Contador para IDs únicos */
let notificationId = 0;

/**
 * Agrega una notificación
 * @param {'success' | 'error' | 'warning' | 'info'} type - Tipo de notificación
 * @param {string} message - Mensaje a mostrar
 * @param {number} [duration=5000] - Duración en ms (0 = permanente)
 * @param {boolean} [dismissible=true] - Si se puede cerrar manualmente
 * @returns {string} ID de la notificación creada
 */
function addNotification(type, message, duration = 5000, dismissible = true) {
	const id = `notification-${++notificationId}`;

	const notification = {
		id,
		type,
		message,
		duration,
		dismissible
	};

	notifications.update((all) => [...all, notification]);

	// Auto-dismiss si tiene duración
	if (duration > 0) {
		setTimeout(() => {
			removeNotification(id);
		}, duration);
	}

	return id;
}

/**
 * Elimina una notificación
 * @param {string} id - ID de la notificación
 */
export function removeNotification(id) {
	notifications.update((all) => all.filter((n) => n.id !== id));
}

/**
 * Muestra una notificación de éxito
 * @param {string} message - Mensaje a mostrar
 * @param {number} [duration=3000] - Duración en ms
 * @returns {string} ID de la notificación
 */
export function notifySuccess(message, duration = 3000) {
	return addNotification('success', message, duration);
}

/**
 * Muestra una notificación de error
 * @param {string} message - Mensaje a mostrar
 * @param {number} [duration=5000] - Duración en ms
 * @returns {string} ID de la notificación
 */
export function notifyError(message, duration = 5000) {
	return addNotification('error', message, duration);
}

/**
 * Muestra una notificación de advertencia
 * @param {string} message - Mensaje a mostrar
 * @param {number} [duration=4000] - Duración en ms
 * @returns {string} ID de la notificación
 */
export function notifyWarning(message, duration = 4000) {
	return addNotification('warning', message, duration);
}

/**
 * Muestra una notificación informativa
 * @param {string} message - Mensaje a mostrar
 * @param {number} [duration=3000] - Duración en ms
 * @returns {string} ID de la notificación
 */
export function notifyInfo(message, duration = 3000) {
	return addNotification('info', message, duration);
}

/**
 * Limpia todas las notificaciones
 */
export function clearAllNotifications() {
	notifications.set([]);
}
