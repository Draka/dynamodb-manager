/**
 * Test helpers y utilities
 * Funciones reutilizables para tests
 */

import { render } from '@testing-library/svelte';
import { vi } from 'vitest';

/**
 * Renderiza un componente Svelte con props por defecto
 * @param {*} Component - Componente a renderizar
 * @param {Object} props - Props para el componente
 * @param {Object} options - Opciones adicionales de render
 * @returns {Object} Resultado del render
 */
export function renderComponent(Component, props = {}, options = {}) {
	return render(Component, { props, ...options });
}

/**
 * Mock de una conexión DynamoDB
 * @returns {Object} Mock de conexión
 */
export function createMockConnection() {
	return {
		id: 'test-connection-id',
		name: 'Test Connection',
		region: 'us-east-1',
		accessKeyId: 'test-access-key',
		secretAccessKey: 'test-secret-key',
		endpoint: undefined,
		profile: undefined
	};
}

/**
 * Mock de datos de tabla DynamoDB
 * @returns {Object} Mock de tabla
 */
export function createMockTableData() {
	return {
		TableName: 'TestTable',
		KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
		AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
		TableStatus: 'ACTIVE',
		ItemCount: 5,
		TableSizeBytes: 1024
	};
}

/**
 * Mock de items de tabla
 * @returns {Array} Array de items mock
 */
export function createMockItems() {
	return [
		{ id: '1', name: 'Test Item 1', count: 10, active: true },
		{ id: '2', name: 'Test Item 2', count: 20, active: false },
		{ id: '3', name: 'Test Item 3', count: 30, active: true }
	];
}

/**
 * Mock del response de DynamoDB scan
 * @param {Array} items - Items a incluir
 * @returns {Object} Response mock
 */
export function createMockScanResponse(items = createMockItems()) {
	return {
		Items: items,
		Count: items.length,
		ScannedCount: items.length,
		LastEvaluatedKey: null
	};
}

/**
 * Simula delay asíncrono para tests
 * @param {number} ms - Milisegundos de delay
 * @returns {Promise} Promise que resuelve después del delay
 */
export function delay(ms = 0) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock del theme store
 * @returns {Object} Mock store
 */
export function createMockThemeStore() {
	return {
		subscribe: vi.fn(),
		set: vi.fn(),
		update: vi.fn()
	};
}

/**
 * Espera a que un elemento aparezca en el DOM
 * @param {Function} getByTestId - Función para buscar elemento
 * @param {string} testId - Test ID del elemento
 * @param {number} timeout - Timeout en ms
 * @returns {Promise} Promise que resuelve con el elemento
 */
export async function waitForElement(getByTestId, testId, timeout = 1000) {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			reject(new Error(`Element with testId "${testId}" not found within ${timeout}ms`));
		}, timeout);

		const interval = setInterval(() => {
			try {
				const element = getByTestId(testId);
				if (element) {
					clearTimeout(timer);
					clearInterval(interval);
					resolve(element);
				}
			} catch (e) {
				// Elemento no encontrado aún
			}
		}, 10);
	});
}

/**
 * Mock de fetch para API calls
 * @param {Object} response - Response mock
 * @returns {Function} Mock function
 */
export function createFetchMock(response) {
	return vi.fn().mockResolvedValue({
		ok: true,
		status: 200,
		json: vi.fn().mockResolvedValue(response),
		text: vi.fn().mockResolvedValue(JSON.stringify(response))
	});
}
