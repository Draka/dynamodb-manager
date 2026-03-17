/**
 * API endpoint para registrar conexiones en el servidor
 * POST /api/connections/register
 */

import { json } from '@sveltejs/kit';
import { registerConnection } from '$lib/stores/server-connections.js';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
	try {
		const { connectionId, connection } = await request.json();

		if (!connectionId || !connection) {
			return json(
				{
					success: false,
					error: 'connectionId y connection son requeridos'
				},
				{ status: 400 }
			);
		}

		// Registrar la conexión en el almacén del servidor
		registerConnection(connectionId, connection);

		return json({
			success: true,
			message: `Conexión ${connectionId} registrada exitosamente`
		});
	} catch (/** @type {unknown} */ error) {
		console.error('Error registrando conexión:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : String(error)
			},
			{ status: 500 }
		);
	}
}
