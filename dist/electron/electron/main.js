"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const database_1 = require("../lib/database");
const database_operations_1 = require("../lib/database-operations");
const handlers_1 = require("../notifications/ipc/handlers");
const scheduler_1 = require("../notifications/scheduler");
const isDev = process.env.NODE_ENV === 'development';
let mainWindow;
let tray = null;
let isQuiting = false;
let notificationsMuted = false;
let openAtLogin = false;
function getBaseUrl() {
    if (isDev) {
        return process.env.ELECTRON_DEV_URL || 'http://localhost:3001';
    }
    // Base file URL pointing to Next.js export directory
    const outDir = path.join(__dirname, '../../../out').replace(/\\/g, '/');
    return `file:///${outDir}`;
}
function navigateTo(route) {
    if (!mainWindow)
        return;
    const base = getBaseUrl();
    const target = isDev ? `${base}${route}` : `${base}${route}`;
    try {
        mainWindow.loadURL(target);
    }
    catch (e) {
        console.error('Navigation failed:', e);
    }
}
function showAndNavigate(route) {
    if (!mainWindow)
        return;
    if (!mainWindow.isVisible()) {
        mainWindow.show();
    }
    mainWindow.focus();
    navigateTo(route);
}
function toggleMainWindowVisibility() {
    if (!mainWindow)
        return;
    if (mainWindow.isVisible()) {
        mainWindow.hide();
    }
    else {
        mainWindow.show();
        mainWindow.focus();
    }
}
function resolveTrayIcon() {
    // Prefer an .ico if present; fall back to tiny transparent PNG
    const candidates = [
        // Packaged resources path (electron-builder extraResources -> resources/assets)
        path.join(process.resourcesPath || '', 'assets', 'tray.ico'),
        // Dev path under repo root
        path.join(process.cwd(), 'assets', 'tray.ico'),
        // Built path alongside main bundle (unpacked dev builds)
        path.join(__dirname, '../assets/tray.ico'),
        // Alternative built path
        path.join(__dirname, '../../assets/tray.ico'),
        // Fallback to app icon if tray.ico is missing
        path.join(process.resourcesPath || '', 'assets', 'icon.ico'),
        path.join(process.cwd(), 'assets', 'icon.ico'),
        path.join(__dirname, '../assets/icon.ico'),
        path.join(__dirname, '../../assets/icon.ico'),
    ];
    for (const p of candidates) {
        try {
            if (fs.existsSync(p)) {
                console.log(`Found tray icon at: ${p}`);
                const img = electron_1.nativeImage.createFromPath(p);
                if (!img.isEmpty())
                    return img;
            }
        }
        catch (err) {
            console.log(`Failed to load tray icon from ${p}:`, err);
        }
    }
    console.log('Using fallback transparent icon');
    // 1x1 transparent PNG as last resort (base64)
    const transparent1x1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAOeYw2kAAAAASUVORK5CYII=';
    return electron_1.nativeImage.createFromDataURL(transparent1x1);
}
function createTray() {
    try {
        const icon = resolveTrayIcon();
        tray = new electron_1.Tray(icon);
        tray.setToolTip('Gestión de Ventas');
        const contextMenu = electron_1.Menu.buildFromTemplate([
            {
                label: 'Abrir aplicación',
                click: () => {
                    if (!mainWindow)
                        return;
                    mainWindow.show();
                    mainWindow.focus();
                },
            },
            { type: 'separator' },
            {
                label: 'Panel',
                click: () => showAndNavigate('/'),
            },
            {
                label: 'Ventas',
                click: () => showAndNavigate('/sales'),
            },
            {
                label: 'Clientes',
                click: () => showAndNavigate('/customers'),
            },
            {
                label: 'Productos',
                click: () => showAndNavigate('/products'),
            },
            {
                label: 'Ajustes',
                click: () => showAndNavigate('/ajustes'),
            },
            { type: 'separator' },
            {
                label: 'Silenciar notificaciones',
                type: 'checkbox',
                checked: notificationsMuted,
                click: (menuItem) => {
                    notificationsMuted = !!menuItem.checked;
                    tray?.setToolTip(notificationsMuted ? 'Gestión de Ventas (silenciado)' : 'Gestión de Ventas');
                },
            },
            {
                label: 'Iniciar al arrancar',
                type: 'checkbox',
                checked: openAtLogin,
                click: (menuItem) => {
                    openAtLogin = !!menuItem.checked;
                    electron_1.app.setLoginItemSettings({ openAtLogin });
                },
            },
            { type: 'separator' },
            {
                label: 'Salir',
                click: () => {
                    isQuiting = true;
                    electron_1.app.quit();
                },
            },
        ]);
        tray.setContextMenu(contextMenu);
        // Left-click shows and focuses the window
        tray.on('click', () => {
            if (!mainWindow)
                return;
            mainWindow.show();
            mainWindow.focus();
        });
        // Right-click shows context menu explicitly (redundant but explicit)
        tray.on('right-click', () => tray?.popUpContextMenu());
    }
    catch (e) {
        console.error('Failed to create tray:', e);
    }
}
function createWindow() {
    // Create the browser window
    mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 1200,
        minHeight: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: isDev
                ? path.join(process.cwd(), 'electron/preload.js')
                : path.join(__dirname, '../preload.js')
        },
        titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
        show: false,
        autoHideMenuBar: true // hide menu bar by default (prevents it from showing)
    });
    // Ensure menu is removed and cannot reappear with Alt
    mainWindow.removeMenu();
    mainWindow.setMenuBarVisibility(false);
    mainWindow.setAutoHideMenuBar(false);
    // Ensure minimum and initial size (safety in case build used old values)
    mainWindow.setMinimumSize(1600, 800);
    mainWindow.setSize(1600, 800);
    // Load the app
    if (isDev) {
        const devUrl = process.env.ELECTRON_DEV_URL || 'http://localhost:3001';
        mainWindow.loadURL(devUrl);
        // Open DevTools in development
        mainWindow.webContents.openDevTools();
    }
    else {
        mainWindow.loadFile(path.join(__dirname, '../../../out/index.html'));
    }
    // Show window when ready to prevent visual flash
    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
    });
    // Hide to tray on minimize (no event object for 'minimize')
    mainWindow.on('minimize', () => {
        mainWindow?.minimize();
    });
    // Hide to tray on close unless quitting via menu
    mainWindow.on('close', (e) => {
        if (!isQuiting) {
            e.preventDefault();
            mainWindow?.hide();
        }
    });
    // Handle window closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
// Set up IPC handlers for database operations
function setupIpcHandlers() {
    // Customer operations
    electron_1.ipcMain.handle('customers:getAll', () => database_operations_1.customerOperations.getAll());
    electron_1.ipcMain.handle('customers:getPaginated', (_, page, pageSize, searchTerm) => database_operations_1.customerOperations.getPaginated(page, pageSize, searchTerm));
    electron_1.ipcMain.handle('customers:search', (_, searchTerm, limit) => database_operations_1.customerOperations.search(searchTerm, limit));
    electron_1.ipcMain.handle('customers:getById', (_, id) => database_operations_1.customerOperations.getById(id));
    electron_1.ipcMain.handle('customers:create', (_, customer) => database_operations_1.customerOperations.create(customer));
    electron_1.ipcMain.handle('customers:update', (_, id, customer) => database_operations_1.customerOperations.update(id, customer));
    electron_1.ipcMain.handle('customers:delete', (_, id) => database_operations_1.customerOperations.delete(id));
    electron_1.ipcMain.handle('customers:getCount', () => database_operations_1.customerOperations.getCount());
    electron_1.ipcMain.handle('customers:getRecent', (_, limit) => database_operations_1.customerOperations.getRecent(limit));
    electron_1.ipcMain.handle('customers:getMonthlyComparison', () => database_operations_1.customerOperations.getMonthlyComparison());
    electron_1.ipcMain.handle('customers:deleteAll', () => database_operations_1.customerOperations.deleteAll());
    // Product operations
    electron_1.ipcMain.handle('products:getAll', () => database_operations_1.productOperations.getAll());
    electron_1.ipcMain.handle('products:getPaginated', (_, page, pageSize, searchTerm) => database_operations_1.productOperations.getPaginated(page, pageSize, searchTerm));
    electron_1.ipcMain.handle('products:search', (_, searchTerm, limit) => database_operations_1.productOperations.search(searchTerm, limit));
    electron_1.ipcMain.handle('products:getActive', () => database_operations_1.productOperations.getActive());
    electron_1.ipcMain.handle('products:getById', (_, id) => database_operations_1.productOperations.getById(id));
    electron_1.ipcMain.handle('products:create', (_, product) => database_operations_1.productOperations.create(product));
    electron_1.ipcMain.handle('products:update', (_, id, product) => database_operations_1.productOperations.update(id, product));
    electron_1.ipcMain.handle('products:delete', (_, id) => database_operations_1.productOperations.delete(id));
    electron_1.ipcMain.handle('products:getCount', () => database_operations_1.productOperations.getCount());
    electron_1.ipcMain.handle('products:getMonthlyComparison', () => database_operations_1.productOperations.getMonthlyComparison());
    electron_1.ipcMain.handle('products:deleteAll', () => database_operations_1.productOperations.deleteAll());
    // Partner operations
    electron_1.ipcMain.handle('partners:getAll', () => database_operations_1.partnerOperations.getAll());
    electron_1.ipcMain.handle('partners:create', (_e, partner) => database_operations_1.partnerOperations.create(partner));
    electron_1.ipcMain.handle('partners:update', (_e, id, partner) => database_operations_1.partnerOperations.update(id, partner));
    electron_1.ipcMain.handle('partners:delete', (_e, id) => database_operations_1.partnerOperations.delete(id));
    // Sale operations
    electron_1.ipcMain.handle('sales:getAll', () => database_operations_1.saleOperations.getAll());
    electron_1.ipcMain.handle('sales:getPaginated', (_, page, pageSize, searchTerm) => database_operations_1.saleOperations.getPaginated(page, pageSize, searchTerm));
    electron_1.ipcMain.handle('sales:search', (_, searchTerm, limit) => database_operations_1.saleOperations.search(searchTerm, limit));
    electron_1.ipcMain.handle('sales:getById', (_, id) => database_operations_1.saleOperations.getById(id));
    electron_1.ipcMain.handle('sales:getByCustomer', (_, customerId) => database_operations_1.saleOperations.getByCustomer(customerId));
    electron_1.ipcMain.handle('sales:create', async (_, saleData) => {
        const id = await database_operations_1.saleOperations.create(saleData);
        // Centralizado: verificar stock bajo y emitir notificación si corresponde
        (0, scheduler_1.checkLowStockAfterSale)(saleData, () => mainWindow);
        return id;
    });
    electron_1.ipcMain.handle('sales:update', (_, id, sale) => database_operations_1.saleOperations.update(id, sale));
    electron_1.ipcMain.handle('sales:delete', (_, id) => database_operations_1.saleOperations.delete(id));
    electron_1.ipcMain.handle('sales:getWithDetails', (_, id) => database_operations_1.saleOperations.getWithDetails(id));
    electron_1.ipcMain.handle('sales:getOverdueSales', () => database_operations_1.saleOperations.getOverdueSales());
    electron_1.ipcMain.handle('sales:getOverdueSalesCount', () => database_operations_1.saleOperations.getOverdueSalesCount());
    electron_1.ipcMain.handle('sales:getCount', () => database_operations_1.saleOperations.getCount());
    electron_1.ipcMain.handle('sales:getTotalRevenue', () => database_operations_1.saleOperations.getTotalRevenue());
    electron_1.ipcMain.handle('sales:getRecent', (_, limit) => database_operations_1.saleOperations.getRecent(limit));
    electron_1.ipcMain.handle('sales:getSalesChartData', (_, days) => database_operations_1.saleOperations.getSalesChartData(days));
    electron_1.ipcMain.handle('sales:getStatsComparison', () => database_operations_1.saleOperations.getStatsComparison());
    electron_1.ipcMain.handle('sales:deleteAll', () => database_operations_1.saleOperations.deleteAll());
    // Installment operations
    electron_1.ipcMain.handle('installments:getBySale', (_, saleId) => database_operations_1.installmentOperations.getBySale(saleId));
    electron_1.ipcMain.handle('installments:getOverdue', () => database_operations_1.installmentOperations.getOverdue());
    electron_1.ipcMain.handle('installments:getUpcoming', (_, limit) => database_operations_1.installmentOperations.getUpcoming(limit));
    electron_1.ipcMain.handle('installments:create', (_, installment) => database_operations_1.installmentOperations.create(installment));
    electron_1.ipcMain.handle('installments:markAsPaid', (_, id) => database_operations_1.installmentOperations.markAsPaid(id));
    electron_1.ipcMain.handle('installments:recordPayment', (_, installmentId, amount, paymentMethod, reference) => database_operations_1.installmentOperations.recordPayment(installmentId, amount, paymentMethod, reference));
    electron_1.ipcMain.handle('installments:applyLateFee', (_, installmentId, fee) => database_operations_1.installmentOperations.applyLateFee(installmentId, fee));
    electron_1.ipcMain.handle('installments:revertPayment', (_, installmentId, transactionId) => database_operations_1.installmentOperations.revertPayment(installmentId, transactionId));
    electron_1.ipcMain.handle('installments:update', (_, id, data) => database_operations_1.installmentOperations.update(id, data));
    electron_1.ipcMain.handle('installments:delete', (_, id) => database_operations_1.installmentOperations.delete(id));
    electron_1.ipcMain.handle('installments:deleteAll', () => database_operations_1.installmentOperations.deleteAll());
    // Sale item operations
    electron_1.ipcMain.handle('saleItems:getBySale', (_, saleId) => database_operations_1.saleItemOperations.getBySale(saleId));
    electron_1.ipcMain.handle('saleItems:create', (_, saleItem) => database_operations_1.saleItemOperations.create(saleItem));
    electron_1.ipcMain.handle('saleItems:getSalesForProduct', (_, productId) => database_operations_1.saleItemOperations.getSalesForProduct(productId));
    electron_1.ipcMain.handle('saleItems:deleteAll', () => database_operations_1.saleItemOperations.deleteAll());
    // Payment operations
    electron_1.ipcMain.handle('payments:getBySale', (_, saleId) => database_operations_1.paymentOperations.getBySale(saleId));
    electron_1.ipcMain.handle('payments:getOverdue', () => database_operations_1.paymentOperations.getOverdue());
    electron_1.ipcMain.handle('payments:create', (_, payment) => database_operations_1.paymentOperations.create(payment));
    electron_1.ipcMain.handle('payments:deleteAll', () => database_operations_1.paymentOperations.deleteAll());
    // Notifications operations centralizadas en notifications/ipc/handlers.ts
    // Backup and restore operations
    electron_1.ipcMain.handle('backup:save', async (_, backupData) => {
        try {
            const result = await electron_1.dialog.showSaveDialog(mainWindow, {
                title: 'Guardar Respaldo',
                defaultPath: `respaldo-${new Date().toISOString().split('T')[0]}.json`,
                filters: [
                    { name: 'Archivos de Respaldo', extensions: ['json'] },
                    { name: 'Todos los Archivos', extensions: ['*'] }
                ]
            });
            if (!result.canceled && result.filePath) {
                await fs.promises.writeFile(result.filePath, JSON.stringify(backupData, null, 2), 'utf8');
                return { success: true, filePath: result.filePath };
            }
            return { success: false, error: 'Operación cancelada' };
        }
        catch (error) {
            console.error('Error saving backup:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
        }
    });
    electron_1.ipcMain.handle('backup:load', async () => {
        try {
            const result = await electron_1.dialog.showOpenDialog(mainWindow, {
                title: 'Cargar Respaldo',
                filters: [
                    { name: 'Archivos de Respaldo', extensions: ['json'] },
                    { name: 'Todos los Archivos', extensions: ['*'] }
                ],
                properties: ['openFile']
            });
            if (!result.canceled && result.filePaths.length > 0) {
                const filePath = result.filePaths[0];
                const fileContent = await fs.promises.readFile(filePath, 'utf8');
                const backupData = JSON.parse(fileContent);
                return { success: true, data: backupData };
            }
            return { success: false, error: 'Operación cancelada' };
        }
        catch (error) {
            console.error('Error loading backup:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Error al cargar archivo' };
        }
    });
    // Import operations for backup restore
    electron_1.ipcMain.handle('backup:importCustomers', async (_, customers) => {
        try {
            // Clear existing customers
            const existingCustomers = await database_operations_1.customerOperations.getAll();
            for (const customer of existingCustomers) {
                if (customer.id) {
                    await database_operations_1.customerOperations.delete(customer.id);
                }
            }
            // Import new customers
            for (const customer of customers) {
                await database_operations_1.customerOperations.insertFromBackup(customer);
            }
            return { success: true };
        }
        catch (error) {
            console.error('Error importing customers:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
        }
    });
    electron_1.ipcMain.handle('backup:importProducts', async (_, products) => {
        try {
            // Clear existing products
            const existingProducts = await database_operations_1.productOperations.getAll();
            for (const product of existingProducts) {
                if (product.id) {
                    await database_operations_1.productOperations.delete(product.id);
                }
            }
            // Import new products
            for (const product of products) {
                await database_operations_1.productOperations.insertFromBackup(product);
            }
            return { success: true };
        }
        catch (error) {
            console.error('Error importing products:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
        }
    });
    electron_1.ipcMain.handle('backup:importSales', async (_, sales) => {
        try {
            // Clear existing sales
            const existingSales = await database_operations_1.saleOperations.getAll();
            for (const sale of existingSales) {
                if (sale.id) {
                    await database_operations_1.saleOperations.delete(sale.id);
                }
            }
            // Import new sales using a tolerant import that doesn’t require items
            for (const sale of sales) {
                const { id, ...saleData } = sale;
                await database_operations_1.saleOperations.importFromBackup(saleData);
            }
            return { success: true };
        }
        catch (error) {
            console.error('Error importing sales:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
        }
    });
    // Cache management
    electron_1.ipcMain.handle('cache:getSize', async () => {
        try {
            // Calculate approximate cache size
            const userDataPath = electron_1.app.getPath('userData');
            const cacheDir = path.join(userDataPath, 'cache');
            if (fs.existsSync(cacheDir)) {
                const stats = await fs.promises.stat(cacheDir);
                const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
                return `${sizeInMB} MB`;
            }
            return '0 MB';
        }
        catch (error) {
            console.error('Error getting cache size:', error);
            return '0 MB';
        }
    });
    electron_1.ipcMain.handle('cache:clear', async () => {
        try {
            // Clear session cache first (this is safer)
            if (mainWindow && mainWindow.webContents.session) {
                await mainWindow.webContents.session.clearCache();
                await mainWindow.webContents.session.clearStorageData();
            }
            // Try to clear file system cache directories
            const userDataPath = electron_1.app.getPath('userData');
            const cacheDirectories = [
                path.join(userDataPath, 'cache'),
                path.join(userDataPath, 'Cache'),
                path.join(userDataPath, 'GPUCache'),
                path.join(userDataPath, 'Code Cache')
            ];
            const errors = [];
            for (const cacheDir of cacheDirectories) {
                try {
                    if (fs.existsSync(cacheDir)) {
                        await fs.promises.rm(cacheDir, { recursive: true, force: true });
                    }
                }
                catch (dirError) {
                    // Log individual directory errors but don't fail the entire operation
                    console.warn(`Could not clear cache directory ${cacheDir}:`, dirError);
                    errors.push(`${path.basename(cacheDir)}: ${dirError instanceof Error ? dirError.message : 'Unknown error'}`);
                }
            }
            // Return success even if some directories couldn't be cleared
            const message = errors.length > 0
                ? `Cache cleared with some warnings: ${errors.join(', ')}`
                : 'Cache cleared successfully';
            return { success: true, message };
        }
        catch (error) {
            console.error('Error clearing cache:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
        }
    });
    // Database deletion handler
    electron_1.ipcMain.handle('db:deleteAll', async () => {
        try {
            // Clear all tables in FK-safe order
            await database_operations_1.saleOperations.deleteAll();
            await database_operations_1.customerOperations.deleteAll();
            await database_operations_1.productOperations.deleteAll();
            // The following are cascaded by sales but safe to run
            await database_operations_1.installmentOperations.deleteAll();
            await database_operations_1.saleItemOperations.deleteAll();
            await database_operations_1.paymentOperations.deleteAll();
            return { success: true, message: 'Base de datos eliminada exitosamente' };
        }
        catch (error) {
            console.error('Error deleting database:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
        }
    });
}
// setupScheduler deprecated: use centralized notifications scheduler in notifications/scheduler.ts
// This method will be called when Electron has finished initialization
electron_1.app.whenReady().then(() => {
    // Initialize the database
    try {
        (0, database_1.initializeDatabase)();
        console.log('Database initialized successfully');
    }
    catch (error) {
        console.error('Failed to initialize database:', error);
    }
    // Remove the application menu globally so the top menu bar is not shown
    electron_1.Menu.setApplicationMenu(null);
    // Set up IPC handlers
    setupIpcHandlers();
    // Centralizar IPC de notificaciones
    // Respetar silencio: si está silenciado, no emitimos eventos al renderer
    (0, handlers_1.setupNotificationIpcHandlers)(() => (notificationsMuted ? null : mainWindow));
    // Start background scheduler for notifications (centralizado)
    // Permitir configurar el intervalo vía variable de entorno sin cambiar defaults
    const rawInterval = process.env.NOTIFICATIONS_SCHEDULER_INTERVAL_MS || process.env.NOTIFICATIONS_INTERVAL_MS;
    if (rawInterval) {
        const parsed = parseInt(rawInterval, 10);
        if (!Number.isNaN(parsed) && parsed > 0) {
            (0, scheduler_1.setupNotificationScheduler)(() => (notificationsMuted ? null : mainWindow), parsed);
        }
        else {
            (0, scheduler_1.setupNotificationScheduler)(() => (notificationsMuted ? null : mainWindow));
        }
    }
    else {
        (0, scheduler_1.setupNotificationScheduler)(() => (notificationsMuted ? null : mainWindow));
    }
    // Register protocol handler globally before creating windows
    const { session } = require('electron');
    session.defaultSession.protocol.interceptBufferProtocol('file', (request, callback) => {
        const url = request.url;
        // Check if this is an RSC payload request
        if (url.includes('index.txt') && url.includes('_rsc=')) {
            console.log('Intercepted RSC request:', url);
            // Map RSC requests to the correct path within the app directory
            let rscPath = url.replace('file:///', '');
            rscPath = decodeURIComponent(rscPath);
            // Remove query parameters for file path
            const [pathOnly] = rscPath.split('?');
            // Remove drive letter and colon (e.g., "D:/index.txt" -> "/index.txt")
            const relativePath = pathOnly.replace(/^[A-Za-z]:/, '');
            // Map to the correct location in the out directory
            const appPath = path.join(__dirname, '../../../', 'out');
            const fullPath = path.join(appPath, relativePath.replace(/\//g, path.sep));
            console.log('Mapped RSC path:', fullPath);
            // Check if the RSC file exists, if not return empty response
            if (fs.existsSync(fullPath)) {
                try {
                    const rscContent = fs.readFileSync(fullPath);
                    callback({
                        statusCode: 200,
                        headers: {
                            'Content-Type': 'text/plain',
                            'Access-Control-Allow-Origin': '*'
                        },
                        data: rscContent
                    });
                    return;
                }
                catch (error) {
                    console.log('Error reading RSC file:', error);
                }
            }
            // Return empty response for RSC requests if file doesn't exist
            callback({
                statusCode: 200,
                headers: {
                    'Content-Type': 'text/plain',
                    'Access-Control-Allow-Origin': '*'
                },
                data: Buffer.from('')
            });
            return;
        }
        // Convert file:// URL to local path
        let filePath = url.replace('file:///', '');
        // Handle URL encoding
        filePath = decodeURIComponent(filePath);
        // Map absolute-root asset paths to the export folder.
        // In Windows, root-relative URLs resolve like "D:/_next/static/...".
        // Strip any drive letter before testing.
        const rootPathCandidate = filePath.replace(/^[A-Za-z]:/, '');
        if (rootPathCandidate.startsWith('/_next') || rootPathCandidate.startsWith('/static')) {
            const assetRelative = rootPathCandidate.replace(/^\//, '');
            filePath = path.join(__dirname, '../../../', 'out', assetRelative.replace(/\//g, path.sep));
        }
        // Check if this is a navigation request (trying to access a route directory)
        // If the path doesn't have a file extension and doesn't exist as a file,
        // redirect to index.html to let Next.js handle routing
        const hasExtension = path.extname(filePath) !== '';
        const isDirectoryPath = filePath.endsWith('/') || !hasExtension;
        if (isDirectoryPath || (!hasExtension && !fs.existsSync(filePath))) {
            // Try to serve a route-specific index.html from the exported out directory
            const outDir = path.join(__dirname, '../../../', 'out');
            // Derive route from rootPathCandidate (e.g., "/ajustes" -> "ajustes/index.html")
            let routeRelative = rootPathCandidate.replace(/^\//, '').replace(/\/$/, '');
            const candidateRouteIndex = routeRelative
                ? path.join(outDir, routeRelative, 'index.html')
                : path.join(outDir, 'index.html');
            const fallbackIndex = path.join(outDir, 'index.html');
            const indexToServe = fs.existsSync(candidateRouteIndex) ? candidateRouteIndex : fallbackIndex;
            console.log('Navigation request detected, serving index for:', url, '->', indexToServe);
            try {
                const indexContent = fs.readFileSync(indexToServe);
                callback({
                    mimeType: 'text/html',
                    data: indexContent
                });
                return;
            }
            catch (error) {
                console.error('Error serving route index.html:', error);
            }
        }
        // For static file requests, read from filesystem
        // Convert forward slashes to backslashes on Windows
        filePath = filePath.replace(/\//g, path.sep);
        console.log('Loading static file:', filePath);
        try {
            // Check if file exists
            if (!fs.existsSync(filePath)) {
                callback({ error: -6 }); // net::ERR_FILE_NOT_FOUND
                return;
            }
            // Read file content
            const fileContent = fs.readFileSync(filePath);
            // Determine MIME type based on file extension
            const ext = path.extname(filePath).toLowerCase();
            let mimeType = 'application/octet-stream';
            switch (ext) {
                case '.html':
                    mimeType = 'text/html';
                    break;
                case '.css':
                    mimeType = 'text/css';
                    break;
                case '.js':
                    mimeType = 'application/javascript';
                    break;
                case '.json':
                    mimeType = 'application/json';
                    break;
                case '.png':
                    mimeType = 'image/png';
                    break;
                case '.jpg':
                case '.jpeg':
                    mimeType = 'image/jpeg';
                    break;
                case '.gif':
                    mimeType = 'image/gif';
                    break;
                case '.svg':
                    mimeType = 'image/svg+xml';
                    break;
                case '.ico':
                    mimeType = 'image/x-icon';
                    break;
                case '.woff':
                case '.woff2':
                    mimeType = 'font/woff2';
                    break;
                case '.ttf':
                    mimeType = 'font/ttf';
                    break;
                case '.eot':
                    mimeType = 'application/vnd.ms-fontobject';
                    break;
            }
            callback({
                mimeType: mimeType,
                data: fileContent
            });
        }
        catch (error) {
            console.error('Error reading file:', filePath, error);
            callback({ error: -2 }); // net::ERR_FAILED
        }
    });
    // Sync Start-at-Login initial state
    try {
        const loginSettings = electron_1.app.getLoginItemSettings();
        openAtLogin = !!loginSettings.openAtLogin;
    }
    catch (e) {
        console.warn('Failed to read login item settings:', e);
    }
    createWindow();
    // Create system tray (Windows-focused behavior)
    if (process.platform === 'win32' || process.platform === 'darwin') {
        createTray();
    }
    // On macOS, re-create window when dock icon is clicked
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
// Quit when all windows are closed
electron_1.app.on('window-all-closed', () => {
    // On Windows/Linux, keep the app running in the tray unless explicitly quitting
    // Only quit if we're actually quitting (not just hiding to tray)
    if (isQuiting) {
        // Close database connection
        (0, database_1.closeDatabase)();
        if (process.platform !== 'darwin') {
            electron_1.app.quit();
        }
    }
    // If not quitting, keep the app alive in the tray
});
// Close database when app is quitting
electron_1.app.on('before-quit', () => {
    (0, database_1.closeDatabase)();
});
// Security: Prevent new window creation
electron_1.app.on('web-contents-created', (event, contents) => {
    contents.setWindowOpenHandler(() => {
        return { action: 'deny' };
    });
});
electron_1.ipcMain.handle('open-external', async (_event, url) => {
    try {
        await electron_1.shell.openExternal(url);
        return true;
    }
    catch (err) {
        console.error('open-external failed:', err);
        return false;
    }
});
//# sourceMappingURL=main.js.map