/**
 * Proceso principal de Electron para DynamoDB Manager
 * Crea la ventana principal y maneja eventos del sistema
 */

import { app, BrowserWindow, Menu, shell, dialog } from 'electron';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuración
const isDev = process.env.NODE_ENV === 'development';
const PORT = process.env.PORT || 4173;
const DEV_PORT = 5174; // Puerto usado por Vite en desarrollo

let mainWindow = null;
let serverProcess = null;

/**
 * Crea la ventana principal de la aplicación
 */
function createMainWindow() {
	// Crear la ventana del navegador
	mainWindow = new BrowserWindow({
		width: 1400,
		height: 900,
		minWidth: 1000,
		minHeight: 600,
		webPreferences: {
			nodeIntegration: false,
			contextIsolation: true,
			enableRemoteModule: false,
			preload: path.join(__dirname, 'preload.js')
		},
		// icon: path.join(__dirname, '../src/lib/assets/favicon.ico'),
		titleBarStyle: 'default',
		show: false // No mostrar hasta que esté listo
	});

	// Cargar la aplicación
	const startUrl = isDev 
		? `http://localhost:${DEV_PORT}` 
		: `http://localhost:${PORT}`;
	
	console.log(`Cargando aplicación desde: ${startUrl}`);
	mainWindow.loadURL(startUrl);

	// Mostrar ventana cuando esté lista
	mainWindow.once('ready-to-show', () => {
		mainWindow.show();
		
		// Abrir DevTools en desarrollo
		if (isDev) {
			mainWindow.webContents.openDevTools();
		}
	});

	// Manejar cierre de ventana
	mainWindow.on('closed', () => {
		mainWindow = null;
	});

	// Abrir enlaces externos en el navegador por defecto
	mainWindow.webContents.setWindowOpenHandler(({ url }) => {
		shell.openExternal(url);
		return { action: 'deny' };
	});

	// Prevenir navegación a sitios externos
	mainWindow.webContents.on('will-navigate', (event, url) => {
		if (url !== mainWindow.webContents.getURL()) {
			event.preventDefault();
			shell.openExternal(url);
		}
	});
}

/**
 * Inicia el servidor SvelteKit en producción
 */
function startServer() {
	if (isDev) return Promise.resolve();

	return new Promise((resolve, reject) => {
		const serverPath = path.join(__dirname, '../build/index.js');
		
		console.log('Iniciando servidor SvelteKit...');
		
		serverProcess = spawn('node', [serverPath], {
			env: {
				...process.env,
				PORT: PORT,
				ORIGIN: `http://localhost:${PORT}`
			}
		});

		serverProcess.stdout.on('data', (data) => {
			console.log(`Servidor: ${data}`);
		});

		serverProcess.stderr.on('data', (data) => {
			console.error(`Error servidor: ${data}`);
		});

		serverProcess.on('error', (err) => {
			console.error('Error iniciando servidor:', err);
			reject(err);
		});

		// Esperar un poco para que el servidor inicie
		setTimeout(() => {
			resolve();
		}, 2000);
	});
}

/**
 * Configura el menú de la aplicación
 */
function createApplicationMenu() {
	const template = [
		{
			label: 'Archivo',
			submenu: [
				{
					label: 'Nueva Conexión',
					accelerator: 'CmdOrCtrl+N',
					click: () => {
						mainWindow?.webContents.send('menu-new-connection');
					}
				},
				{ type: 'separator' },
				{
					label: 'Exportar Datos',
					accelerator: 'CmdOrCtrl+E',
					click: () => {
						mainWindow?.webContents.send('menu-export-data');
					}
				},
				{ type: 'separator' },
				{
					label: 'Salir',
					accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
					click: () => {
						app.quit();
					}
				}
			]
		},
		{
			label: 'Editar',
			submenu: [
				{ role: 'undo', label: 'Deshacer' },
				{ role: 'redo', label: 'Rehacer' },
				{ type: 'separator' },
				{ role: 'cut', label: 'Cortar' },
				{ role: 'copy', label: 'Copiar' },
				{ role: 'paste', label: 'Pegar' },
				{ role: 'selectall', label: 'Seleccionar todo' }
			]
		},
		{
			label: 'Ver',
			submenu: [
				{ role: 'reload', label: 'Recargar' },
				{ role: 'forceReload', label: 'Forzar recarga' },
				{ role: 'toggleDevTools', label: 'Herramientas de desarrollador' },
				{ type: 'separator' },
				{ role: 'resetZoom', label: 'Zoom normal' },
				{ role: 'zoomIn', label: 'Acercar' },
				{ role: 'zoomOut', label: 'Alejar' },
				{ type: 'separator' },
				{ role: 'togglefullscreen', label: 'Pantalla completa' }
			]
		},
		{
			label: 'Ventana',
			submenu: [
				{ role: 'minimize', label: 'Minimizar' },
				{ role: 'close', label: 'Cerrar' }
			]
		},
		{
			label: 'Ayuda',
			submenu: [
				{
					label: 'Acerca de DynamoDB Manager',
					click: () => {
						dialog.showMessageBox(mainWindow, {
							type: 'info',
							title: 'Acerca de',
							message: 'DynamoDB Manager',
							detail: 'Aplicación para gestionar bases de datos DynamoDB\nVersión 1.0.0'
						});
					}
				}
			]
		}
	];

	const menu = Menu.buildFromTemplate(template);
	Menu.setApplicationMenu(menu);
}

/**
 * Inicialización de la aplicación
 */
app.whenReady().then(async () => {
	try {
		// Iniciar servidor en producción
		await startServer();
		
		// Crear ventana principal
		createMainWindow();
		
		// Configurar menú
		createApplicationMenu();
		
		console.log('Aplicación iniciada correctamente');
	} catch (error) {
		console.error('Error iniciando aplicación:', error);
		
		dialog.showErrorBox(
			'Error al iniciar',
			'No se pudo iniciar la aplicación. Por favor, verifica que todos los archivos estén presentes.'
		);
		
		app.quit();
	}

	// Recrear ventana en macOS cuando se hace clic en el dock
	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createMainWindow();
		}
	});
});

/**
 * Manejo del cierre de la aplicación
 */
app.on('window-all-closed', () => {
	// En macOS, es común que las apps permanezcan activas hasta que el usuario las cierre explícitamente
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

app.on('before-quit', () => {
	// Cerrar servidor si está corriendo
	if (serverProcess) {
		console.log('Cerrando servidor...');
		serverProcess.kill();
	}
});

/**
 * Configuración de seguridad
 */
app.on('web-contents-created', (event, contents) => {
	// Prevenir navegación a sitios externos
	contents.on('will-navigate', (event, navigationUrl) => {
		const parsedUrl = new URL(navigationUrl);
		
		if (parsedUrl.origin !== `http://localhost:${PORT}` && parsedUrl.origin !== `http://localhost:${DEV_PORT}`) {
			event.preventDefault();
		}
	});

	// Prevenir creación de ventanas nuevas
	contents.setWindowOpenHandler(({ url }) => {
		shell.openExternal(url);
		return { action: 'deny' };
	});
});

// Manejar errores no capturados
process.on('uncaughtException', (error) => {
	console.error('Error no capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
	console.error('Promesa rechazada no manejada:', reason);
});