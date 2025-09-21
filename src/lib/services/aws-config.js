/**
 * Configuración y utilidades para AWS SDK
 * Maneja la configuración de credenciales y regiones
 */

/**
 * @typedef {Object} DynamoDBTableInfo
 * @property {string} TableName - Nombre de la tabla
 * @property {string} TableArn - ARN de la tabla
 * @property {string} TableStatus - Estado de la tabla
 * @property {string} TableSizeBytes - Tamaño de la tabla en bytes
 * @property {any[]} KeySchema - Esquema de claves de la tabla
 */

/**
 * @typedef {Object} AWSCredentials
 * @property {string} accessKeyId - AWS Access Key ID
 * @property {string} secretAccessKey - AWS Secret Access Key
 * @property {string} [sessionToken] - Token de sesión temporal (opcional)
 */

/**
 * @typedef {Object} AWSConnection
 * @property {string} id - ID único de la conexión
 * @property {string} name - Nombre descriptivo de la conexión
 * @property {string} region - Región de AWS
 * @property {AWSCredentials} credentials - Credenciales de AWS
 * @property {string} [endpoint] - URL del endpoint (opcional para DynamoDB local)
 * @property {Date} createdAt - Fecha de creación
 * @property {Date} lastUsed - Última vez utilizada
 */

/**
 * Regiones disponibles de AWS
 * @type {Array<{value: string, label: string}>}
 */
export const AWS_REGIONS = [
	{ value: 'us-east-1', label: 'US East (N. Virginia)' },
	{ value: 'us-east-2', label: 'US East (Ohio)' },
	{ value: 'us-west-1', label: 'US West (N. California)' },
	{ value: 'us-west-2', label: 'US West (Oregon)' },
	{ value: 'ca-central-1', label: 'Canada (Central)' },
	{ value: 'eu-west-1', label: 'Europe (Ireland)' },
	{ value: 'eu-west-2', label: 'Europe (London)' },
	{ value: 'eu-west-3', label: 'Europe (Paris)' },
	{ value: 'eu-central-1', label: 'Europe (Frankfurt)' },
	{ value: 'eu-north-1', label: 'Europe (Stockholm)' },
	{ value: 'ap-south-1', label: 'Asia Pacific (Mumbai)' },
	{ value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
	{ value: 'ap-southeast-2', label: 'Asia Pacific (Sydney)' },
	{ value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
	{ value: 'ap-northeast-2', label: 'Asia Pacific (Seoul)' },
	{ value: 'sa-east-1', label: 'South America (São Paulo)' }
];

/**
 * Crea la configuración de AWS para una conexión
 * @param {AWSConnection} connection - Conexión de AWS
 * @returns {Object} Configuración para el cliente AWS
 */
export function createAWSConfig(connection) {
	/** @type {any} */
	const config = {
		region: connection.region,
		credentials: {
			accessKeyId: connection.credentials.accessKeyId,
			secretAccessKey: connection.credentials.secretAccessKey,
			...(connection.credentials.sessionToken && {
				sessionToken: connection.credentials.sessionToken
			})
		}
	};

	// Agregar endpoint si está especificado (para DynamoDB local)
	if (connection.endpoint) {
		config.endpoint = connection.endpoint;
		// Para endpoints locales, forzar el uso de path-style
		if (connection.endpoint.includes('localhost') || connection.endpoint.includes('127.0.0.1')) {
			config.forcePathStyle = true;
		}
	}

	return config;
}

/**
 * Valida las credenciales de AWS
 * @param {AWSCredentials} credentials - Credenciales a validar
 * @returns {Array<string>} Array de errores de validación
 */
export function validateAWSCredentials(credentials) {
	const errors = [];

	if (!credentials.accessKeyId || credentials.accessKeyId.trim().length === 0) {
		errors.push('Access Key ID es requerido');
	}

	if (!credentials.secretAccessKey || credentials.secretAccessKey.trim().length === 0) {
		errors.push('Secret Access Key es requerido');
	}

	// Validar formato básico de Access Key ID (permitir "dummy" para desarrollo)
	if (
		credentials.accessKeyId &&
		credentials.accessKeyId !== 'dummy' &&
		!/^[A-Z0-9]{20}$/.test(credentials.accessKeyId)
	) {
		errors.push(
			'Access Key ID debe tener 20 caracteres alfanuméricos en mayúscula (o "dummy" para desarrollo)'
		);
	}

	// Validar longitud mínima de Secret Access Key (permitir "dummy" para desarrollo)
	if (
		credentials.secretAccessKey &&
		credentials.secretAccessKey !== 'dummy' &&
		credentials.secretAccessKey.length < 40
	) {
		errors.push('Secret Access Key debe tener al menos 40 caracteres (o "dummy" para desarrollo)');
	}

	return errors;
}

/**
 * Valida una conexión completa de AWS
 * @param {Partial<AWSConnection>} connection - Conexión a validar
 * @returns {Array<string>} Array de errores de validación
 */
export function validateAWSConnection(connection) {
	const errors = [];

	if (!connection.name || connection.name.trim().length === 0) {
		errors.push('Nombre de conexión es requerido');
	}

	if (!connection.region) {
		errors.push('Región es requerida');
	}

	if (!connection.credentials) {
		errors.push('Credenciales son requeridas');
	} else {
		errors.push(...validateAWSCredentials(connection.credentials));
	}

	return errors;
}

/**
 * Genera un ID único para una conexión
 * @returns {string} ID único
 */
export function generateConnectionId() {
	return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Enmascara las credenciales para mostrar de forma segura
 * @param {AWSCredentials} credentials - Credenciales a enmascarar
 * @returns {Object} Credenciales enmascaradas
 */
export function maskCredentials(credentials) {
	return {
		accessKeyId: credentials.accessKeyId
			? `${credentials.accessKeyId.substr(0, 4)}${'*'.repeat(12)}${credentials.accessKeyId.substr(-4)}`
			: '',
		secretAccessKey: credentials.secretAccessKey
			? `${'*'.repeat(36)}${credentials.secretAccessKey.substr(-4)}`
			: '',
		sessionToken: credentials.sessionToken ? '***' : undefined
	};
}
