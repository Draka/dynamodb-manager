/**
 * Utilidad de debounce para limitar la frecuencia de ejecución de funciones
 */

/**
 * Crea una función debounced que retrasa la invocación de func
 * hasta que hayan pasado ms milisegundos desde la última invocación
 *
 * @param {Function} func - Función a ejecutar con debounce
 * @param {number} ms - Milisegundos de espera
 * @returns {Function} Función debounced
 */
export function debounce(func, ms = 300) {
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let timeoutId;

	return function (/** @type {any[]} */ ...args) {
		clearTimeout(timeoutId);

		timeoutId = setTimeout(() => {
			func.apply(undefined, args);
		}, ms);
	};
}

/**
 * Crea una función debounced que también puede cancelarse manualmente
 *
 * @param {Function} func - Función a ejecutar con debounce
 * @param {number} ms - Milisegundos de espera
 * @returns {{debounced: Function, cancel: Function}} Función debounced y función de cancelación
 */
export function debounceCancelable(func, ms = 300) {
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let timeoutId;

	const debounced = function (/** @type {any[]} */ ...args) {
		clearTimeout(timeoutId);

		timeoutId = setTimeout(() => {
			func.apply(undefined, args);
		}, ms);
	};

	const cancel = () => {
		clearTimeout(timeoutId);
	};

	return { debounced, cancel };
}
