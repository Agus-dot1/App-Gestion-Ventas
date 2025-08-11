import { app, BrowserWindow, Menu, ipcMain } from 'electron';
import * as path from 'path';
import { initializeDatabase, closeDatabase } from '../lib/database';
import {
  customerOperations,
  productOperations,
  saleOperations,
  installmentOperations,
  saleItemOperations,
  paymentOperations
} from '../lib/database-operations';
const isDev = process.env.NODE_ENV === 'development';

let mainWindow: Electron.BrowserWindow | null;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
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
  } else {
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
  ipcMain.handle('db:customers:getAll', () => customerOperations.getAll());
  ipcMain.handle('db:customers:getById', (_, id) => customerOperations.getById(id));
  ipcMain.handle('db:customers:create', (_, customer) => customerOperations.create(customer));
  ipcMain.handle('db:customers:update', (_, id, customer) => customerOperations.update(id, customer));
  ipcMain.handle('db:customers:delete', (_, id) => customerOperations.delete(id));

  // Product operations
  ipcMain.handle('db:products:getAll', () => productOperations.getAll());
  ipcMain.handle('db:products:getActive', () => productOperations.getActive());
  ipcMain.handle('db:products:getById', (_, id) => productOperations.getById(id));
  ipcMain.handle('db:products:create', (_, product) => productOperations.create(product));
  ipcMain.handle('db:products:update', (_, id, product) => productOperations.update(id, product));
  ipcMain.handle('db:products:delete', (_, id) => productOperations.delete(id));

  // Sale operations
  ipcMain.handle('db:sales:getAll', () => saleOperations.getAll());
  ipcMain.handle('db:sales:getById', (_, id) => saleOperations.getById(id));
  ipcMain.handle('db:sales:getByCustomer', (_, customerId) => saleOperations.getByCustomer(customerId));
  ipcMain.handle('db:sales:create', (_, sale) => saleOperations.create(sale));
  ipcMain.handle('db:sales:update', (_, id, sale) => saleOperations.update(id, sale));
  ipcMain.handle('db:sales:delete', (_, id) => saleOperations.delete(id));
  ipcMain.handle('db:sales:getWithDetails', (_, id) => saleOperations.getWithDetails(id));
  ipcMain.handle('db:sales:getOverdueSales', () => saleOperations.getOverdueSales());

  // Installment operations
  ipcMain.handle('db:installments:getBySale', (_, saleId) => installmentOperations.getBySale(saleId));
  ipcMain.handle('db:installments:getOverdue', () => installmentOperations.getOverdue());
  ipcMain.handle('db:installments:create', (_, installment) => installmentOperations.create(installment));
  ipcMain.handle('db:installments:markAsPaid', (_, id) => installmentOperations.markAsPaid(id));
  ipcMain.handle('db:installments:recordPayment', (_, installmentId, amount, paymentMethod, reference) =>
    installmentOperations.recordPayment(installmentId, amount, paymentMethod, reference));
  ipcMain.handle('db:installments:applyLateFee', (_, installmentId, fee) =>
    installmentOperations.applyLateFee(installmentId, fee));
ipcMain.handle('db:installments:revertPayment', (_, installmentId, transactionId) =>
    installmentOperations.revertPayment(installmentId, transactionId));

  // Sale item operations
  ipcMain.handle('db:saleItems:getBySale', (_, saleId) => saleItemOperations.getBySale(saleId));
  ipcMain.handle('db:saleItems:create', (_, saleItem) => saleItemOperations.create(saleItem));

  // Payment operations
  ipcMain.handle('db:payments:getBySale', (_, saleId) => paymentOperations.getBySale(saleId));
  ipcMain.handle('db:payments:getOverdue', () => paymentOperations.getOverdue());
  ipcMain.handle('db:payments:create', (_, payment) => paymentOperations.create(payment));
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  // Initialize the database
  try {
    initializeDatabase();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }

  // Set up IPC handlers
  setupIpcHandlers();

  createWindow();

  // On macOS, re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // Close database connection
  closeDatabase();
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Close database when app is quitting
app.on('before-quit', () => {
  closeDatabase();
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });
});