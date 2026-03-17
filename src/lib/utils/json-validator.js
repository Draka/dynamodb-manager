/**
 * Validador robusto de JSON para registros DynamoDB
 * Valida estructura, tipos y claves primarias
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Si el JSON es válido
 * @property {string[]} errors - Lista de errores encontrados
 * @property {string[]} warnings - Lista de advertencias
 */

/**
 * @typedef {Object} TableSchema
 * @property {string} partitionKey - Nombre de la partition key
 * @property {string} [sortKey] - Nombre de la sort key (opcional)
 * @property {Object} attributeDefinitions - Definiciones de atributos
 */

/**
 * Tipos de datos válidos en DynamoDB
 */
const DYNAMODB_TYPES = {
	// Tipos escalares
	S: 'String',
	N: 'Number',
	B: 'Binary',
	BOOL: 'Boolean',
	NULL: 'Null',
	// Tipos de conjunto
	SS: 'String Set',
	NS: 'Number Set',
	BS: 'Binary Set',
	// Tipos de documento
	L: 'List',
	M: 'Map'
};

/**
 * Valida si un string es JSON válido
 * @param {string} jsonString - String JSON a validar
 * @returns {ValidationResult}
 */
export function validateJsonStructure(jsonString) {
	/** @type {string[]} */
	const errors = [];
	/** @type {string[]} */
	const warnings = [];

	// Verificar que no esté vacío
	if (!jsonString || !jsonString.trim()) {
		errors.push('El JSON no puede estar vacío');
		return { valid: false, errors, warnings };
	}

	// Intentar parsear el JSON
	let parsed;
	try {
		parsed = JSON.parse(jsonString);
	} catch (/** @type {any} */ err) {
		errors.push(`JSON inválido: ${err.message}`);
		return { valid: false, errors, warnings };
	}

	// Verificar que sea un objeto
	if (typeof parsed !== 'object' || parsed === null) {
		errors.push('El JSON debe ser un objeto, no un valor primitivo o array');
		return { valid: false, errors, warnings };
	}

	// Verificar que no sea un array
	if (Array.isArray(parsed)) {
		errors.push('El JSON debe ser un objeto, no un array');
		return { valid: false, errors, warnings };
	}

	// Verificar que tenga al menos una propiedad
	if (Object.keys(parsed).length === 0) {
		warnings.push('El objeto está vacío');
	}

	return { valid: true, errors, warnings };
}

/**
 * Valida tipos de datos DynamoDB
 * @param {any} record - Registro a validar
 * @param {boolean} isNativeFormat - Si está en formato DynamoDB nativo
 * @returns {ValidationResult}
 */
export function validateDynamoDBTypes(record, isNativeFormat = false) {
	/** @type {string[]} */
	const errors = [];
	/** @type {string[]} */
	const warnings = [];

	if (isNativeFormat) {
		// Validar formato DynamoDB nativo { "attr": { "S": "value" } }
		for (const [key, value] of Object.entries(record)) {
			if (typeof value !== 'object' || value === null) {
				errors.push(`Atributo "${key}": el valor debe ser un objeto con tipo DynamoDB`);
				continue;
			}

			const typeKeys = Object.keys(value);
			if (typeKeys.length !== 1) {
				errors.push(
					`Atributo "${key}": debe tener exactamente un tipo DynamoDB (encontrados: ${typeKeys.length})`
				);
				continue;
			}

			const type = typeKeys[0];
			if (!(/** @type {Record<string, string>} */ (DYNAMODB_TYPES)[type])) {
				errors.push(
					`Atributo "${key}": tipo "${type}" no es válido. Tipos válidos: ${Object.keys(DYNAMODB_TYPES).join(', ')}`
				);
				continue;
			}

			// Validar el valor según el tipo
			const typeValue = value[type];
			const typeValidation = validateTypeValue(type, typeValue, key);
			errors.push(...typeValidation.errors);
			warnings.push(...typeValidation.warnings);
		}
	} else {
		// Validar formato JavaScript simple
		for (const [key, value] of Object.entries(record)) {
			const typeValidation = validateJavaScriptValue(value, key);
			errors.push(...typeValidation.errors);
			warnings.push(...typeValidation.warnings);
		}
	}

	return { valid: errors.length === 0, errors, warnings };
}

/**
 * Valida un valor según su tipo DynamoDB
 * @param {string} type - Tipo DynamoDB
 * @param {any} value - Valor a validar
 * @param {string} attributeName - Nombre del atributo
 * @returns {ValidationResult}
 */
function validateTypeValue(type, value, attributeName) {
	/** @type {string[]} */
	const errors = [];
	/** @type {string[]} */
	const warnings = [];

	switch (type) {
		case 'S':
			if (typeof value !== 'string') {
				errors.push(`Atributo "${attributeName}": String esperado, recibido ${typeof value}`);
			}
			if (value === '') {
				warnings.push(`Atributo "${attributeName}": String vacío`);
			}
			break;

		case 'N':
			if (typeof value !== 'string') {
				errors.push(
					`Atributo "${attributeName}": Number debe ser string en formato DynamoDB, recibido ${typeof value}`
				);
			} else if (isNaN(Number(value))) {
				errors.push(`Atributo "${attributeName}": "${value}" no es un número válido`);
			}
			break;

		case 'BOOL':
			if (typeof value !== 'boolean') {
				errors.push(`Atributo "${attributeName}": Boolean esperado, recibido ${typeof value}`);
			}
			break;

		case 'NULL':
			if (value !== true && value !== null) {
				errors.push(`Atributo "${attributeName}": NULL debe ser true o null`);
			}
			break;

		case 'SS':
		case 'NS':
		case 'BS':
			if (!Array.isArray(value)) {
				errors.push(`Atributo "${attributeName}": ${type} debe ser un array`);
			} else if (value.length === 0) {
				errors.push(`Atributo "${attributeName}": ${type} no puede estar vacío`);
			} else {
				// Validar elementos del set
				if (type === 'SS') {
					value.forEach((item, i) => {
						if (typeof item !== 'string') {
							errors.push(
								`Atributo "${attributeName}": elemento ${i} debe ser string, recibido ${typeof item}`
							);
						}
					});
				} else if (type === 'NS') {
					value.forEach((item, i) => {
						if (typeof item !== 'string') {
							errors.push(
								`Atributo "${attributeName}": elemento ${i} debe ser string (número), recibido ${typeof item}`
							);
						} else if (isNaN(Number(item))) {
							errors.push(
								`Atributo "${attributeName}": elemento ${i} "${item}" no es un número válido`
							);
						}
					});
				}

				// Verificar duplicados en sets
				const unique = new Set(value);
				if (unique.size !== value.length) {
					warnings.push(`Atributo "${attributeName}": ${type} contiene valores duplicados`);
				}
			}
			break;

		case 'L':
			if (!Array.isArray(value)) {
				errors.push(`Atributo "${attributeName}": List debe ser un array`);
			} else {
				// Validar cada elemento de la lista
				value.forEach((item, i) => {
					if (typeof item !== 'object' || item === null) {
						errors.push(
							`Atributo "${attributeName}": elemento ${i} debe ser un objeto con tipo DynamoDB`
						);
					}
				});
			}
			break;

		case 'M':
			if (typeof value !== 'object' || value === null || Array.isArray(value)) {
				errors.push(`Atributo "${attributeName}": Map debe ser un objeto`);
			} else {
				// Validar recursivamente el mapa
				for (const [mapKey, mapValue] of Object.entries(value)) {
					if (typeof mapValue !== 'object' || mapValue === null) {
						errors.push(`Atributo "${attributeName}.${mapKey}": el valor debe tener tipo DynamoDB`);
					}
				}
			}
			break;
	}

	return { valid: errors.length === 0, errors, warnings };
}

/**
 * Valida un valor JavaScript simple
 * @param {any} value - Valor a validar
 * @param {string} attributeName - Nombre del atributo
 * @returns {ValidationResult}
 */
function validateJavaScriptValue(value, attributeName) {
	/** @type {string[]} */
	const errors = [];
	/** @type {string[]} */
	const warnings = [];

	// DynamoDB no soporta undefined
	if (value === undefined) {
		errors.push(`Atributo "${attributeName}": undefined no es válido en DynamoDB`);
	}

	// Verificar límites de tamaño
	if (typeof value === 'string' && value.length > 400 * 1024) {
		// 400 KB limit
		errors.push(`Atributo "${attributeName}": String excede el límite de 400 KB`);
	}

	return { valid: errors.length === 0, errors, warnings };
}

/**
 * Valida que un registro tenga las claves primarias requeridas
 * @param {any} record - Registro a validar
 * @param {TableSchema} schema - Esquema de la tabla
 * @param {boolean} isNativeFormat - Si está en formato DynamoDB nativo
 * @returns {ValidationResult}
 */
export function validatePrimaryKeys(record, schema, isNativeFormat = false) {
	/** @type {string[]} */
	const errors = [];
	/** @type {string[]} */
	const warnings = [];

	if (!schema || !schema.partitionKey) {
		warnings.push('No se puede validar claves primarias sin esquema de tabla');
		return { valid: true, errors, warnings };
	}

	// Verificar partition key
	if (!record[schema.partitionKey]) {
		errors.push(`Falta la partition key requerida: "${schema.partitionKey}"`);
	} else if (isNativeFormat) {
		// En formato nativo, verificar que tenga un tipo válido
		const pkValue = record[schema.partitionKey];
		if (typeof pkValue !== 'object' || pkValue === null) {
			errors.push(`La partition key "${schema.partitionKey}" debe tener un tipo DynamoDB`);
		}
	}

	// Verificar sort key si existe
	if (schema.sortKey) {
		if (!record[schema.sortKey]) {
			errors.push(`Falta la sort key requerida: "${schema.sortKey}"`);
		} else if (isNativeFormat) {
			const skValue = record[schema.sortKey];
			if (typeof skValue !== 'object' || skValue === null) {
				errors.push(`La sort key "${schema.sortKey}" debe tener un tipo DynamoDB`);
			}
		}
	}

	return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validación completa de un registro DynamoDB
 * @param {string} jsonString - String JSON a validar
 * @param {TableSchema} [schema] - Esquema de la tabla (opcional)
 * @param {boolean} [isNativeFormat=false] - Si está en formato DynamoDB nativo
 * @returns {ValidationResult}
 */
export function validateDynamoDBRecord(jsonString, schema, isNativeFormat = false) {
	/** @type {string[]} */
	const errors = [];
	/** @type {string[]} */
	const warnings = [];

	// 1. Validar estructura JSON
	const structureValidation = validateJsonStructure(jsonString);
	errors.push(...structureValidation.errors);
	warnings.push(...structureValidation.warnings);

	if (!structureValidation.valid) {
		return { valid: false, errors, warnings };
	}

	// Parsear el JSON
	const record = JSON.parse(jsonString);

	// 2. Validar tipos DynamoDB
	const typesValidation = validateDynamoDBTypes(record, isNativeFormat);
	errors.push(...typesValidation.errors);
	warnings.push(...typesValidation.warnings);

	// 3. Validar claves primarias si se proporciona esquema
	if (schema) {
		const keysValidation = validatePrimaryKeys(record, schema, isNativeFormat);
		errors.push(...keysValidation.errors);
		warnings.push(...keysValidation.warnings);
	}

	// 4. Validar tamaño total del item (límite de 400 KB)
	const itemSize = new Blob([jsonString]).size;
	if (itemSize > 400 * 1024) {
		errors.push(
			`El item excede el límite de 400 KB de DynamoDB (tamaño actual: ${Math.round(itemSize / 1024)} KB)`
		);
	} else if (itemSize > 300 * 1024) {
		warnings.push(
			`El item está cerca del límite de 400 KB (tamaño actual: ${Math.round(itemSize / 1024)} KB)`
		);
	}

	return { valid: errors.length === 0, errors, warnings };
}

/**
 * Detecta si un registro está en formato DynamoDB nativo
 * @param {any} record - Registro a verificar
 * @returns {boolean}
 */
export function isNativeFormat(record) {
	if (typeof record !== 'object' || record === null || Array.isArray(record)) {
		return false;
	}

	// Si al menos un atributo tiene formato DynamoDB nativo, asumimos que todo el registro lo tiene
	for (const value of Object.values(record)) {
		if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
			const keys = Object.keys(value);
			if (keys.length === 1 && /** @type {Record<string, string>} */ (DYNAMODB_TYPES)[keys[0]]) {
				return true;
			}
		}
	}

	return false;
}
