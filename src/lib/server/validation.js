/**
 * Utilidades de validación y sanitización para el servidor
 * Protege contra inyecciones y datos maliciosos
 */

/**
 * Sanitiza un nombre de tabla DynamoDB
 * @param {string} tableName - Nombre a sanitizar
 * @returns {string} Nombre sanitizado
 * @throws {Error} Si el nombre es inválido
 */
export function sanitizeTableName(tableName) {
	if (!tableName || typeof tableName !== 'string') {
		throw new Error('Nombre de tabla requerido');
	}

	// DynamoDB permite 3-255 caracteres
	if (tableName.length < 3 || tableName.length > 255) {
		throw new Error('Nombre de tabla debe tener entre 3 y 255 caracteres');
	}

	// Solo permite letras, números, guiones, puntos y guiones bajos
	const validPattern = /^[a-zA-Z0-9._-]+$/;
	if (!validPattern.test(tableName)) {
		throw new Error('Nombre de tabla contiene caracteres inválidos');
	}

	return tableName.trim();
}

/**
 * Valida y sanitiza un límite de consulta
 * @param {any} limit - Límite a validar
 * @param {number} [maxLimit=1000] - Límite máximo permitido
 * @returns {number} Límite sanitizado
 */
export function sanitizeLimit(limit, maxLimit = 1000) {
	const numLimit = Number(limit);

	if (isNaN(numLimit) || numLimit < 1) {
		return 100; // Default
	}

	return Math.min(numLimit, maxLimit);
}

/**
 * Valida el tamaño de un item DynamoDB
 * @param {any} item - Item a validar
 * @param {number} [maxSize=400] - Tamaño máximo en KB
 * @returns {boolean} Si es válido
 * @throws {Error} Si excede el tamaño
 */
export function validateItemSize(item, maxSize = 400) {
	const itemStr = JSON.stringify(item);
	const sizeKB = new Blob([itemStr]).size / 1024;

	if (sizeKB > maxSize) {
		throw new Error(
			`Item excede el tamaño máximo de ${maxSize}KB (actual: ${sizeKB.toFixed(2)}KB)`
		);
	}

	return true;
}

/**
 * Sanitiza una expresión de filtro DynamoDB
 * Previene inyecciones maliciosas
 * @param {string} expression - Expresión a sanitizar
 * @returns {string} Expresión sanitizada
 */
export function sanitizeFilterExpression(expression) {
	if (!expression || typeof expression !== 'string') {
		return '';
	}

	// Longitud máxima razonable
	if (expression.length > 4000) {
		throw new Error('Expresión de filtro demasiado larga');
	}

	// Lista blanca de funciones permitidas
	const allowedFunctions = [
		'attribute_exists',
		'attribute_not_exists',
		'attribute_type',
		'begins_with',
		'contains',
		'size'
	];

	// Verificar que solo use funciones permitidas
	const functionPattern = /(\w+)\s*\(/g;
	const matches = [...expression.matchAll(functionPattern)];

	for (const match of matches) {
		const funcName = match[1];
		if (!allowedFunctions.includes(funcName)) {
			throw new Error(`Función no permitida: ${funcName}`);
		}
	}

	return expression.trim();
}

/**
 * Valida nombres de atributos
 * @param {Record<string, string>} attributeNames - Nombres de atributos
 * @returns {Record<string, string>} Nombres validados
 */
export function validateAttributeNames(attributeNames) {
	if (!attributeNames || typeof attributeNames !== 'object') {
		return {};
	}

	/** @type {Record<string, string>} */
	const validated = {};

	for (const [placeholder, name] of Object.entries(attributeNames)) {
		// Validar placeholder (#field, #attr, etc.)
		if (!placeholder.startsWith('#')) {
			throw new Error(`Placeholder inválido: ${placeholder}`);
		}

		// Validar nombre de atributo
		if (typeof name !== 'string' || name.length === 0 || name.length > 255) {
			throw new Error(`Nombre de atributo inválido: ${name}`);
		}

		validated[placeholder] = name;
	}

	return validated;
}

/**
 * Valida valores de atributos
 * @param {Record<string, any>} attributeValues - Valores de atributos
 * @returns {Record<string, any>} Valores validados
 */
export function validateAttributeValues(attributeValues) {
	if (!attributeValues || typeof attributeValues !== 'object') {
		return {};
	}

	/** @type {Record<string, any>} */
	const validated = {};

	for (const [placeholder, value] of Object.entries(attributeValues)) {
		// Validar placeholder (:value, :searchTerm, etc.)
		if (!placeholder.startsWith(':')) {
			throw new Error(`Placeholder inválido: ${placeholder}`);
		}

		// Validar que el valor no sea undefined
		if (value === undefined) {
			throw new Error(`Valor undefined para placeholder: ${placeholder}`);
		}

		validated[placeholder] = value;
	}

	return validated;
}

/**
 * Valida un objeto completo de parámetros de consulta
 * @param {Record<string, any>} params - Parámetros a validar
 * @returns {Record<string, any>} Parámetros validados
 */
export function validateQueryParams(params) {
	/** @type {Record<string, any>} */
	const validated = {};

	if (params.tableName) {
		validated.tableName = sanitizeTableName(params.tableName);
	}

	if (params.limit) {
		validated.limit = sanitizeLimit(params.limit);
	}

	if (params.filterExpression) {
		validated.filterExpression = sanitizeFilterExpression(params.filterExpression);
	}

	if (params.expressionAttributeNames) {
		validated.expressionAttributeNames = validateAttributeNames(params.expressionAttributeNames);
	}

	if (params.expressionAttributeValues) {
		validated.expressionAttributeValues = validateAttributeValues(params.expressionAttributeValues);
	}

	// Pasar otros campos sin modificar (lastEvaluatedKey, etc.)
	for (const [key, value] of Object.entries(params)) {
		if (!(key in validated) && value !== undefined) {
			validated[key] = value;
		}
	}

	return validated;
}

/**
 * Wrapper para validar request bodies
 * @template T
 * @param {any} body - Body a validar
 * @param {(body: any) => T} validator - Función validadora
 * @returns {T} Body validado
 * @throws {Error} Si la validación falla
 */
export function validateRequestBody(body, validator) {
	if (!body) {
		throw new Error('Request body requerido');
	}

	try {
		return validator(body);
	} catch (/** @type {unknown} */ error) {
		throw new Error(
			`Validación fallida: ${error instanceof Error ? error.message : String(error)}`
		);
	}
}
