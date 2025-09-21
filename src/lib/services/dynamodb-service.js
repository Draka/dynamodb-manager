/**
 * Servicio principal para interactuar con DynamoDB
 * Proporciona todas las operaciones CRUD y utilidades
 */

import { DynamoDBClient, DeleteTableCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import {
	DynamoDBDocumentClient,
	ScanCommand,
	QueryCommand,
	PutCommand,
	UpdateCommand,
	DeleteCommand,
	BatchGetCommand
} from '@aws-sdk/lib-dynamodb';
import { createAWSConfig } from './aws-config.js';

/**
 * @typedef {Object} ScanParams
 * @property {string} tableName - Nombre de la tabla
 * @property {Object} [filterExpression] - Expresión de filtro
 * @property {number} [limit] - Límite de items
 * @property {Object} [lastEvaluatedKey] - Clave de paginación
 * @property {Object} [expressionAttributeNames] - Expresión de atributos
 * @property {Object} [expressionAttributeValues] - Expresión de valores
 */

/**
 * @typedef {Object} QueryParams
 * @property {string} tableName - Nombre de la tabla
 * @property {string} keyCondition - Condición de clave
 * @property {Object} [filterExpression] - Expresión de filtro adicional
 * @property {string} [indexName] - Nombre del índice
 * @property {number} [limit] - Límite de items
 * @property {Object} [lastEvaluatedKey] - Clave de paginación
 * @property {boolean} [scanIndexForward] - Orden ascendente/descendente
 */

/**
 * Clase principal del servicio DynamoDB
 */
export class DynamoDBService {
	/**
	 * Crea una nueva instancia del servicio
	 * @param {import('./aws-config.js').AWSConnection} connection - Conexión de AWS
	 */
	constructor(connection) {
		this.connection = connection;
		const config = createAWSConfig(connection);

		this.client = new DynamoDBClient(config);
		this.docClient = DynamoDBDocumentClient.from(this.client, {
			marshallOptions: {
				convertEmptyValues: false,
				removeUndefinedValues: true,
				convertClassInstanceToMap: false
			},
			unmarshallOptions: {
				wrapNumbers: false
			}
		});
	}

	/**
	 * Lista todas las tablas disponibles
	 * @returns {Promise<string[]>} Lista de nombres de tablas
	 */
	async listTables() {
		try {
			const { ListTablesCommand } = await import('@aws-sdk/client-dynamodb');
			const command = new ListTablesCommand({});
			const response = await this.client.send(command);
			return response.TableNames || [];
		} catch (/** @type {any} */ error) {
			console.error('Error listando tablas:', error);
			throw new Error(`Error al listar tablas: ${error.message}`);
		}
	}

	/**
	 * Obtiene información detallada de una tabla
	 * @param {string} tableName - Nombre de la tabla
	 * @returns {Promise<Object>} Información de la tabla
	 */
	async describeTable(tableName) {
		try {
			const { DescribeTableCommand } = await import('@aws-sdk/client-dynamodb');
			const command = new DescribeTableCommand({ TableName: tableName });
			const response = await this.client.send(command);
			return response.Table || {};
		} catch (/** @type {any} */ error) {
			console.error('Error describiendo tabla:', error);
			throw new Error(`Error al obtener información de la tabla: ${error.message}`);
		}
	}

	/**
	 * Escanea una tabla completa o con filtros
	 * @param {ScanParams} params - Parámetros del scan
	 * @returns {Promise<{items: any[], lastEvaluatedKey?: Object, count: number, scannedCount: number}>} Resultados del scan
	 */
	async scanTable(params) {
		try {
			/** @type {any} */
			const scanParams = {
				TableName: params.tableName,
				...(params.limit && { Limit: params.limit }),
				...(params.lastEvaluatedKey && { ExclusiveStartKey: params.lastEvaluatedKey })
			};

			// Agregar expresiones de filtro si están presentes
			if (params.filterExpression) {
				scanParams.FilterExpression = params.filterExpression;
			}

			if (params.expressionAttributeNames) {
				scanParams.ExpressionAttributeNames = params.expressionAttributeNames;
			}

			if (params.expressionAttributeValues) {
				scanParams.ExpressionAttributeValues = params.expressionAttributeValues;
			}

			const command = new ScanCommand(scanParams);

			const response = await this.docClient.send(command);

			return {
				items: response.Items || [],
				lastEvaluatedKey: response.LastEvaluatedKey,
				count: response.Count || 0,
				scannedCount: response.ScannedCount || 0
			};
		} catch (/** @type {any} */ error) {
			console.error('Error en scan:', error);
			throw new Error(`Error al escanear tabla: ${error.message}`);
		}
	}

	/**
	 * Realiza una consulta específica en una tabla
	 * @param {QueryParams} params - Parámetros de la query
	 * @returns {Promise<{items: any[], lastEvaluatedKey?: Object, count: number}>} Resultados de la query
	 */
	async queryTable(params) {
		try {
			const command = new QueryCommand(
				/**@type {any} */ ({
					TableName: params.tableName,
					KeyConditionExpression: params.keyCondition,
					...(params.filterExpression && { FilterExpression: params.filterExpression }),
					...(params.indexName && { IndexName: params.indexName }),
					...(params.limit && { Limit: params.limit }),
					...(params.lastEvaluatedKey && { ExclusiveStartKey: params.lastEvaluatedKey }),
					...(params.scanIndexForward !== undefined && {
						ScanIndexForward: params.scanIndexForward
					}),
					...(params.expressionAttributeNames && { ExpressionAttributeNames: params.expressionAttributeNames }),
					...(params.expressionAttributeValues && { ExpressionAttributeValues: params.expressionAttributeValues })
				})
			);

			const response = await this.docClient.send(command);

			return {
				items: response.Items || [],
				lastEvaluatedKey: response.LastEvaluatedKey,
				count: response.Count || 0
			};
		} catch (/** @type {any} */ error) {
			console.error('Error en query:', error);
			throw new Error(`Error al consultar tabla: ${error.message}`);
		}
	}

	/**
	 * Inserta o actualiza un item en la tabla
	 * @param {string} tableName - Nombre de la tabla
	 * @param {Object} item - Item a insertar/actualizar
	 * @param {Object} [options] - Opciones adicionales
	 * @returns {Promise<Object>} Resultado de la operación
	 */
	async putItem(tableName, item, options = {}) {
		try {
			const command = new PutCommand({
				TableName: tableName,
				Item: item,
				...options
			});

			const response = await this.docClient.send(command);
			return response;
		} catch (/** @type {any} */ error) {
			console.error('Error en put item:', error);
			throw new Error(`Error al guardar item: ${error.message}`);
		}
	}

	/**
	 * Inserta o actualiza un item usando el cliente bajo nivel (atributos nativos)
	 * @param {string} tableName - Nombre de la tabla
	 * @param {Object} attributeValueItem - Mapa de atributos en formato DynamoDB nativo
	 * @param {Object} [options] - Opciones adicionales de PutItem
	 * @returns {Promise<Object>} Resultado de la operación
	 */
	async putItemNative(tableName, attributeValueItem, options = {}) {
		try {
			const command = new PutItemCommand({
				TableName: tableName,
				Item: /** @type {any} */ (attributeValueItem),
				...options
			});

			const response = await this.client.send(command);
			return response;
		} catch (/** @type {any} */ error) {
			console.error('Error en put item (nativo):', error);
			throw new Error(`Error al guardar item (nativo): ${error.message}`);
		}
	}

	/**
	 * Actualiza un item específico en la tabla
	 * @param {string} tableName - Nombre de la tabla
	 * @param {Object} key - Clave del item
	 * @param {Object} updateExpression - Expresión de actualización
	 * @param {Object} [options] - Opciones adicionales
	 * @returns {Promise<Object>} Resultado de la operación
	 */
	async updateItem(tableName, key, updateExpression, options = {}) {
		try {
			const command = new UpdateCommand({
				TableName: tableName,
				Key: key,
				UpdateExpression: /** @type {string} */ (updateExpression),
				ReturnValues: 'ALL_NEW',
				...options
			});

			const response = await this.docClient.send(command);
			return response;
		} catch (/** @type {any} */ error) {
			console.error('Error en update item:', error);
			throw new Error(`Error al actualizar item: ${error.message}`);
		}
	}

	/**
	 * Elimina un item de la tabla
	 * @param {string} tableName - Nombre de la tabla
	 * @param {Object} key - Clave del item a eliminar
	 * @param {Object} [options] - Opciones adicionales
	 * @returns {Promise<Object>} Resultado de la operación
	 */
	async deleteItem(tableName, key, options = {}) {
		try {
			const command = new DeleteCommand({
				TableName: tableName,
				Key: key,
				ReturnValues: 'ALL_OLD',
				...options
			});

			const response = await this.docClient.send(command);
			return response;
		} catch (/** @type {any} */ error) {
			console.error('Error en delete item:', error);
			throw new Error(`Error al eliminar item: ${error.message}`);
		}
	}

	/**
	 * Obtiene múltiples items por sus claves
	 * @param {string} tableName - Nombre de la tabla
	 * @param {Array<Object>} keys - Array de claves de items
	 * @returns {Promise<any[]>} Items encontrados
	 */
	async batchGetItems(tableName, keys) {
		try {
			const command = new BatchGetCommand({
				RequestItems: {
					[tableName]: {
						Keys: keys
					}
				}
			});

			const response = await this.docClient.send(command);
			return response.Responses?.[tableName] || [];
		} catch (/** @type {any} */ error) {
			console.error('Error en batch get:', error);
			throw new Error(`Error al obtener items: ${error.message}`);
		}
	}

	/**
	 * Cierra la conexión con DynamoDB
	 */
	async close() {
		try {
			await this.client.destroy();
		} catch (error) {
			console.error('Error cerrando conexión:', error);
		}
	}

	/**
	 * Elimina una tabla de DynamoDB
	 * @param {string} tableName - Nombre de la tabla a eliminar
	 * @returns {Promise<Object>} Respuesta de la operación
	 */
	async deleteTable(tableName) {
		try {
			const command = new DeleteTableCommand({
				TableName: tableName
			});

			const response = await this.client.send(command);

			return {
				tableName: response.TableDescription?.TableName,
				status: response.TableDescription?.TableStatus,
				deletionTime: new Date().toISOString()
			};
		} catch (error) {
			console.error('Error eliminando tabla:', error);
			throw error; // Re-lanzar para manejo específico en el endpoint
		}
	}

	/**
	 * Prueba la conexión con DynamoDB
	 * @returns {Promise<boolean>} Si la conexión es exitosa
	 */
	async testConnection() {
		try {
			await this.listTables();
			return true;
		} catch (error) {
			console.error('Error probando conexión:', error);
			return false;
		}
	}
}

/**
 * Factory function para crear instancias del servicio
 * @param {import('./aws-config.js').AWSConnection} connection - Conexión de AWS
 * @returns {DynamoDBService} Instancia del servicio
 */
export function createDynamoDBService(connection) {
	return new DynamoDBService(connection);
}
