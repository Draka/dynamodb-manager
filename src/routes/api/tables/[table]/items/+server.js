/**
 * API endpoint para operaciones de items DynamoDB
 * POST /api/tables/[table]/items - Insertar item
 * PUT /api/tables/[table]/items - Actualizar item
 */

import { json } from '@sveltejs/kit';
import { createDynamoDBService } from '$lib/services/dynamodb-service.js';
import { getServerConnection } from '$lib/stores/server-connections.js';

/** @type {import('./$types').RequestHandler} */
export async function POST({ params, request, cookies }) {
	try {
		const tableName = params.table;
		const requestBody = await request.json();
		const { connectionId, ...itemData } = requestBody;

		// Obtener conexión específica por ID
		let connection;
		if (connectionId) {
			connection = getServerConnection(connectionId);
			if (!connection) {
				return json(
					{ success: false, error: `Conexión ${connectionId} no encontrada` },
					{ status: 404 }
				);
			}
		} else {
			// Fallback a cookie para compatibilidad
			const connectionData = cookies.get('current_connection');
			if (!connectionData) {
				return json({ success: false, error: 'No hay conexión activa' }, { status: 401 });
			}
			connection = JSON.parse(connectionData);
		}

		const service = createDynamoDBService(connection);

		// Si el payload indica modo nativo, usar cliente bajo nivel
		let result;
		if (
			itemData &&
			itemData.__native === true &&
			itemData.item &&
			typeof itemData.item === 'object'
		) {
			const { item, ...nativeOptions } = itemData;
			result = await service.putItemNative(tableName, item, nativeOptions);
		} else {
			// Insertar item en la tabla en modo DocumentClient
			result = await service.putItem(tableName, itemData);
		}

		await service.close();

		return json({
			success: true,
			data: result
		});
	} catch (error) {
		console.error('Error insertando item:', error);

		return json({ success: false, error: error.message }, { status: 500 });
	}
}

/** @type {import('./$types').RequestHandler} */
export async function PUT({ params, request, cookies }) {
	try {
		const tableName = params.table;
		const requestBody = await request.json();
		const { connectionId, ...itemData } = requestBody;

		// Obtener conexión específica por ID
		let connection;
		if (connectionId) {
			connection = getServerConnection(connectionId);
			if (!connection) {
				return json(
					{ success: false, error: `Conexión ${connectionId} no encontrada` },
					{ status: 404 }
				);
			}
		} else {
			// Fallback a cookie para compatibilidad
			const connectionData = cookies.get('current_connection');
			if (!connectionData) {
				return json({ success: false, error: 'No hay conexión activa' }, { status: 401 });
			}
			connection = JSON.parse(connectionData);
		}

		const service = createDynamoDBService(connection);

		// Para actualizaciones, usamos PutCommand con el item completo
		// El cliente debe enviar el registro completo actualizado
		const result = await service.putItem(tableName, itemData);

		await service.close();

		return json({
			success: true,
			data: result
		});
	} catch (error) {
		console.error('Error actualizando item:', error);

		return json({ success: false, error: error.message }, { status: 500 });
	}
}
