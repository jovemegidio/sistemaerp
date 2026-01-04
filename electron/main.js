/**
 * ALUFORCE SISTEMA - Aplicativo Desktop
 * Arquivo principal do Electron
 * 
 * @version 2.0.0
 * @author ALUFORCE Team
 */

const { app, BrowserWindow, Menu, Tray, shell, dialog, nativeImage, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');

// Configurações
const CONFIG = {
    SERVER_PORT: 3000,
    APP_NAME: 'Aluforce Sistema',
    APP_VERSION: '2.0.0',
    WINDOW: {
        WIDTH: 1400,
        HEIGHT: 900,
        MIN_WIDTH: 1024,
        MIN_HEIGHT: 700
    }
};

// Variáveis globais
let mainWindow = null;
let splashWindow = null;
let serverProcess = null;
let tray = null;
let isQuitting = false;

// Caminhos dos ícones - usando Icone 2 (azul escuro) da pasta base
const iconPath = path.join(__dirname, '..', 'base', 'Icone 2.png');
const iconPathAlt = path.join(__dirname, '..', 'assets', 'icon.png');

/**
 * Cria a janela de splash/loading
 */
function createSplashWindow() {
    splashWindow = new BrowserWindow({
        width: 500,
        height: 350,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    splashWindow.loadFile(path.join(__dirname, 'splash.html'));
    splashWindow.center();
}

/**
 * Cria a janela principal da aplicação
 */
function createMainWindow() {
    const windowState = loadWindowState();
    
    // Usar ícone da pasta base ou assets
    let appIcon = iconPath;
    if (!fs.existsSync(appIcon)) {
        appIcon = iconPathAlt;
    }

    mainWindow = new BrowserWindow({
        width: windowState.width || CONFIG.WINDOW.WIDTH,
        height: windowState.height || CONFIG.WINDOW.HEIGHT,
        x: windowState.x,
        y: windowState.y,
        minWidth: CONFIG.WINDOW.MIN_WIDTH,
        minHeight: CONFIG.WINDOW.MIN_HEIGHT,
        title: CONFIG.APP_NAME,
        icon: appIcon,
        show: false,
        frame: true,
        backgroundColor: '#f8fafc',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    // Maximizar se estava maximização
    if (windowState.isMaximized) {
        mainWindow.maximize();
    }

    // Carregar a aplicação
    mainWindow.loadURL(`http://localhost:${CONFIG.SERVER_PORT}`);

    // Eventos da janela
    mainWindow.once('ready-to-show', () => {
        closeSplash();
        mainWindow.show();
    });
    
    // Timeout para fechar splash mesmo se a página demorar
    setTimeout(() => {
        closeSplash();
        if (mainWindow && !mainWindow.isVisible()) {
            mainWindow.show();
        }
    }, 10000);

    mainWindow.on('close', (event) => {
        if (!isQuitting) {
            event.preventDefault();
            mainWindow.hide();
            return false;
        }
        saveWindowState();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Salvar estação ao redimensionar
    mainWindow.on('resize', saveWindowState);
    mainWindow.on('move', saveWindowState);

    // Abrir links externos no navegaçãor padrão
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (!url.startsWith('http://localhost')) {
            shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });
    
    // Erro ao carregar - tentar novamente
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('Falha ao carregar:', errorDescription);
        setTimeout(() => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.loadURL(`http://localhost:${CONFIG.SERVER_PORT}`);
            }
        }, 2000);
    });

    // Criar menu
    createApplicationMenu();

    // Criar tray icon
    createTrayIcon();
}

/**
 * Fecha a janela de splash
 */
function closeSplash() {
    if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
        splashWindow = null;
    }
}

/**
 * Cria o menu da aplicação
 */
function createApplicationMenu() {
    const template = [
        {
            label: 'Arquivo',
            submenu: [
                { label: 'Recarregar', accelerator: 'CmdOrCtrl+R', click: () => mainWindow.reload() },
                { label: 'Forçar Recarregamento', accelerator: 'CmdOrCtrl+Shift+R', click: () => mainWindow.webContents.reloadIgnoringCache() },
                { type: 'separator' },
                { label: 'Minimizar para Bandeja', click: () => mainWindow.hide() },
                { type: 'separator' },
                { label: 'Sair', accelerator: 'Alt+F4', click: () => { isQuitting = true; app.quit(); } }
            ]
        },
        {
            label: 'Visualizar',
            submenu: [
                { label: 'Tela Cheia', accelerator: 'F11', click: () => mainWindow.setFullScreen(!mainWindow.isFullScreen()) },
                { type: 'separator' },
                { label: 'Aumentar Zoom', accelerator: 'CmdOrCtrl+Plus', click: () => { const z = mainWindow.webContents.getZoomFactor() || 1; mainWindow.webContents.setZoomFactor(Math.min(z + 0.1, 2)); } },
                { label: 'Diminuir Zoom', accelerator: 'CmdOrCtrl+-', click: () => { const z = mainWindow.webContents.getZoomFactor() || 1; mainWindow.webContents.setZoomFactor(Math.max(z - 0.1, 0.5)); } },
                { label: 'Zoom Padrão', accelerator: 'CmdOrCtrl+0', click: () => mainWindow.webContents.setZoomFactor(1) },
                { type: 'separator' },
                { label: 'Ferramentas do Desenvolvedor', accelerator: 'F12', click: () => mainWindow.webContents.toggleDevTools() }
            ]
        },
        {
            label: 'Módulos',
            submenu: [
                { label: 'Dashboard', click: () => navigateTo('/') },
                { type: 'separator' },
                { label: 'PCP', click: () => navigateTo('/modules/PCP/index.html') },
                { label: 'Vendas', click: () => navigateTo('/modules/Vendas/index.html') },
                { label: 'Financeiro', click: () => navigateTo('/modules/Financeiro/index.html') },
                { label: 'Compras', click: () => navigateTo('/modules/Compras/index.html') },
                { label: 'RH', click: () => navigateTo('/modules/RH/index.html') },
                { label: 'Qualidade', click: () => navigateTo('/modules/Qualidade/index.html') }
            ]
        },
        {
            label: 'Ajuda',
            submenu: [
                { label: 'Sobre', click: showAboutDialog },
                { type: 'separator' },
                { label: 'Verificar Atualizações', click: () => { dialog.showMessageBox(mainWindow, { type: 'info', title: 'Atualizações', message: 'Sistema atualização', detail: `Versão: ${CONFIG.APP_VERSION}` }); } }
            ]
        }
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

/**
 * Cria o ícone na bandeja do sistema
 */
function createTrayIcon() {
    try {
        let trayIconPath = fs.existsSync(iconPath)  iconPath : iconPathAlt;
        let trayIcon = fs.existsSync(trayIconPath)  nativeImage.createFromPath(trayIconPath) : nativeImage.createEmpty();

        tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));
        
        const contextMenu = Menu.buildFromTemplate([
            { label: 'Abrir Aluforce', click: () => { mainWindow.show(); mainWindow.focus(); } },
            { type: 'separator' },
            { label: 'Dashboard', click: () => { mainWindow.show(); navigateTo('/'); } },
            { label: 'PCP', click: () => { mainWindow.show(); navigateTo('/modules/PCP/index.html'); } },
            { label: 'Financeiro', click: () => { mainWindow.show(); navigateTo('/modules/Financeiro/index.html'); } },
            { type: 'separator' },
            { label: 'Sair', click: () => { isQuitting = true; app.quit(); } }
        ]);

        tray.setToolTip(CONFIG.APP_NAME);
        tray.setContextMenu(contextMenu);
        tray.on('double-click', () => { mainWindow.show(); mainWindow.focus(); });
    } catch (error) {
        console.error('Erro ao criar tray:', error);
    }
}

function navigateTo(urlPath) {
    if (mainWindow) mainWindow.loadURL(`http://localhost:${CONFIG.SERVER_PORT}${urlPath}`);
}

function showAboutDialog() {
    dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Sobre Aluforce Sistema',
        message: CONFIG.APP_NAME,
        detail: `Versão: ${CONFIG.APP_VERSION}\n\nSistema de Gestão Empresarial\n\n© 2025 ALUFORCE`
    });
}

function saveWindowState() {
    if (!mainWindow) return;
    const bounds = mainWindow.getBounds();
    try {
        fs.writeFileSync(path.join(app.getPath('userData'), 'window-state.json'), JSON.stringify({ ...bounds, isMaximized: mainWindow.isMaximized() }));
    } catch (e) {}
}

function loadWindowState() {
    try {
        const p = path.join(app.getPath('userData'), 'window-state.json');
        return fs.existsSync(p)  JSON.parse(fs.readFileSync(p, 'utf8')) : {};
    } catch (e) { return {}; }
}

/**
 * Verifica se o servidor está rodando
 */
function checkServerRunning() {
    return new Promise((resolve) => {
        const req = http.get(`http://localhost:${CONFIG.SERVER_PORT}`, () => resolve(true));
        req.on('error', () => resolve(false));
        req.setTimeout(2000, () => { req.destroy(); resolve(false); });
    });
}

/**
 * Aguarda o servidor ficar disponível
 */
function waitForServer(maxAttempts = 30) {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const check = () => {
            attempts++;
            updateSplashStatus(`Aguardando servidor... (${attempts})`);
            
            const req = http.get(`http://localhost:${CONFIG.SERVER_PORT}`, () => resolve());
            req.on('error', () => {
                if (attempts < maxAttempts) setTimeout(check, 500);
                else reject(new Error('Servidor não respondeu'));
            });
            req.setTimeout(1000, () => {
                req.destroy();
                if (attempts < maxAttempts) setTimeout(check, 500);
                else reject(new Error('Timeout'));
            });
        };
        check();
    });
}

/**
 * Inicia o servidor Node.js (embutido no Electron)
 */
async function startServer() {
    const isRunning = await checkServerRunning();
    if (isRunning) {
        console.log('Servidor já está rodando');
        return;
    }
    
    console.log('Iniciando servidor embutido...');
    updateSplashStatus('Iniciando servidor...');
    
    // Detectar se está rodando empacotação ou em desenvolvimento
    const isPackaged = app.isPackaged;
    
    // Usar app.getAppPath() que funciona corretamente com asar
    const appPath = app.getAppPath();
    const serverPath = path.join(appPath, 'server.js');
    
    console.log('App path:', appPath);
    console.log('Server path:', serverPath);
    
    if (!fs.existsSync(serverPath)) {
        throw new Error('Arquivo server.js não encontrado em: ' + serverPath);
    }
    
    return new Promise((resolve, reject) => {
        try {
            // Configurar variáveis de ambiente
            process.env.PORT = CONFIG.SERVER_PORT.toString();
            process.env.NODE_ENV = isPackaged ? 'production' : 'development';
            process.env.APP_BASE_PATH = appPath;
            
            // Carregar e executar o servidor
            require(serverPath);
            
            console.log('Servidor embutido iniciação');
            setTimeout(resolve, 1500);
        } catch (error) {
            console.error('Erro ao iniciar servidor embutido:', error);
            reject(error);
        }
    });
}

function stopServer() {
    // Servidor embutido - não precisa parar manualmente
    console.log('Servidor embutido será encerração com a aplicação');
}

function updateSplashStatus(message) {
    if (splashWindow && !splashWindow.isDestroyed()) {
        try { splashWindow.webContents.send('status-update', message); } catch (e) {}
    }
}

// ==================== INICIALIZAÇÃO ====================

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
        }
    });

    app.whenReady().then(async () => {
        try {
            createSplashWindow();
            updateSplashStatus('Inicializando...');
            await new Promise(r => setTimeout(r, 300));

            updateSplashStatus('Iniciando servidor...');
            await startServer();

            updateSplashStatus('Conectando...');
            try { await waitForServer(20); } catch (e) { console.warn('Aviso:', e.message); }

            updateSplashStatus('Carregando interface...');
            createMainWindow();

        } catch (error) {
            console.error('Erro:', error);
            closeSplash();
            dialog.showErrorBox('Erro ao Iniciar', `Erro: ${error.message}\n\nVerifique se o servidor pode ser iniciação.`);
            app.quit();
        }
    });

    app.on('activate', () => { mainWindow ? mainWindow.show() : createMainWindow(); });
    app.on('window-all-closed', () => { if (process.platform !== 'darwin') { isQuitting = true; app.quit(); } });
    app.on('before-quit', () => { isQuitting = true; saveWindowState(); stopServer(); });
    app.on('quit', () => { stopServer(); if (tray) tray.destroy(); });
}
