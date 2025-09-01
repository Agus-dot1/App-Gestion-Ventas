import { app, BrowserWindow, Menu, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
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
      preload: path.join(__dirname, '../../electron/preload.js')
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
  ipcMain.handle('db:customers:getAll', () => customerOperations.getAll());
  ipcMain.handle('db:customers:getPaginated', (_, page, pageSize, searchTerm) => customerOperations.getPaginated(page, pageSize, searchTerm));
  ipcMain.handle('db:customers:search', (_, searchTerm, limit) => customerOperations.search(searchTerm, limit));
  ipcMain.handle('db:customers:getCount', () => customerOperations.getCount());
  ipcMain.handle('db:customers:getRecent', (_, limit) => customerOperations.getRecent(limit));
  ipcMain.handle('db:customers:getMonthlyComparison', () => customerOperations.getMonthlyComparison());

  // Add IPC handlers for pagination
  ipcMain.handle('db:products:getPaginated', async (event, page: number, pageSize: number, searchTerm: string) => {
    return productOperations.getPaginated(page, pageSize, searchTerm);
  });

  ipcMain.handle('db:products:search', async (event, searchTerm: string, limit?: number) => {
    return productOperations.search(searchTerm, limit);
  });

  ipcMain.handle('db:sales:getPaginated', async (event, page: number, pageSize: number, searchTerm: string) => {
    return saleOperations.getPaginated(page, pageSize, searchTerm);
  });

  ipcMain.handle('db:sales:search', async (event, searchTerm: string, limit?: number) => {
    return saleOperations.search(searchTerm, limit);
  });
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
  ipcMain.handle('db:products:getCount', () => productOperations.getCount());
  ipcMain.handle('db:products:getMonthlyComparison', () => productOperations.getMonthlyComparison());

  // Sale operations
  ipcMain.handle('db:sales:getAll', () => saleOperations.getAll());
  ipcMain.handle('db:sales:getById', (_, id) => saleOperations.getById(id));
  ipcMain.handle('db:sales:getByCustomer', (_, customerId) => saleOperations.getByCustomer(customerId));
  ipcMain.handle('db:sales:create', (_, sale) => saleOperations.create(sale));
  ipcMain.handle('db:sales:update', (_, id, sale) => saleOperations.update(id, sale));
  ipcMain.handle('db:sales:delete', (_, id) => saleOperations.delete(id));
  ipcMain.handle('db:sales:getWithDetails', (_, id) => saleOperations.getWithDetails(id));
  ipcMain.handle('db:sales:getOverdueSales', () => saleOperations.getOverdueSales());
  ipcMain.handle('db:sales:getCount', () => saleOperations.getCount());
  ipcMain.handle('db:sales:getTotalRevenue', () => saleOperations.getTotalRevenue());
  ipcMain.handle('db:sales:getRecent', (_, limit) => saleOperations.getRecent(limit));
  ipcMain.handle('db:sales:getSalesChartData', (_, days) => saleOperations.getSalesChartData(days));
  ipcMain.handle('db:sales:getStatsComparison', () => saleOperations.getStatsComparison());

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
  ipcMain.handle('db:installments:delete', (_, id) => installmentOperations.delete(id));

  // Sale item operations
  ipcMain.handle('db:saleItems:getBySale', (_, saleId) => saleItemOperations.getBySale(saleId));
  ipcMain.handle('db:saleItems:create', (_, saleItem) => saleItemOperations.create(saleItem));

  // Payment operations
  ipcMain.handle('db:payments:getBySale', (_, saleId) => paymentOperations.getBySale(saleId));
  ipcMain.handle('db:payments:getOverdue', () => paymentOperations.getOverdue());
  ipcMain.handle('db:payments:create', (_, payment) => paymentOperations.create(payment));

  // Backup and restore operations
  ipcMain.handle('backup:save', async (_, backupData) => {
    try {
      const result = await dialog.showSaveDialog(mainWindow!, {
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
    } catch (error) {
      console.error('Error saving backup:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  });

  ipcMain.handle('backup:load', async () => {
    try {
      const result = await dialog.showOpenDialog(mainWindow!, {
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
    } catch (error) {
      console.error('Error loading backup:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error al cargar archivo' };
    }
  });

  // Import operations for backup restore
  ipcMain.handle('backup:importCustomers', async (_, customers) => {
    try {
      // Clear existing customers
      const existingCustomers = await customerOperations.getAll();
      for (const customer of existingCustomers) {
        if (customer.id) {
          await customerOperations.delete(customer.id);
        }
      }
      
      // Import new customers
      for (const customer of customers) {
        const { id, ...customerData } = customer;
        await customerOperations.create(customerData);
      }
      return { success: true };
    } catch (error) {
      console.error('Error importing customers:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  });

  ipcMain.handle('backup:importProducts', async (_, products) => {
    try {
      // Clear existing products
      const existingProducts = await productOperations.getAll();
      for (const product of existingProducts) {
        if (product.id) {
          await productOperations.delete(product.id);
        }
      }
      
      // Import new products
      for (const product of products) {
        const { id, ...productData } = product;
        await productOperations.create(productData);
      }
      return { success: true };
    } catch (error) {
      console.error('Error importing products:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  });

  ipcMain.handle('backup:importSales', async (_, sales) => {
    try {
      // Clear existing sales
      const existingSales = await saleOperations.getAll();
      for (const sale of existingSales) {
        if (sale.id) {
          await saleOperations.delete(sale.id);
        }
      }
      
      // Import new sales
      for (const sale of sales) {
        const { id, ...saleData } = sale;
        await saleOperations.create(saleData);
      }
      return { success: true };
    } catch (error) {
      console.error('Error importing sales:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  });

  // Cache management
  ipcMain.handle('cache:getSize', async () => {
    try {
      // Calculate approximate cache size
      const userDataPath = app.getPath('userData');
      const cacheDir = path.join(userDataPath, 'cache');
      
      if (fs.existsSync(cacheDir)) {
        const stats = await fs.promises.stat(cacheDir);
        const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
        return `${sizeInMB} MB`;
      }
      return '0 MB';
    } catch (error) {
      console.error('Error getting cache size:', error);
      return '0 MB';
    }
  });

  ipcMain.handle('cache:clear', async () => {
    try {
      // Clear session cache first (this is safer)
      if (mainWindow && mainWindow.webContents.session) {
        await mainWindow.webContents.session.clearCache();
        await mainWindow.webContents.session.clearStorageData();
      }
      
      // Try to clear file system cache directories
      const userDataPath = app.getPath('userData');
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
        } catch (dirError) {
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
    } catch (error) {
      console.error('Error clearing cache:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  });
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