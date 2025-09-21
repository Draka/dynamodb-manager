/**
 * API endpoint para borrar todos los registros de una tabla DynamoDB
 * DELETE /api/tables/{table}/items/clear - Borra todos los items de la tabla
 */

import { error, json } from '@sveltejs/kit';
import { DynamoDBClient, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { getServerConnection } from '$lib/stores/server-connections.js';
import { createDynamoDBService } from '$lib/services/dynamodb-service.js';

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function DELETE({ params, url }) {
	let service;
	try {
		const { table: tableName } = params;
		const connectionId = url.searchParams.get('connectionId');

		if (!connectionId) {
			return error(400, { message: 'ID de conexión requerido' });
		}

		if (!tableName) {
			return error(400, { message: 'Nombre de tabla requerido' });
		}

		// Obtener configuración de conexión
		const connection = getServerConnection(connectionId);
		if (!connection) {
			return error(404, { message: 'Conexión no encontrada' });
		}

		// Crear servicio DynamoDB usando la configuración de conexión
		service = createDynamoDBService(connection);
		const client = service.client;
		const docClient = service.docClient;

		let deletedCount = 0;
		let totalScanned = 0;
		let lastEvaluatedKey = undefined;
		const batchSize = 25; // DynamoDB permite máximo 25 items por batch
		const errors = [];

		// Primero necesitamos obtener información de las claves de la tabla
		const describeResponse = await client.send(new DescribeTableCommand({ TableName: tableName }));
		
		const keySchema = describeResponse.Table?.KeySchema;
		if (!keySchema) {
			return error(500, { message: 'No se pudo obtener el esquema de claves de la tabla' });
		}

		// Extraer nombres de las claves primarias
		const hashKey = keySchema.find(key => key.KeyType === 'HASH')?.AttributeName;
		const rangeKey = keySchema.find(key => key.KeyType === 'RANGE')?.AttributeName;

		if (!hashKey) {
			return error(500, { message: 'No se encontró la clave hash de la tabla' });
		}

		// Escanear y borrar en lotes
		do {
			// Escanear la tabla para obtener items
			const scanParams = {
				TableName: tableName,
				ProjectionExpression: rangeKey ? `${hashKey}, ${rangeKey}` : hashKey,
				Limit: 100, // Escanear más items para procesar en lotes más eficientemente
				...(lastEvaluatedKey && { ExclusiveStartKey: lastEvaluatedKey })
			};

			const scanResponse = await docClient.send(new ScanCommand(scanParams));
			const items = scanResponse.Items || [];
			totalScanned += items.length;

			if (items.length === 0) {
				break;
			}

			// Procesar items en lotes de 25 (límite de BatchWriteItem)
			for (let i = 0; i < items.length; i += batchSize) {
				const batch = items.slice(i, i + batchSize);
				
				// Borrar cada item individual (más confiable que BatchWrite)
				for (const item of batch) {
					try {
						const key = {
							[hashKey]: item[hashKey]
						};
						
						if (rangeKey && item[rangeKey] !== undefined) {
							key[rangeKey] = item[rangeKey];
						}

						await docClient.send(new DeleteCommand({
							TableName: tableName,
							Key: key
						}));
						
						deletedCount++;
					} catch (err) {
						errors.push({
							key: rangeKey ? `${item[hashKey]}#${item[rangeKey]}` : item[hashKey],
							error: err.message
						});
					}
				}
			}

			lastEvaluatedKey = scanResponse.LastEvaluatedKey;
			
			// Pequeña pausa para no saturar DynamoDB
			if (lastEvaluatedKey) {
				await new Promise(resolve => setTimeout(resolve, 100));
			}

		} while (lastEvaluatedKey);

		const response = {
			success: true,
			deletedCount,
			totalScanned,
			errors: errors.length > 0 ? errors : undefined,
			message: `Se eliminaron ${deletedCount} de ${totalScanned} registros de la tabla ${tableName}`
		};

		return json(response);

	} catch (err) {
		console.error('❌ Error borrando todos los registros:', err);

		if (err.name === 'ResourceNotFoundException') {
			return error(404, { message: `Tabla '${params.table}' no encontrada` });
		}

		if (err.name === 'UnrecognizedClientException') {
			return error(401, { message: 'Credenciales AWS inválidas' });
		}

		return error(500, {
			message: `Error borrando registros: ${err.message}`,
			details: err.toString()
		});
	} finally {
		// Cerrar el servicio si fue creado
		if (service) {
			await service.close();
		}
	}
}