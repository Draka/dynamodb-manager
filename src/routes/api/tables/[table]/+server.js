/**
 * API endpoint para obtener información de tabla DynamoDB
 * GET /api/tables/[table]
 */

import { json } from '@sveltejs/kit';
import { createDynamoDBService } from '$lib/services/dynamodb-service.js';
import { getServerConnection } from '$lib/stores/server-connections.js';

/** @type {import('./$types').RequestHandler} */
export async function GET({ params, cookies, request }) {
	try {
		const tableName = params.table;

		// Obtener connectionId del header
		const connectionId = request.headers.get('x-connection-id');

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

		// Obtener información de la tabla
		const tableInfo = await service.describeTable(tableName);
		await service.close();

		return json({
			success: true,
			data: tableInfo
		});
	} catch (error) {
		console.error('Error obteniendo información de tabla:', error);

		return json({ success: false, error: error.message }, { status: 500 });
	}
}
