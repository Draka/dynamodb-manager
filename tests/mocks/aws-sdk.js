/**
 * Mocks para AWS SDK
 * Configuración general de mocks para servicios AWS
 */

import { vi } from 'vitest';

/**
 * Mock de credenciales AWS
 */
export const mockCredentials = {
	accessKeyId: 'test-access-key',
	secretAccessKey: 'test-secret-key',
	sessionToken: undefined
};

/**
 * Mock de configuración AWS
 */
export const mockAWSConfig = {
	region: 'us-east-1',
	credentials: mockCredentials,
	endpoint: undefined
};

/**
 * Mock del cliente de configuración AWS
 */
export const mockConfigService = {
	loadSharedConfigFiles: vi.fn().mockResolvedValue({
		configFile: {},
		credentialsFile: {}
	}),
	fromIni: vi.fn().mockReturnValue(mockCredentials),
	fromEnv: vi.fn().mockReturnValue(mockCredentials)
};

/**
 * Setup para mockear las credenciales y configuración AWS
 */
export function setupAWSConfigMocks() {
	// Mock de @aws-sdk/credential-providers
	vi.doMock('@aws-sdk/credential-providers', () => ({
		fromIni: mockConfigService.fromIni,
		fromEnv: mockConfigService.fromEnv,
		defaultProvider: vi.fn().mockReturnValue(() => Promise.resolve(mockCredentials))
	}));

	// Mock de @aws-sdk/shared-ini-file-loader
	vi.doMock('@aws-sdk/shared-ini-file-loader', () => ({
		loadSharedConfigFiles: mockConfigService.loadSharedConfigFiles
	}));
}

/**
 * Helpers para testing de conexiones AWS
 */
export const awsTestHelpers = {
	/**
	 * Simula conexión exitosa
	 */
	setupSuccessfulConnection: () => {
		mockConfigService.fromIni.mockReturnValue(mockCredentials);
		mockConfigService.loadSharedConfigFiles.mockResolvedValue({
			configFile: {
				default: { region: 'us-east-1' }
			},
			credentialsFile: {
				default: mockCredentials
			}
		});
	},

	/**
	 * Simula error de credenciales
	 */
	setupCredentialsError: () => {
		const error = new Error('Unable to load credentials');
		error.name = 'CredentialsProviderError';
		mockConfigService.fromIni.mockRejectedValue(error);
	},

	/**
	 * Simula error de región
	 */
	setupRegionError: () => {
		const error = new Error('Region not found');
		error.name = 'ConfigurationError';
		mockConfigService.loadSharedConfigFiles.mockRejectedValue(error);
	},

	/**
	 * Reset de mocks
	 */
	reset: () => {
		Object.values(mockConfigService).forEach(mock => {
			if (typeof mock === 'function') {
				mock.mockClear();
			}
		});
	}
};