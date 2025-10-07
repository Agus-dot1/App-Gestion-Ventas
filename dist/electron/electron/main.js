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
const isDev = process.env.NODE_ENV === 'development';
let mainWindow;
function createWindow() {
    // Create the browser window
    mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: isDev
                ? path.join(__dirname, '../preload.js')
                : path.join(__dirname, '../preload.js')
        },
        titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
        show: false
    });
    // Load the app
    if (isDev) {
        mainWindow.loadURL('http://localhost:3000');
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
    // Handle window closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
// Set up IPC handlers for database operations
function setupIpcHandlers() {
    // Customer operations
    electron_1.ipcMain.handle('db:customers:getAll', () => database_operations_1.customerOperations.getAll());
    electron_1.ipcMain.handle('db:customers:getPaginated', (_, page, pageSize, searchTerm) => database_operations_1.customerOperations.getPaginated(page, pageSize, searchTerm));
    electron_1.ipcMain.handle('db:customers:search', (_, searchTerm, limit) => database_operations_1.customerOperations.search(searchTerm, limit));
    electron_1.ipcMain.handle('db:customers:getCount', () => database_operations_1.customerOperations.getCount());
    electron_1.ipcMain.handle('db:customers:getRecent', (_, limit) => database_operations_1.customerOperations.getRecent(limit));
    electron_1.ipcMain.handle('db:customers:getMonthlyComparison', () => database_operations_1.customerOperations.getMonthlyComparison());
    // Add IPC handlers for pagination
    electron_1.ipcMain.handle('db:products:getPaginated', async (event, page, pageSize, searchTerm) => {
        return database_operations_1.productOperations.getPaginated(page, pageSize, searchTerm);
    });
    electron_1.ipcMain.handle('db:products:search', async (event, searchTerm, limit) => {
        return database_operations_1.productOperations.search(searchTerm, limit);
    });
    electron_1.ipcMain.handle('db:sales:getPaginated', async (event, page, pageSize, searchTerm) => {
        return database_operations_1.saleOperations.getPaginated(page, pageSize, searchTerm);
    });
    electron_1.ipcMain.handle('db:sales:search', async (event, searchTerm, limit) => {
        return database_operations_1.saleOperations.search(searchTerm, limit);
    });
    electron_1.ipcMain.handle('db:customers:getById', (_, id) => database_operations_1.customerOperations.getById(id));
    electron_1.ipcMain.handle('db:customers:create', (_, customer) => database_operations_1.customerOperations.create(customer));
    electron_1.ipcMain.handle('db:customers:update', (_, id, customer) => database_operations_1.customerOperations.update(id, customer));
    electron_1.ipcMain.handle('db:customers:delete', (_, id) => database_operations_1.customerOperations.delete(id));
    // Product operations
    electron_1.ipcMain.handle('db:products:getAll', () => database_operations_1.productOperations.getAll());
    electron_1.ipcMain.handle('db:products:getActive', () => database_operations_1.productOperations.getActive());
    electron_1.ipcMain.handle('db:products:getById', (_, id) => database_operations_1.productOperations.getById(id));
    electron_1.ipcMain.handle('db:products:create', (_, product) => database_operations_1.productOperations.create(product));
    electron_1.ipcMain.handle('db:products:update', (_, id, product) => database_operations_1.productOperations.update(id, product));
    electron_1.ipcMain.handle('db:products:delete', (_, id) => database_operations_1.productOperations.delete(id));
    electron_1.ipcMain.handle('db:products:getCount', () => database_operations_1.productOperations.getCount());
    electron_1.ipcMain.handle('db:products:getMonthlyComparison', () => database_operations_1.productOperations.getMonthlyComparison());
    // Sale operations
    electron_1.ipcMain.handle('db:sales:getAll', () => database_operations_1.saleOperations.getAll());
    electron_1.ipcMain.handle('db:sales:getById', (_, id) => database_operations_1.saleOperations.getById(id));
    electron_1.ipcMain.handle('db:sales:getByCustomer', (_, customerId) => database_operations_1.saleOperations.getByCustomer(customerId));
    electron_1.ipcMain.handle('db:sales:create', (_, sale) => database_operations_1.saleOperations.create(sale));
    electron_1.ipcMain.handle('db:sales:update', (_, id, sale) => database_operations_1.saleOperations.update(id, sale));
    electron_1.ipcMain.handle('db:sales:delete', (_, id) => database_operations_1.saleOperations.delete(id));
    electron_1.ipcMain.handle('db:sales:getWithDetails', (_, id) => database_operations_1.saleOperations.getWithDetails(id));
    electron_1.ipcMain.handle('db:sales:getOverdueSales', () => database_operations_1.saleOperations.getOverdueSales());
    electron_1.ipcMain.handle('db:sales:getCount', () => database_operations_1.saleOperations.getCount());
    electron_1.ipcMain.handle('db:sales:getTotalRevenue', () => database_operations_1.saleOperations.getTotalRevenue());
    electron_1.ipcMain.handle('db:sales:getRecent', (_, limit) => database_operations_1.saleOperations.getRecent(limit));
    electron_1.ipcMain.handle('db:sales:getSalesChartData', (_, days) => database_operations_1.saleOperations.getSalesChartData(days));
    electron_1.ipcMain.handle('db:sales:getStatsComparison', () => database_operations_1.saleOperations.getStatsComparison());
    // Installment operations
    electron_1.ipcMain.handle('db:installments:getBySale', (_, saleId) => database_operations_1.installmentOperations.getBySale(saleId));
    electron_1.ipcMain.handle('db:installments:getOverdue', () => database_operations_1.installmentOperations.getOverdue());
    electron_1.ipcMain.handle('db:installments:create', (_, installment) => database_operations_1.installmentOperations.create(installment));
    electron_1.ipcMain.handle('db:installments:markAsPaid', (_, id) => database_operations_1.installmentOperations.markAsPaid(id));
    electron_1.ipcMain.handle('db:installments:recordPayment', (_, installmentId, amount, paymentMethod, reference) => database_operations_1.installmentOperations.recordPayment(installmentId, amount, paymentMethod, reference));
    electron_1.ipcMain.handle('db:installments:applyLateFee', (_, installmentId, fee) => database_operations_1.installmentOperations.applyLateFee(installmentId, fee));
    electron_1.ipcMain.handle('db:installments:revertPayment', (_, installmentId, transactionId) => database_operations_1.installmentOperations.revertPayment(installmentId, transactionId));
    electron_1.ipcMain.handle('db:installments:delete', (_, id) => database_operations_1.installmentOperations.delete(id));
    // Sale item operations
    electron_1.ipcMain.handle('db:saleItems:getBySale', (_, saleId) => database_operations_1.saleItemOperations.getBySale(saleId));
    electron_1.ipcMain.handle('db:saleItems:create', (_, saleItem) => database_operations_1.saleItemOperations.create(saleItem));
    // Payment operations
    electron_1.ipcMain.handle('db:payments:getBySale', (_, saleId) => database_operations_1.paymentOperations.getBySale(saleId));
    electron_1.ipcMain.handle('db:payments:getOverdue', () => database_operations_1.paymentOperations.getOverdue());
    electron_1.ipcMain.handle('db:payments:create', (_, payment) => database_operations_1.paymentOperations.create(payment));
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
                const { id, ...customerData } = customer;
                await database_operations_1.customerOperations.create(customerData);
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
                const { id, ...productData } = product;
                await database_operations_1.productOperations.create(productData);
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
            // Import new sales
            for (const sale of sales) {
                const { id, ...saleData } = sale;
                await database_operations_1.saleOperations.create(saleData);
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
}
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
    // Set up IPC handlers
    setupIpcHandlers();
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
            const appPath = path.join(__dirname, '..', 'out');
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
        // Check if this is a navigation request (trying to access a route directory)
        // If the path doesn't have a file extension and doesn't exist as a file,
        // redirect to index.html to let Next.js handle routing
        const hasExtension = path.extname(filePath) !== '';
        const isDirectoryPath = filePath.endsWith('/') || !hasExtension;
        if (isDirectoryPath || (!hasExtension && !fs.existsSync(filePath))) {
            // This is likely a Next.js route, serve the main index.html
            const indexPath = path.join(__dirname, '..', 'out', 'index.html');
            console.log('Navigation request detected, serving index.html for:', url);
            try {
                if (fs.existsSync(indexPath)) {
                    const indexContent = fs.readFileSync(indexPath);
                    callback({
                        mimeType: 'text/html',
                        data: indexContent
                    });
                    return;
                }
            }
            catch (error) {
                console.error('Error serving index.html:', error);
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
    createWindow();
    // On macOS, re-create window when dock icon is clicked
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
// Quit when all windows are closed
electron_1.app.on('window-all-closed', () => {
    // Close database connection
    (0, database_1.closeDatabase)();
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
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
//# sourceMappingURL=main.js.map