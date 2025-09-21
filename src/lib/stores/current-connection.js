/**
 * Store para la conexión actualmente seleccionada
 * Maneja el estado de la conexión activa y el servicio DynamoDB
 */

import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import {
	getCurrentConnectionFromCookie,
	setCurrentConnectionCookie,
	clearCurrentConnectionCookie
} from '../services/connection-manager.js';
import { dynamoDbApi } from '../services/api-client.js';

/**
 * @typedef {import('../services/aws-config.js').AWSConnection} AWSConnection
 * @typedef {import('../services/dynamodb-service.js').DynamoDBService} DynamoDBService
 */

/**
 * Carga la conexión actual desde cookies
 * @returns {AWSConnection | null} Conexión actual o null
 */
function loadCurrentConnection() {
	if (!browser) return null;

	try {
		const connection = getCurrentConnectionFromCookie();
		if (!connection) return null;

		return {
			...connection,
			createdAt: new Date(connection.createdAt),
			lastUsed: new Date(connection.lastUsed)
		};
	} catch (error) {
		console.error('Error cargando conexión actual:', error);
		return null;
	}
}

/**
 * Guarda la conexión actual en cookies
 * @param {AWSConnection | null} connection - Conexión a guardar
 */
function saveCurrentConnection(connection) {
	if (!browser) return;

	try {
		if (connection) {
			setCurrentConnectionCookie(connection);
		} else {
			clearCurrentConnectionCookie();
		}
	} catch (error) {
		console.error('Error guardando conexión actual:', error);
	}
}

/** Store de la conexión actual */
export const currentConnection = writable(loadCurrentConnection());

/** Store del estado de conexión */
export const connectionStatus = writable('disconnected');

/** Store derivado que indica si hay conexión activa */
export const isConnected = derived([currentConnection], ([$currentConnection]) => {
	const connected = $currentConnection !== null;
	return connected;
});

/** Store derivado con información de la conexión actual */
export const connectionInfo = derived(currentConnection, ($currentConnection) => {
	if (!$currentConnection) return null;

	return {
		name: $currentConnection.name,
		region: $currentConnection.region,
		id: $currentConnection.id,
		lastUsed: $currentConnection.lastUsed
	};
});

/**
 * Establece una nueva conexión
 * @param {AWSConnection} connection - Conexión a establecer
 */
export function setConnection(connection) {
	currentConnection.set(connection);
	saveCurrentConnection(connection);
	connectionStatus.set('connected');
}

/**
 * Desconecta la conexión actual
 */
export async function disconnect() {
	// Limpiar stores
	currentConnection.set(null);
	connectionStatus.set('disconnected');

	// Limpiar cookies
	saveCurrentConnection(null);
}

/**
 * Prueba la conexión actual usando API client
 * @returns {Promise<boolean>} Si la conexión es exitosa
 */
export async function testCurrentConnection() {
	const connection = getCurrentConnection();

	if (!connection) {
		connectionStatus.set('error');
		return false;
	}

	connectionStatus.set('testing');

	try {
		const response = await dynamoDbApi.testConnection(connection);

		if (response.success) {
			connectionStatus.set('connected');
			return true;
		} else {
			connectionStatus.set('error');
			return false;
		}
	} catch (error) {
		console.error('Error probando conexión:', error);
		connectionStatus.set('error');
		return false;
	}
}

/**
 * Obtiene la conexión actual
 * @returns {AWSConnection | null} Conexión actual o null
 */
export function getCurrentConnection() {
	let connection = null;
	const unsubscribe = currentConnection.subscribe((value) => (connection = value));
	unsubscribe();
	return connection;
}

/**
 * Reintenta la conexión actual
 * @returns {Promise<boolean>} Si la reconexión fue exitosa
 */
export async function reconnect() {
	const connection = getCurrentConnection();

	if (!connection) {
		return false;
	}

	return await testCurrentConnection();
}

/**
 * Intenta reconectar automáticamente cuando se detecta error
 * @returns {Promise<boolean>} Si la reconexión fue exitosa
 */
export async function autoReconnect() {
	const connection = getCurrentConnection();
	
	if (!connection) {
		return false;
	}

	console.log('Intentando reconexión automática...');
	connectionStatus.set('reconnecting');
	
	try {
		const success = await testCurrentConnection();
		
		if (success) {
			console.log('Reconexión automática exitosa');
			return true;
		} else {
			console.log('Reconexión automática falló');
			connectionStatus.set('error');
			return false;
		}
	} catch (error) {
		console.error('Error en reconexión automática:', error);
		connectionStatus.set('error');
		return false;
	}
}

/**
 * Observa el estado de conexión y reintenta automáticamente si es necesario
 */
let autoReconnectTimeout = null;
connectionStatus.subscribe((status) => {
	if (status === 'error') {
		// Limpiar timeout previo si existe
		if (autoReconnectTimeout) {
			clearTimeout(autoReconnectTimeout);
		}
		
		// Intentar reconexión después de 3 segundos
		autoReconnectTimeout = setTimeout(async () => {
			await autoReconnect();
		}, 3000);
	} else if (status === 'connected') {
		// Limpiar timeout si nos conectamos exitosamente
		if (autoReconnectTimeout) {
			clearTimeout(autoReconnectTimeout);
			autoReconnectTimeout = null;
		}
	}
});
