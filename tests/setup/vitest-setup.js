/**
 * Vitest setup file
 * Configuración global para todos los tests
 */

import '@testing-library/jest-dom';
import { vi, beforeAll, afterAll, afterEach } from 'vitest';

// Mock de window.matchMedia para theme testing
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: vi.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(), // deprecated
		removeListener: vi.fn(), // deprecated
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn()
	}))
});

// Mock de localStorage
const localStorageMock = {
	getItem: vi.fn(),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn()
};
Object.defineProperty(window, 'localStorage', {
	value: localStorageMock
});

// Mock de clipboard API
Object.defineProperty(navigator, 'clipboard', {
	value: {
		writeText: vi.fn().mockResolvedValue(undefined),
		readText: vi.fn().mockResolvedValue('')
	},
	writable: true
});

// Mock de console.error para tests más limpios
const originalError = console.error;
beforeAll(() => {
	console.error = vi.fn();
});

afterAll(() => {
	console.error = originalError;
});

// Cleanup después de cada test
afterEach(() => {
	vi.clearAllMocks();
	localStorageMock.getItem.mockClear();
	localStorageMock.setItem.mockClear();
	localStorageMock.removeItem.mockClear();
	localStorageMock.clear.mockClear();
});
