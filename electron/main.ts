import { app, BrowserWindow, Menu, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { initializeDatabase, closeDatabase } from '../lib/database';
import {
  customerOperations,
  productOperations,
  saleOperations,
  installmentOperations,
  saleItemOperations,
  paymentOperations,
  notificationOperations
} from '../lib/database-operations';
import { setupNotificationIpcHandlers } from '../notifications/ipc/handlers';
import { setupNotificationScheduler, checkLowStockAfterSale } from '../notifications/scheduler';
const isDev = process.env.NODE_ENV === 'development';

let mainWindow: Electron.BrowserWindow | null;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
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
  ipcMain.handle('sales:create', async (_, saleData) => {
    const id = await saleOperations.create(saleData);
    // Centralizado: verificar stock bajo y emitir notificación si corresponde
    checkLowStockAfterSale(saleData, () => mainWindow);
    return id;
  });
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
  ipcMain.handle('installments:update', (_, id, data) => installmentOperations.update(id, data));
  ipcMain.handle('installments:delete', (_, id) => installmentOperations.delete(id));
  ipcMain.handle('installments:deleteAll', () => installmentOperations.deleteAll());

  // Sale item operations
  ipcMain.handle('saleItems:getBySale', (_, saleId) => saleItemOperations.getBySale(saleId));
ipcMain.handle('saleItems:create', (_, saleItem) => saleItemOperations.create(saleItem));
ipcMain.handle('saleItems:getSalesForProduct', (_, productId) => saleItemOperations.getSalesForProduct(productId));
ipcMain.handle('saleItems:deleteAll', () => saleItemOperations.deleteAll());



  // Payment operations
  ipcMain.handle('payments:getBySale', (_, saleId) => paymentOperations.getBySale(saleId));
  ipcMain.handle('payments:getOverdue', () => paymentOperations.getOverdue());
  ipcMain.handle('payments:create', (_, payment) => paymentOperations.create(payment));
  ipcMain.handle('payments:deleteAll', () => paymentOperations.deleteAll());

  // Notifications operations centralizadas en notifications/ipc/handlers.ts
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
        await customerOperations.insertFromBackup(customer);
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
        await productOperations.insertFromBackup(product);
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
      
      // Import new sales using a tolerant import that doesn’t require items
      for (const sale of sales) {
        const { id, ...saleData } = sale;
        await saleOperations.importFromBackup(saleData as any);
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
      // Clear all tables in FK-safe order
      await saleOperations.deleteAll();
      await customerOperations.deleteAll();
      await productOperations.deleteAll();
      // The following are cascaded by sales but safe to run
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

// setupScheduler deprecated: use centralized notifications scheduler in notifications/scheduler.ts

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  // Initialize the database
  try {
    initializeDatabase();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }

  // Remove the application menu globally so the top menu bar is not shown
  Menu.setApplicationMenu(null);

  // Set up IPC handlers
  setupIpcHandlers();
  // Centralizar IPC de notificaciones
  setupNotificationIpcHandlers(() => mainWindow);

  // Start background scheduler for notifications (centralizado)
  // Permitir configurar el intervalo vía variable de entorno sin cambiar defaults
  const rawInterval = process.env.NOTIFICATIONS_SCHEDULER_INTERVAL_MS || process.env.NOTIFICATIONS_INTERVAL_MS;
  if (rawInterval) {
    const parsed = parseInt(rawInterval, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      setupNotificationScheduler(() => mainWindow, parsed);
    } else {
      setupNotificationScheduler(() => mainWindow);
    }
  } else {
    setupNotificationScheduler(() => mainWindow);
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
      } catch (error) {
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
ipcMain.handle('open-external', async (_event, url: string) => {
  try {
    await shell.openExternal(url);
    return true;
  } catch (err) {
    console.error('open-external failed:', err);
    return false;
  }
});