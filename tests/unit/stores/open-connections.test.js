/**
 * Tests para el store de open-connections
 * Verifica manejo de múltiples conexiones, estado de tablas y navegación
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import {
	openConnections,
	activeConnectionId,
	activeConnection,
	connectionTabs,
	openConnection,
	closeConnection,
	setActiveConnection,
	updateConnectionTables,
	getConnectionById,
	selectTable,
	setActiveDataTab,
	setConnectionLoading,
	setConnectionError,
	getActiveConnection,
	hasOpenConnections
} from '../../../src/lib/stores/open-connections.js';
import { createMockConnection } from '../../utils/test-helpers.js';

// Mock de dependencias
vi.mock('../../../src/lib/services/connection-manager.js', () => ({
	setCurrentConnectionCookie: vi.fn()
}));

vi.mock('../../../src/lib/stores/current-connection.js', () => ({
	setConnection: vi.fn()
}));

describe('Open Connections Store', () => {
	let mockConnection1;
	let mockConnection2;

	beforeEach(() => {
		// Crear conexiones mock
		mockConnection1 = {
			...createMockConnection(),
			id: 'conn-1',
			name: 'Test Connection 1'
		};

		mockConnection2 = {
			...createMockConnection(),
			id: 'conn-2',
			name: 'Test Connection 2'
		};

		// Limpiar stores
		openConnections.set(new Map());
		activeConnectionId.set(null);
		vi.clearAllMocks();
	});

	describe('Initial State', () => {
		it('should start with empty connections', () => {
			expect(get(openConnections)).toBeInstanceOf(Map);
			expect(get(openConnections).size).toBe(0);
		});

		it('should have no active connection initially', () => {
			expect(get(activeConnectionId)).toBeNull();
			expect(get(activeConnection)).toBeNull();
		});

		it('should have empty connection tabs initially', () => {
			expect(get(connectionTabs)).toEqual([]);
		});
	});

	describe('openConnection', () => {
		it('should add connection to open connections', () => {
			const connectionId = openConnection(mockConnection1);

			expect(connectionId).toBe('conn-1');
			const connections = get(openConnections);
			expect(connections.has('conn-1')).toBe(true);
		});

		it('should set correct initial state for new connection', () => {
			openConnection(mockConnection1);

			const connections = get(openConnections);
			const openConn = connections.get('conn-1');

			expect(openConn).toEqual({
				connection: mockConnection1,
				selectedTable: null,
				activeDataTab: 'table',
				isLoading: false,
				error: null,
				tables: [],
				tablesLoading: false,
				tablesError: null
			});
		});

		it('should set connection as active', () => {
			openConnection(mockConnection1);

			expect(get(activeConnectionId)).toBe('conn-1');
			expect(get(activeConnection)).toBeTruthy();
		});

		it('should allow multiple connections', () => {
			openConnection(mockConnection1);
			openConnection(mockConnection2);

			const connections = get(openConnections);
			expect(connections.size).toBe(2);
			expect(connections.has('conn-1')).toBe(true);
			expect(connections.has('conn-2')).toBe(true);
		});

		it('should make latest connection active', () => {
			openConnection(mockConnection1);
			openConnection(mockConnection2);

			expect(get(activeConnectionId)).toBe('conn-2');
		});
	});

	describe('closeConnection', () => {
		beforeEach(() => {
			openConnection(mockConnection1);
			openConnection(mockConnection2);
		});

		it('should remove connection from open connections', () => {
			closeConnection('conn-1');

			const connections = get(openConnections);
			expect(connections.has('conn-1')).toBe(false);
			expect(connections.has('conn-2')).toBe(true);
		});

		it('should switch active connection when closing active one', () => {
			// conn-2 es activa
			expect(get(activeConnectionId)).toBe('conn-2');

			closeConnection('conn-2');

			// Debería cambiar a conn-1
			expect(get(activeConnectionId)).toBe('conn-1');
		});

		it('should set active to null when closing last connection', () => {
			closeConnection('conn-1');
			closeConnection('conn-2');

			expect(get(activeConnectionId)).toBeNull();
			expect(get(openConnections).size).toBe(0);
		});

		it('should not affect active connection when closing non-active', () => {
			closeConnection('conn-1');

			expect(get(activeConnectionId)).toBe('conn-2');
		});
	});

	describe('setActiveConnection', () => {
		beforeEach(() => {
			openConnection(mockConnection1);
			openConnection(mockConnection2);
		});

		it('should set active connection', () => {
			setActiveConnection('conn-1');

			expect(get(activeConnectionId)).toBe('conn-1');
		});

		it('should update active connection derived store', () => {
			setActiveConnection('conn-1');

			const active = get(activeConnection);
			expect(active?.connection.id).toBe('conn-1');
		});

		it('should handle non-existent connection gracefully', () => {
			setActiveConnection('non-existent');

			expect(get(activeConnectionId)).toBe('non-existent');
			expect(get(activeConnection)).toBeNull();
		});
	});

	describe('connectionTabs derived store', () => {
		it('should create tabs from open connections', () => {
			openConnection(mockConnection1);
			openConnection(mockConnection2);

			const tabs = get(connectionTabs);
			expect(tabs).toHaveLength(2);
			expect(tabs[0]).toEqual({
				id: 'conn-1',
				title: 'Test Connection 1',
				closable: true,
				data: expect.any(Object)
			});
		});

		it('should update when connections change', () => {
			openConnection(mockConnection1);
			let tabs = get(connectionTabs);
			expect(tabs).toHaveLength(1);

			openConnection(mockConnection2);
			tabs = get(connectionTabs);
			expect(tabs).toHaveLength(2);

			closeConnection('conn-1');
			tabs = get(connectionTabs);
			expect(tabs).toHaveLength(1);
			expect(tabs[0].id).toBe('conn-2');
		});
	});

	describe('updateConnectionTables', () => {
		beforeEach(() => {
			openConnection(mockConnection1);
		});

		it('should update tables for specific connection', () => {
			const tables = ['Table1', 'Table2', 'Table3'];
			updateConnectionTables('conn-1', tables);

			const connections = get(openConnections);
			const openConn = connections.get('conn-1');
			expect(openConn?.tables).toEqual(tables);
			expect(openConn?.tablesLoading).toBe(false);
			expect(openConn?.tablesError).toBeNull();
		});

		it('should update loading state', () => {
			updateConnectionTables('conn-1', [], true);

			const connections = get(openConnections);
			const openConn = connections.get('conn-1');
			expect(openConn?.tablesLoading).toBe(true);
		});

		it('should update error state', () => {
			const error = 'Failed to load tables';
			updateConnectionTables('conn-1', [], false, error);

			const connections = get(openConnections);
			const openConn = connections.get('conn-1');
			expect(openConn?.tablesError).toBe(error);
		});

		it('should handle non-existent connection gracefully', () => {
			updateConnectionTables('non-existent', ['Table1']);

			// No debería lanzar error
			expect(true).toBe(true);
		});
	});

	describe('selectTable', () => {
		beforeEach(() => {
			openConnection(mockConnection1);
		});

		it('should select table in active connection', () => {
			selectTable('TestTable');

			const connections = get(openConnections);
			const openConn = connections.get('conn-1');
			expect(openConn?.selectedTable).toBe('TestTable');
			expect(openConn?.activeDataTab).toBe('table');
		});

		it('should deselect table when empty string provided', () => {
			selectTable('TestTable');
			selectTable('');

			const connections = get(openConnections);
			const openConn = connections.get('conn-1');
			expect(openConn?.selectedTable).toBeNull();
		});

		it('should handle no active connection gracefully', () => {
			activeConnectionId.set(null);
			selectTable('TestTable');

			// No debería lanzar error
			expect(true).toBe(true);
		});
	});

	describe('setActiveDataTab', () => {
		beforeEach(() => {
			openConnection(mockConnection1);
		});

		it('should set active data tab', () => {
			setActiveDataTab('query');

			const connections = get(openConnections);
			const openConn = connections.get('conn-1');
			expect(openConn?.activeDataTab).toBe('query');
		});

		it('should handle no active connection gracefully', () => {
			activeConnectionId.set(null);
			setActiveDataTab('query');

			// No debería lanzar error
			expect(true).toBe(true);
		});
	});

	describe('setConnectionLoading', () => {
		beforeEach(() => {
			openConnection(mockConnection1);
		});

		it('should set loading state', () => {
			setConnectionLoading('conn-1', true);

			const connections = get(openConnections);
			const openConn = connections.get('conn-1');
			expect(openConn?.isLoading).toBe(true);
		});

		it('should handle non-existent connection gracefully', () => {
			setConnectionLoading('non-existent', true);

			// No debería lanzar error
			expect(true).toBe(true);
		});
	});

	describe('setConnectionError', () => {
		beforeEach(() => {
			openConnection(mockConnection1);
		});

		it('should set error state', () => {
			const error = 'Connection failed';
			setConnectionError('conn-1', error);

			const connections = get(openConnections);
			const openConn = connections.get('conn-1');
			expect(openConn?.error).toBe(error);
		});

		it('should clear error when null provided', () => {
			setConnectionError('conn-1', 'Error');
			setConnectionError('conn-1', null);

			const connections = get(openConnections);
			const openConn = connections.get('conn-1');
			expect(openConn?.error).toBeNull();
		});
	});

	describe('getConnectionById', () => {
		beforeEach(() => {
			openConnection(mockConnection1);
		});

		it('should return connection by id', () => {
			const connection = getConnectionById('conn-1');
			expect(connection).toEqual(mockConnection1);
		});

		it('should return null for non-existent connection', () => {
			const connection = getConnectionById('non-existent');
			expect(connection).toBeNull();
		});

		it('should handle server environment gracefully', () => {
			// Mock server environment
			Object.defineProperty(global, 'window', {
				value: undefined,
				writable: true
			});

			const connection = getConnectionById('conn-1');
			expect(connection).toBeNull();

			// Restore window
			Object.defineProperty(global, 'window', {
				value: {},
				writable: true
			});
		});
	});

	describe('getActiveConnection', () => {
		it('should return active connection', () => {
			openConnection(mockConnection1);

			const active = getActiveConnection();
			expect(active?.connection.id).toBe('conn-1');
		});

		it('should return null when no active connection', () => {
			const active = getActiveConnection();
			expect(active).toBeNull();
		});
	});

	describe('hasOpenConnections', () => {
		it('should return false when no connections', () => {
			expect(hasOpenConnections()).toBe(false);
		});

		it('should return true when connections exist', () => {
			openConnection(mockConnection1);
			expect(hasOpenConnections()).toBe(true);
		});

		it('should return false after closing all connections', () => {
			openConnection(mockConnection1);
			closeConnection('conn-1');
			expect(hasOpenConnections()).toBe(false);
		});
	});

	describe('Complex workflows', () => {
		it('should handle full workflow: open -> select table -> change tab -> close', () => {
			// Open connection
			openConnection(mockConnection1);
			expect(get(activeConnectionId)).toBe('conn-1');

			// Update tables
			updateConnectionTables('conn-1', ['Table1', 'Table2']);

			// Select table
			selectTable('Table1');
			let openConn = get(openConnections).get('conn-1');
			expect(openConn?.selectedTable).toBe('Table1');

			// Change data tab
			setActiveDataTab('query');
			openConn = get(openConnections).get('conn-1');
			expect(openConn?.activeDataTab).toBe('query');

			// Close connection
			closeConnection('conn-1');
			expect(get(openConnections).size).toBe(0);
		});

		it('should handle multiple connections with different states', () => {
			// Open two connections
			openConnection(mockConnection1);
			openConnection(mockConnection2);

			// Set different states
			updateConnectionTables('conn-1', ['Table1']);
			updateConnectionTables('conn-2', ['Table2'], true); // loading
			selectTable('Table2'); // conn-2 is active

			// Verify states
			const connections = get(openConnections);
			const conn1 = connections.get('conn-1');
			const conn2 = connections.get('conn-2');

			expect(conn1?.tables).toEqual(['Table1']);
			expect(conn1?.selectedTable).toBeNull();

			expect(conn2?.tables).toEqual(['Table2']);
			expect(conn2?.tablesLoading).toBe(true);
			expect(conn2?.selectedTable).toBe('Table2');
		});
	});
});