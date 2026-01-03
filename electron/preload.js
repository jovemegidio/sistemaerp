/**
 * Preload script - Expõe APIs seguras para o renderer
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expor APIs seguras para o front-end
contextBridge.exposeInMainWorld('electronAPI', {
    // Informações do sistema
    platform: process.platform,
    version: process.env.npm_package_version || '2.0.0',
    
    // Notificações
    showNotification: (title, body) => {
        new Notification(title, { body });
    },
    
    // Eventos IPC
    onStatusUpdate: (callback) => {
        ipcRenderer.on('status-update', (event, message) => callback(message));
    },
    
    // Navegação
    navigate: (path) => {
        ipcRenderer.send('navigate', path);
    },
    
    // Minimizar para bandeja
    minimizeToTray: () => {
        ipcRenderer.send('minimize-to-tray');
    }
});

// Informar que está rodando no Electron
window.addEventListener('DOMContentLoaded', () => {
    // Adicionar classe ao body para identificar ambiente Electron
    document.body.classList.add('electron-app');
    
    // Criar meta tag
    const meta = document.createElement('meta');
    meta.name = 'electron';
    meta.content = 'true';
    document.head.appendChild(meta);
});
