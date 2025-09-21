/**
 * Script de preload para comunicación segura entre Electron y la aplicación web
 * Este script se ejecuta antes de que se cargue el contenido web
 */

const { contextBridge, ipcRenderer } = require('electron');

// Exponer APIs seguras al renderer process
contextBridge.exposeInMainWorld('electronAPI', {
	/**
	 * Información del sistema
	 */
	platform: process.platform,
	version: process.versions.electron,

	/**
	 * Eventos del menú
	 */
	onMenuNewConnection: (callback) => ipcRenderer.on('menu-new-connection', callback),
	onMenuExportData: (callback) => ipcRenderer.on('menu-export-data', callback),

	/**
	 * Notificaciones del sistema (para futuras implementaciones)
	 */
	showNotification: (title, body) => {
		ipcRenderer.invoke('show-notification', { title, body });
	},

	/**
	 * Manejo de archivos (para futuras implementaciones)
	 */
	selectFile: (options) => {
		return ipcRenderer.invoke('dialog-open-file', options);
	},
	
	saveFile: (options) => {
		return ipcRenderer.invoke('dialog-save-file', options);
	}
});

// Log para debugging
console.log('Script preload cargado correctamente');

// Prevenir acceso directo a Node.js APIs
delete window.require;
delete window.exports;
delete window.module;