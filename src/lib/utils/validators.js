/**
 * Utilidades de validación para formularios y datos
 * Proporciona validadores reutilizables para toda la aplicación
 */

/**
 * Valida que un campo no esté vacío
 * @param {any} value - Valor a validar
 * @param {string} fieldName - Nombre del campo para mensajes
 * @returns {string | null} Mensaje de error o null si es válido
 */
export function validateRequired(value, fieldName = 'Campo') {
	if (value === null || value === undefined || value === '') {
		return `${fieldName} es requerido`;
	}

	if (typeof value === 'string' && value.trim().length === 0) {
		return `${fieldName} no puede estar vacío`;
	}

	return null;
}

/**
 * Valida la longitud mínima de una cadena
 * @param {string} value - Valor a validar
 * @param {number} minLength - Longitud mínima
 * @param {string} fieldName - Nombre del campo
 * @returns {string | null} Mensaje de error o null si es válido
 */
export function validateMinLength(value, minLength, fieldName = 'Campo') {
	if (typeof value !== 'string') {
		return `${fieldName} debe ser texto`;
	}

	if (value.length < minLength) {
		return `${fieldName} debe tener al menos ${minLength} caracteres`;
	}

	return null;
}

/**
 * Valida la longitud máxima de una cadena
 * @param {string} value - Valor a validar
 * @param {number} maxLength - Longitud máxima
 * @param {string} fieldName - Nombre del campo
 * @returns {string | null} Mensaje de error o null si es válido
 */
export function validateMaxLength(value, maxLength, fieldName = 'Campo') {
	if (typeof value !== 'string') {
		return `${fieldName} debe ser texto`;
	}

	if (value.length > maxLength) {
		return `${fieldName} no puede tener más de ${maxLength} caracteres`;
	}

	return null;
}

/**
 * Valida formato de email
 * @param {string} email - Email a validar
 * @returns {string | null} Mensaje de error o null si es válido
 */
export function validateEmail(email) {
	if (typeof email !== 'string') {
		return 'Email debe ser texto';
	}

	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(email)) {
		return 'Formato de email inválido';
	}

	return null;
}

/**
 * Valida que un número esté en un rango específico
 * @param {number} value - Valor a validar
 * @param {number} min - Valor mínimo
 * @param {number} max - Valor máximo
 * @param {string} fieldName - Nombre del campo
 * @returns {string | null} Mensaje de error o null si es válido
 */
export function validateNumberRange(value, min, max, fieldName = 'Número') {
	if (typeof value !== 'number' || isNaN(value)) {
		return `${fieldName} debe ser un número válido`;
	}

	if (value < min || value > max) {
		return `${fieldName} debe estar entre ${min} y ${max}`;
	}

	return null;
}

/**
 * Valida formato de URL
 * @param {string} url - URL a validar
 * @returns {string | null} Mensaje de error o null si es válido
 */
export function validateURL(url) {
	if (typeof url !== 'string') {
		return 'URL debe ser texto';
	}

	try {
		new URL(url);
		return null;
	} catch {
		return 'Formato de URL inválido';
	}
}

/**
 * Valida formato JSON
 * @param {string} jsonString - Cadena JSON a validar
 * @returns {string | null} Mensaje de error o null si es válido
 */
export function validateJSON(jsonString) {
	if (typeof jsonString !== 'string') {
		return 'JSON debe ser texto';
	}

	if (jsonString.trim().length === 0) {
		return 'JSON no puede estar vacío';
	}

	try {
		JSON.parse(jsonString);
		return null;
	} catch (error) {
		return `JSON inválido: ${error.message}`;
	}
}

/**
 * Valida un objeto usando múltiples validadores
 * @param {Object} data - Datos a validar
 * @param {Object} rules - Reglas de validación
 * @returns {Object} Objeto con errores por campo
 */
export function validateObject(data, rules) {
	const errors = {};

	for (const [field, fieldRules] of Object.entries(rules)) {
		const value = data[field];

		for (const rule of fieldRules) {
			const error = rule(value);
			if (error) {
				errors[field] = error;
				break; // Solo mostrar el primer error por campo
			}
		}
	}

	return errors;
}

/**
 * Verifica si hay errores en un objeto de validación
 * @param {Object} errors - Objeto de errores
 * @returns {boolean} True si hay errores
 */
export function hasErrors(errors) {
	return Object.values(errors).some((error) => error !== null && error !== undefined);
}

/**
 * Validador específico para nombre de tabla DynamoDB
 * @param {string} tableName - Nombre de tabla a validar
 * @returns {string | null} Mensaje de error o null si es válido
 */
export function validateDynamoDBTableName(tableName) {
	if (!tableName || typeof tableName !== 'string') {
		return 'Nombre de tabla es requerido';
	}

	if (tableName.length < 3 || tableName.length > 255) {
		return 'Nombre de tabla debe tener entre 3 y 255 caracteres';
	}

	const validPattern = /^[a-zA-Z0-9._-]+$/;
	if (!validPattern.test(tableName)) {
		return 'Nombre de tabla solo puede contener letras, números, puntos, guiones y guiones bajos';
	}

	return null;
}

/**
 * Validador para claves de atributos DynamoDB
 * @param {string} attributeName - Nombre del atributo
 * @returns {string | null} Mensaje de error o null si es válido
 */
export function validateDynamoDBAttributeName(attributeName) {
	if (!attributeName || typeof attributeName !== 'string') {
		return 'Nombre de atributo es requerido';
	}

	if (attributeName.length > 255) {
		return 'Nombre de atributo no puede tener más de 255 caracteres';
	}

	// DynamoDB permite casi cualquier carácter en nombres de atributos
	// pero hay algunas restricciones para palabras reservadas
	const reservedWords = [
		'ABORT',
		'ABSOLUTE',
		'ACTION',
		'ADD',
		'AFTER',
		'AGENT',
		'AGGREGATE',
		'ALL',
		'ALLOCATE',
		'ALTER',
		'ANALYZE',
		'AND',
		'ANY',
		'ARCHIVE',
		'ARE',
		'ARRAY',
		'AS',
		'ASC',
		'ASCII',
		'ASENSITIVE',
		'ASSERTION'
		// Lista completa sería muy larga, aquí algunos ejemplos
	];

	if (reservedWords.includes(attributeName.toUpperCase())) {
		return `"${attributeName}" es una palabra reservada en DynamoDB`;
	}

	return null;
}
