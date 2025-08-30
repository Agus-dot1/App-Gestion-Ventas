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
            preload: path.join(__dirname, '../../../electron/preload.js')
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
        mainWindow.loadFile(path.join(__dirname, '../out/index.html'));
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