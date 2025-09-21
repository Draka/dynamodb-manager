/**
 * API endpoint para escanear tablas DynamoDB
 * POST /api/tables/[table]/scan
 */

import { json } from '@sveltejs/kit';
import { createDynamoDBService } from '$lib/services/dynamodb-service.js';
import { getServerConnection } from '$lib/stores/server-connections.js';

/** @type {import('./$types').RequestHandler} */
export async function POST({ params, request, cookies }) {
	try {
		const tableName = params.table;
		const requestBody = await request.json();
		const { connectionId, ...scanParams } = requestBody;

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

		// Realizar scan de la tabla
		const result = await service.scanTable({
			tableName,
			...scanParams
		});

		await service.close();

		return json({
			success: true,
			data: result
		});
	} catch (error) {
		console.error('Error escaneando tabla:', error);

		return json({ success: false, error: error.message }, { status: 500 });
	}
}
