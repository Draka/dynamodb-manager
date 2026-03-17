/**
 * Mocks para AWS DynamoDB SDK
 * Simula las respuestas de DynamoDB para testing
 */

import { vi } from 'vitest';

/**
 * Mock del DynamoDB Client
 */
export const mockDynamoDBClient = {
	send: vi.fn(),
	config: {
		region: 'us-east-1'
	}
};

/**
 * Mock responses para diferentes comandos
 */
export const mockResponses = {
	// ListTables
	listTables: {
		TableNames: ['TestTable1', 'TestTable2', 'TestTable3']
	},

	// DescribeTable
	describeTable: {
		Table: {
			TableName: 'TestTable',
			TableStatus: 'ACTIVE',
			KeySchema: [
				{ AttributeName: 'id', KeyType: 'HASH' },
				{ AttributeName: 'sortKey', KeyType: 'RANGE' }
			],
			AttributeDefinitions: [
				{ AttributeName: 'id', AttributeType: 'S' },
				{ AttributeName: 'sortKey', AttributeType: 'S' }
			],
			ItemCount: 100,
			TableSizeBytes: 10240,
			GlobalSecondaryIndexes: [
				{
					IndexName: 'GSI1',
					KeySchema: [{ AttributeName: 'gsi1pk', KeyType: 'HASH' }]
				}
			]
		}
	},

	// Scan
	scan: {
		Items: [
			{
				id: { S: 'item1' },
				name: { S: 'Test Item 1' },
				count: { N: '10' },
				active: { BOOL: true }
			},
			{
				id: { S: 'item2' },
				name: { S: 'Test Item 2' },
				count: { N: '20' },
				active: { BOOL: false }
			}
		],
		Count: 2,
		ScannedCount: 2,
		LastEvaluatedKey: null
	},

	// Query
	query: {
		Items: [
			{
				id: { S: 'item1' },
				sortKey: { S: 'sort1' },
				data: { S: 'Query result 1' }
			}
		],
		Count: 1,
		ScannedCount: 1,
		LastEvaluatedKey: null
	},

	// PutItem
	putItem: {
		Attributes: {}
	},

	// UpdateItem
	updateItem: {
		Attributes: {
			id: { S: 'item1' },
			name: { S: 'Updated Item' },
			updatedAt: { S: new Date().toISOString() }
		}
	},

	// DeleteItem
	deleteItem: {
		Attributes: {
			id: { S: 'item1' },
			name: { S: 'Deleted Item' }
		}
	}
};

/**
 * Mock del DynamoDB DocumentClient
 */
export const mockDocumentClient = {
	send: vi.fn(),

	// Métodos de conveniencia
	scan: vi.fn().mockResolvedValue({
		Items: [
			{ id: 'item1', name: 'Test Item 1', count: 10, active: true },
			{ id: 'item2', name: 'Test Item 2', count: 20, active: false }
		],
		Count: 2,
		LastEvaluatedKey: null
	}),

	query: vi.fn().mockResolvedValue({
		Items: [{ id: 'item1', sortKey: 'sort1', data: 'Query result 1' }],
		Count: 1
	}),

	put: vi.fn().mockResolvedValue({}),

	update: vi.fn().mockResolvedValue({
		Attributes: { id: 'item1', name: 'Updated Item' }
	}),

	delete: vi.fn().mockResolvedValue({
		Attributes: { id: 'item1', name: 'Deleted Item' }
	})
};

/**
 * Factory para crear mocks de comandos específicos
 * @param {string} commandName
 * @param {any} response
 */
export function createCommandMock(commandName, response) {
	return vi.fn().mockImplementation((command) => {
		if (command.constructor.name === commandName) {
			return Promise.resolve(response);
		}
		return Promise.reject(new Error(`Unexpected command: ${command.constructor.name}`));
	});
}

/**
 * Mock para errores de DynamoDB
 */
export const mockDynamoDBError = {
	name: 'ResourceNotFoundException',
	message: 'Requested resource not found',
	$fault: 'client',
	$metadata: {
		httpStatusCode: 400,
		requestId: 'test-request-id'
	}
};

/**
 * Setup para mockar todo el AWS SDK
 */
export function setupAWSMocks() {
	// Mock del DynamoDBClient
	vi.doMock('@aws-sdk/client-dynamodb', () => ({
		DynamoDBClient: vi.fn(() => mockDynamoDBClient),
		ListTablesCommand: vi.fn(),
		DescribeTableCommand: vi.fn(),
		ScanCommand: vi.fn(),
		QueryCommand: vi.fn(),
		PutItemCommand: vi.fn(),
		UpdateItemCommand: vi.fn(),
		DeleteItemCommand: vi.fn()
	}));

	// Mock del DynamoDB DocumentClient
	vi.doMock('@aws-sdk/lib-dynamodb', () => ({
		DynamoDBDocumentClient: {
			from: vi.fn(() => mockDocumentClient)
		},
		ScanCommand: vi.fn(),
		QueryCommand: vi.fn(),
		PutCommand: vi.fn(),
		UpdateCommand: vi.fn(),
		DeleteCommand: vi.fn()
	}));
}

/**
 * Helpers para configurar respuestas específicas
 */
export const mockHelpers = {
	/**
	 * Configura mock para scan exitoso
	 */
	setupSuccessfulScan: (items = mockResponses.scan.Items) => {
		mockDynamoDBClient.send.mockResolvedValue({
			...mockResponses.scan,
			Items: items
		});
		mockDocumentClient.scan.mockResolvedValue({
			Items: items.map(
				(/** @type {Record<string, { S?: string; N?: string; BOOL?: boolean }>} */ item) => {
					// Convertir de formato DynamoDB a formato plano
					/** @type {Record<string, string | number | boolean>} */
					const plain = {};
					Object.keys(item).forEach((key) => {
						const value = item[key];
						if (value.S !== undefined) plain[key] = value.S;
						else if (value.N !== undefined) plain[key] = Number(value.N);
						else if (value.BOOL !== undefined) plain[key] = value.BOOL;
					});
					return plain;
				}
			),
			Count: items.length
		});
	},

	/**
	 * Configura mock para error
	 */
	setupError: (error = mockDynamoDBError) => {
		mockDynamoDBClient.send.mockRejectedValue(error);
		mockDocumentClient.scan.mockRejectedValue(error);
	},

	/**
	 * Reset de todos los mocks
	 */
	reset: () => {
		vi.clearAllMocks();
		Object.values(mockDocumentClient).forEach((mock) => {
			if (typeof mock === 'function') {
				mock.mockClear();
			}
		});
	}
};
