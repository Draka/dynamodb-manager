/**
 * Cliente para comunicarse con las APIs de SvelteKit
 * Maneja todas las llamadas HTTP desde el frontend al backend
 */

import { activeConnectionId } from '../stores/open-connections.js';
import { connectionStatus } from '../stores/current-connection.js';

/**
 * @typedef {Object} ApiResponse
 * @property {boolean} success - Si la operación fue exitosa
 * @property {any} [data] - Datos de respuesta (si exitosa)
 * @property {string} [error] - Mensaje de error (si falló)
 */

/**
 * Clase base para manejo de APIs
 */
class ApiClient {
	/**
	 * Realiza una petición HTTP genérica
	 * @param {string} url - URL del endpoint
	 * @param {RequestInit} options - Opciones de fetch
	 * @returns {Promise<ApiResponse>} Respuesta de la API
	 */
	async request(url, options = {}) {
		try {
			const response = await fetch(url, {
				headers: {
					'Content-Type': 'application/json',
					...options.headers
				},
				...options
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || `HTTP ${response.status}`);
			}

			return data;
		} catch (error) {
			console.error('API request failed:', error);
			
			// Detectar errores de conexión AWS
			const errorMsg = error.message || 'Error de conexión';
			if (this.isAWSConnectionError(errorMsg)) {
				connectionStatus.set('error');
			}
			
			return {
				success: false,
				error: errorMsg
			};
		}
	}

	/**
	 * Realiza una petición GET
	 * @param {string} url - URL del endpoint
	 * @param {RequestInit} options - Opciones adicionales de fetch
	 * @returns {Promise<ApiResponse>} Respuesta de la API
	 */
	async get(url, options = {}) {
		return this.request(url, { method: 'GET', ...options });
	}

	/**
	 * Realiza una petición POST
	 * @param {string} url - URL del endpoint
	 * @param {any} data - Datos a enviar
	 * @returns {Promise<ApiResponse>} Respuesta de la API
	 */
	async post(url, data = null) {
		return this.request(url, {
			method: 'POST',
			body: data ? JSON.stringify(data) : null
		});
	}

	/**
	 * Realiza una petición PUT
	 * @param {string} url - URL del endpoint
	 * @param {any} data - Datos a enviar
	 * @returns {Promise<ApiResponse>} Respuesta de la API
	 */
	async put(url, data = null) {
		return this.request(url, {
			method: 'PUT',
			body: data ? JSON.stringify(data) : null
		});
	}

	/**
	 * Realiza una petición DELETE
	 * @param {string} url - URL del endpoint
	 * @returns {Promise<ApiResponse>} Respuesta de la API
	 */
	async delete(url) {
		return this.request(url, { method: 'DELETE' });
	}

	/**
	 * Detecta si el error es relacionado con conexión AWS
	 * @param {string} errorMessage - Mensaje de error
	 * @returns {boolean} Si es error de conexión
	 */
	isAWSConnectionError(errorMessage) {
		const connectionErrorPatterns = [
			'expired',
			'credential',
			'unauthorized',
			'invalid token',
			'session expired',
			'access denied',
			'forbidden',
			'authentication',
			'InvalidSignatureException',
			'TokenRefreshRequired',
			'ExpiredToken'
		];
		
		return connectionErrorPatterns.some(pattern => 
			errorMessage.toLowerCase().includes(pattern.toLowerCase())
		);
	}
}

/**
 * Cliente específico para DynamoDB APIs
 */
class DynamoDBApiClient extends ApiClient {
	/**
	 * Prueba una conexión DynamoDB
	 * @param {Object} connectionData - Datos de la conexión
	 * @returns {Promise<ApiResponse>} Resultado de la prueba
	 */
	async testConnection(connectionData) {
		return this.post('/api/connections/test', connectionData);
	}

	/**
	 * Registra una conexión en el servidor para uso de múltiples pestañas
	 * @param {string} connectionId - ID único de la conexión
	 * @param {Object} connection - Datos de la conexión
	 * @returns {Promise<ApiResponse>} Resultado del registro
	 */
	async registerConnection(connectionId, connection) {
		return this.post('/api/connections/register', { connectionId, connection });
	}

	/**
	 * Lista todas las tablas disponibles
	 * @returns {Promise<ApiResponse>} Lista de tablas
	 */
	async listTables() {
		// Obtener connectionId del store activo
		let currentConnectionId;
		activeConnectionId.subscribe((id) => (currentConnectionId = id))();

		return this.get('/api/tables', {
			headers: {
				'x-connection-id': currentConnectionId
			}
		});
	}

	/**
	 * Obtiene información detallada de una tabla
	 * @param {string} tableName - Nombre de la tabla
	 * @param {string} [connectionId] - ID de conexión específico
	 * @returns {Promise<ApiResponse>} Información de la tabla
	 */
	async getTableInfo(tableName, connectionId = null) {
		// Usar connectionId explícito si se proporciona, sino usar del store activo
		let currentConnectionId = connectionId;
		if (!currentConnectionId) {
			activeConnectionId.subscribe((id) => (currentConnectionId = id))();
		}

		return this.get(`/api/tables/${encodeURIComponent(tableName)}`, {
			headers: {
				'x-connection-id': currentConnectionId
			}
		});
	}

	/**
	 * Escanea una tabla con parámetros opcionales
	 * @param {string} tableName - Nombre de la tabla
	 * @param {Object} params - Parámetros del scan
	 * @returns {Promise<ApiResponse>} Resultados del scan
	 */
	async scanTable(tableName, params = {}) {
		// Usar connectionId explícito si se proporciona, sino usar del store activo
		let currentConnectionId = params.connectionId;
		if (!currentConnectionId) {
			activeConnectionId.subscribe((id) => (currentConnectionId = id))();
		}

		return this.post(`/api/tables/${encodeURIComponent(tableName)}/scan`, {
			...params,
			connectionId: currentConnectionId
		});
	}

	/**
	 * Realiza una query en una tabla
	 * @param {string} tableName - Nombre de la tabla
	 * @param {Object} params - Parámetros de la query
	 * @returns {Promise<ApiResponse>} Resultados de la query
	 */
	async queryTable(tableName, params = {}) {
		// Usar connectionId explícito si se proporciona, sino usar del store activo
		let currentConnectionId = params.connectionId;
		if (!currentConnectionId) {
			activeConnectionId.subscribe((id) => (currentConnectionId = id))();
		}

		return this.post(`/api/tables/${encodeURIComponent(tableName)}/query`, {
			...params,
			connectionId: currentConnectionId
		});
	}

	/**
	 * Inserta o actualiza un item
	 * @param {string} tableName - Nombre de la tabla
	 * @param {Object} item - Item a insertar/actualizar
	 * @returns {Promise<ApiResponse>} Resultado de la operación
	 */
	async putItem(tableName, item) {
		// Obtener connectionId del store activo
		let currentConnectionId;
		activeConnectionId.subscribe((id) => (currentConnectionId = id))();

		return this.post(`/api/tables/${encodeURIComponent(tableName)}/items`, {
			...item,
			connectionId: currentConnectionId
		});
	}

	/**
	 * Inserta o actualiza un item en formato DynamoDB nativo
	 * @param {string} tableName - Nombre de la tabla
	 * @param {Object} nativeItem - Mapa de atributos (AttributeValue)
	 * @param {Object} [options] - Opciones adicionales
	 * @returns {Promise<ApiResponse>} Resultado de la operación
	 */
	async putItemNative(tableName, nativeItem, options = {}) {
		// Obtener connectionId del store activo
		let currentConnectionId;
		activeConnectionId.subscribe((id) => (currentConnectionId = id))();

		return this.post(`/api/tables/${encodeURIComponent(tableName)}/items`, {
			__native: true,
			item: nativeItem,
			...options,
			connectionId: currentConnectionId
		});
	}

	/**
	 * Actualiza un item específico
	 * @param {string} tableName - Nombre de la tabla
	 * @param {Object} key - Clave del item
	 * @param {Object} updates - Actualizaciones a aplicar
	 * @returns {Promise<ApiResponse>} Resultado de la operación
	 */
	async updateItem(tableName, key, updates) {
		// Obtener connectionId del store activo
		let currentConnectionId;
		activeConnectionId.subscribe((id) => (currentConnectionId = id))();

		return this.put(`/api/tables/${encodeURIComponent(tableName)}/items`, {
			key,
			updates,
			connectionId: currentConnectionId
		});
	}

	/**
	 * Elimina un item
	 * @param {string} tableName - Nombre de la tabla
	 * @param {Object} key - Clave del item a eliminar
	 * @returns {Promise<ApiResponse>} Resultado de la operación
	 */
	async deleteItem(tableName, key) {
		// Obtener connectionId del store activo
		let currentConnectionId;
		activeConnectionId.subscribe((id) => (currentConnectionId = id))();

		return this.post(`/api/tables/${encodeURIComponent(tableName)}/items/delete`, {
			key,
			connectionId: currentConnectionId
		});
	}

	/**
	 * Elimina una tabla completa
	 * @param {string} tableName - Nombre de la tabla a eliminar
	 * @returns {Promise<ApiResponse>} Resultado de la operación
	 */
	async deleteTable(tableName) {
		// Obtener connectionId del store activo
		let currentConnectionId;
		activeConnectionId.subscribe((id) => (currentConnectionId = id))();

		return this.post(`/api/tables/${encodeURIComponent(tableName)}/delete`, {
			connectionId: currentConnectionId
		});
	}

	/**
	 * Borra todos los registros de una tabla
	 * @param {string} tableName - Nombre de la tabla
	 * @returns {Promise<ApiResponse>} Resultado de la operación
	 */
	async clearTableItems(tableName) {
		// Obtener connectionId del store activo
		let currentConnectionId;
		activeConnectionId.subscribe((id) => (currentConnectionId = id))();

		return this.delete(`/api/tables/${encodeURIComponent(tableName)}/items/clear?connectionId=${currentConnectionId}`);
	}
}

// Crear instancia singleton del cliente
export const dynamoDbApi = new DynamoDBApiClient();

// Exportar también la clase base por si se necesita
export { ApiClient };
