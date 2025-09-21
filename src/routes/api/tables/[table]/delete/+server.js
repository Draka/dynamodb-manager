/**
 * API endpoint para eliminar tablas DynamoDB
 * POST /api/tables/[table]/delete
 */

import { json } from '@sveltejs/kit';
import { createDynamoDBService } from '$lib/services/dynamodb-service.js';
import { getServerConnection } from '$lib/stores/server-connections.js';

/** @type {import('./$types').RequestHandler} */
export async function POST({ params, request, cookies }) {
	try {
		const tableName = params.table;
		const requestBody = await request.json();
		const { connectionId } = requestBody;

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

		// Eliminar tabla
		const result = await service.deleteTable(tableName);

		await service.close();

		return json({
			success: true,
			message: `Tabla ${tableName} eliminada exitosamente`,
			data: result
		});
	} catch (/** @type {any} */ error) {
		console.error('Error eliminando tabla:', error);

		// Proporcionar mensajes de error más específicos
		let errorMessage = error.message;
		if (error.name === 'ResourceNotFoundException') {
			errorMessage = `La tabla ${params.table} no existe`;
		} else if (error.name === 'ResourceInUseException') {
			errorMessage = `La tabla ${params.table} está siendo utilizada y no se puede eliminar`;
		} else if (error.name === 'LimitExceededException') {
			errorMessage = 'Se ha alcanzado el límite de operaciones. Intenta más tarde';
		}

		return json(
			{
				success: false,
				error: errorMessage
			},
			{ status: 500 }
		);
	}
}
