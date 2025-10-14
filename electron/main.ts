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
      preload: isDev 
        ? path.join(__dirname, '../preload.js')
        : path.join(__dirname, '../preload.js')
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:3001');
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
  ipcMain.handle('customers:getAll', () => customerOperations.getAll());
  ipcMain.handle('customers:getPaginated', (_, page, pageSize, searchTerm) => 
    customerOperations.getPaginated(page, pageSize, searchTerm));
  ipcMain.handle('customers:search', (_, searchTerm, limit) => customerOperations.search(searchTerm, limit));
  ipcMain.handle('customers:getById', (_, id) => customerOperations.getById(id));
  ipcMain.handle('customers:create', (_, customer) => customerOperations.create(customer));
  ipcMain.handle('customers:update', (_, id, customer) => customerOperations.update(id, customer));
  ipcMain.handle('customers:delete', (_, id) => customerOperations.delete(id));
  ipcMain.handle('customers:getCount', () => customerOperations.getCount());
  ipcMain.handle('customers:getRecent', (_, limit) => customerOperations.getRecent(limit));
  ipcMain.handle('customers:getMonthlyComparison', () => customerOperations.getMonthlyComparison());
  ipcMain.handle('customers:deleteAll', () => customerOperations.deleteAll());

  // Product operations
  ipcMain.handle('products:getAll', () => productOperations.getAll());
  ipcMain.handle('products:getPaginated', (_, page, pageSize, searchTerm) => 
    productOperations.getPaginated(page, pageSize, searchTerm));
  ipcMain.handle('products:search', (_, searchTerm, limit) => productOperations.search(searchTerm, limit));
  ipcMain.handle('products:getActive', () => productOperations.getActive());
  ipcMain.handle('products:getById', (_, id) => productOperations.getById(id));
  ipcMain.handle('products:create', (_, product) => productOperations.create(product));
  ipcMain.handle('products:update', (_, id, product) => productOperations.update(id, product));
  ipcMain.handle('products:delete', (_, id) => productOperations.delete(id));
  ipcMain.handle('products:getCount', () => productOperations.getCount());
  ipcMain.handle('products:getMonthlyComparison', () => productOperations.getMonthlyComparison());
  ipcMain.handle('products:deleteAll', () => productOperations.deleteAll());

  // Sale operations
  ipcMain.handle('sales:getAll', () => saleOperations.getAll());
  ipcMain.handle('sales:getPaginated', (_, page, pageSize, searchTerm) => 
    saleOperations.getPaginated(page, pageSize, searchTerm));
  ipcMain.handle('sales:search', (_, searchTerm, limit) => saleOperations.search(searchTerm, limit));
  ipcMain.handle('sales:getById', (_, id) => saleOperations.getById(id));
  ipcMain.handle('sales:getByCustomer', (_, customerId) => saleOperations.getByCustomer(customerId));
  ipcMain.handle('sales:create', (_, saleData) => saleOperations.create(saleData));
  ipcMain.handle('sales:update', (_, id, sale) => saleOperations.update(id, sale));
  ipcMain.handle('sales:delete', (_, id) => saleOperations.delete(id));
  ipcMain.handle('sales:getWithDetails', (_, id) => saleOperations.getWithDetails(id));
  ipcMain.handle('sales:getOverdueSales', () => saleOperations.getOverdueSales());
  ipcMain.handle('sales:getOverdueSalesCount', () => saleOperations.getOverdueSalesCount());
  ipcMain.handle('sales:getCount', () => saleOperations.getCount());
  ipcMain.handle('sales:getTotalRevenue', () => saleOperations.getTotalRevenue());
  ipcMain.handle('sales:getRecent', (_, limit) => saleOperations.getRecent(limit));
  ipcMain.handle('sales:getSalesChartData', (_, days) => saleOperations.getSalesChartData(days));
  ipcMain.handle('sales:getStatsComparison', () => saleOperations.getStatsComparison());
  ipcMain.handle('sales:deleteAll', () => saleOperations.deleteAll());

  // Installment operations
  ipcMain.handle('installments:getBySale', (_, saleId) => installmentOperations.getBySale(saleId));
  ipcMain.handle('installments:getOverdue', () => installmentOperations.getOverdue());
  ipcMain.handle('installments:getUpcoming', (_, limit) => installmentOperations.getUpcoming(limit));
  ipcMain.handle('installments:create', (_, installment) => installmentOperations.create(installment));
  ipcMain.handle('installments:markAsPaid', (_, id) => installmentOperations.markAsPaid(id));
  ipcMain.handle('installments:recordPayment', (_, installmentId, amount, paymentMethod, reference) =>
    installmentOperations.recordPayment(installmentId, amount, paymentMethod, reference));
  ipcMain.handle('installments:applyLateFee', (_, installmentId, fee) =>
    installmentOperations.applyLateFee(installmentId, fee));
  ipcMain.handle('installments:revertPayment', (_, installmentId, transactionId) =>
    installmentOperations.revertPayment(installmentId, transactionId));
  ipcMain.handle('installments:delete', (_, id) => installmentOperations.delete(id));
  ipcMain.handle('installments:deleteAll', () => installmentOperations.deleteAll());

  // Sale item operations
  ipcMain.handle('saleItems:getBySale', (_, saleId) => saleItemOperations.getBySale(saleId));
  ipcMain.handle('saleItems:create', (_, saleItem) => saleItemOperations.create(saleItem));
  ipcMain.handle('saleItems:deleteAll', () => saleItemOperations.deleteAll());

  // Payment operations
  ipcMain.handle('payments:getBySale', (_, saleId) => paymentOperations.getBySale(saleId));
  ipcMain.handle('payments:getOverdue', () => paymentOperations.getOverdue());
  ipcMain.handle('payments:create', (_, payment) => paymentOperations.create(payment));
  ipcMain.handle('payments:deleteAll', () => paymentOperations.deleteAll());

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

  // Database deletion handler
  ipcMain.handle('db:deleteAll', async () => {
    try {
      // Clear all tables
      await customerOperations.deleteAll();
      await productOperations.deleteAll();
      await saleOperations.deleteAll();
      await installmentOperations.deleteAll();
      await saleItemOperations.deleteAll();
      await paymentOperations.deleteAll();
      
      return { success: true, message: 'Base de datos eliminada exitosamente' };
    } catch (error) {
      console.error('Error deleting database:', error);
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
        } catch (error) {
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
      } catch (error) {
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
    } catch (error) {
      console.error('Error reading file:', filePath, error);
      callback({ error: -2 }); // net::ERR_FAILED
    }
  });

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