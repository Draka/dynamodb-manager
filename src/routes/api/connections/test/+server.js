/**
 * API endpoint para probar conexiones DynamoDB
 * POST /api/connections/test
 */

import { json } from '@sveltejs/kit';
import { createDynamoDBService } from '$lib/services/dynamodb-service.js';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
	try {
		const connectionData = await request.json();

		// Validar datos de conexión
		if (!connectionData.region || !connectionData.credentials) {
			return json({ success: false, error: 'Datos de conexión incompletos' }, { status: 400 });
		}

		// Crear servicio temporal para prueba
		const testConnection = {
			id: 'test',
			name: connectionData.name || 'Test',
			region: connectionData.region,
			credentials: connectionData.credentials,
			...(connectionData.endpoint && { endpoint: connectionData.endpoint }),
			createdAt: new Date(),
			lastUsed: new Date()
		};

		const service = createDynamoDBService(testConnection);

		// Probar la conexión listando tablas
		await service.listTables();
		await service.close();

		return json({ success: true, message: 'Conexión exitosa!' });
	} catch (error) {
		console.error('Error probando conexión:', error);

		let errorMessage = 'Error de conexión desconocido';

		if (error.name === 'NetworkingError' || error.code === 'NetworkingError') {
			errorMessage =
				'No se puede conectar al endpoint. Verifica la URL y que el servicio esté ejecutándose.';
		} else if (
			error.name === 'InvalidSignatureException' ||
			error.code === 'InvalidSignatureException'
		) {
			errorMessage = 'Credenciales inválidas. Verifica Access Key y Secret Key.';
		} else if (error.name === 'UnknownEndpoint' || error.code === 'UnknownEndpoint') {
			errorMessage = 'Endpoint desconocido. Verifica la región y la URL del endpoint.';
		} else if (error.message) {
			errorMessage = error.message;
		}

		return json({ success: false, error: errorMessage }, { status: 400 });
	}
}
