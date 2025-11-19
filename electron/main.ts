import { app, BrowserWindow, Menu, ipcMain, dialog, shell, Tray, nativeImage, session } from 'electron';
import * as dotenv from 'dotenv';
dotenv.config();
import * as https from 'https';
import * as url from 'url';
// Removed auto-updater imports as update logic is no longer needed
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
  notificationOperations,
  partnerOperations
} from '../lib/database-operations';
import { setupNotificationIpcHandlers } from '../notifications/ipc/handlers';
import { setupNotificationScheduler, checkLowStockAfterSale } from '../notifications/scheduler';
const isDev = process.env.NODE_ENV === 'development';

let mainWindow: Electron.BrowserWindow | null;
let tray: Tray | null = null;
let isQuiting = false;
let notificationsMuted = false;
let openAtLogin = false;



function broadcastDatabaseChange(entity: string, operation: string, payload: any = {}) {
  try {
    mainWindow?.webContents.send('database:changed', { entity, operation, ...payload });
  } catch (e) {


  }
}

function getBaseUrl(): string {
  if (isDev) {
    return process.env.ELECTRON_DEV_URL || 'http://localhost:3001';
  }


  const outDir = path.join(__dirname, '../../../out').replace(/\\/g, '/');
  return `file:///${outDir}`;
}

function navigateTo(route: string) {
  if (!mainWindow) return;
  const base = getBaseUrl();
  const target = isDev ? `${base}${route}` : `${base}${route}`;
  try {
    mainWindow.loadURL(target);
  } catch (e) {
    console.error('Navigation failed:', e);
  }
}

function showAndNavigate(route: string) {
  if (!mainWindow) return;
  if (!mainWindow.isVisible()) {
    mainWindow.show();
  }
  mainWindow.focus();
  navigateTo(route);
}

function toggleMainWindowVisibility() {
  if (!mainWindow) return;
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
}

function resolveTrayIcon(): Electron.NativeImage {


  const candidates: string[] = [


    path.join(process.resourcesPath || '', 'assets', 'tray.ico'),


    path.join(process.cwd(), 'assets', 'tray.ico'),


    path.join(__dirname, '../assets/tray.ico'),


    path.join(__dirname, '../../assets/tray.ico'),


    path.join(process.resourcesPath || '', 'assets', 'icon.ico'),
    path.join(process.cwd(), 'assets', 'icon.ico'),
    path.join(__dirname, '../assets/icon.ico'),
    path.join(__dirname, '../../assets/icon.ico'),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        console.log(`Found tray icon at: ${p}`);
        const img = nativeImage.createFromPath(p);
        if (!img.isEmpty()) return img;
      }
    } catch (err) {
      console.log(`Failed to load tray icon from ${p}:`, err);
    }
  }
  console.log('Using fallback transparent icon');


  const transparent1x1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAOeYw2kAAAAASUVORK5CYII=';
  return nativeImage.createFromDataURL(transparent1x1);
}

function createTray() {
  try {
    const icon = resolveTrayIcon();
    tray = new Tray(icon);
    tray.setToolTip('Gestión de Ventas');

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Abrir aplicación',
        click: () => {
          if (!mainWindow) return;
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
          app.setLoginItemSettings({ openAtLogin });
        },
      },
      { type: 'separator' },
      {
        label: 'Salir',
        click: () => {
          isQuiting = true;
          app.quit();
        },
      },
    ]);

    tray.setContextMenu(contextMenu);


    tray.on('click', () => {
      if (!mainWindow) return;
      mainWindow.show();
      mainWindow.focus();
    });


    tray.on('right-click', () => tray?.popUpContextMenu());
  } catch (e) {
    console.error('Failed to create tray:', e);
  }
}

function createWindow() {


  const preloadCandidates = [
    path.join(process.cwd(), 'electron', 'preload.js'),
    path.join(__dirname, '../preload.js'),
    path.join(__dirname, '../../preload.js')
  ];
  let resolvedPreload = preloadCandidates.find(p => {
    try { return fs.existsSync(p); } catch { return false; }
  });
  if (!resolvedPreload) {
    // fallback to cwd path
    resolvedPreload = path.join(process.cwd(), 'electron', 'preload.js');
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: resolvedPreload
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false,
    autoHideMenuBar: true // hide menu bar by default (prevents it from showing)
  });



  mainWindow.removeMenu();
  mainWindow.setMenuBarVisibility(false);
  mainWindow.setAutoHideMenuBar(false);



  mainWindow.setMinimumSize(800, 600);
  mainWindow.setSize(1200, 800);
  


  if (isDev) {
    const devUrl = process.env.ELECTRON_DEV_URL || 'http://localhost:3001';
    mainWindow.loadURL(devUrl);


    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../../out/index.html'));
  }



  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });



  mainWindow.on('minimize', () => {
    mainWindow?.minimize();
  });
                 


  mainWindow.on('close', (e) => {
    if (!isQuiting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });



  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}



function setupIpcHandlers() {


  ipcMain.handle('customers:getAll', () => customerOperations.getAll());
  ipcMain.handle('customers:getPaginated', (_, page, pageSize, searchTerm) => 
    customerOperations.getPaginated(page, pageSize, searchTerm));
  ipcMain.handle('customers:search', (_, searchTerm, limit) => customerOperations.search(searchTerm, limit));
  ipcMain.handle('customers:getById', (_, id) => customerOperations.getById(id));
  ipcMain.handle('customers:create', (_, customer) => {
    const res = customerOperations.create(customer);
    broadcastDatabaseChange('customers', 'create', { id: res });
    return res;
  });
  ipcMain.handle('customers:update', (_, id, customer) => {
    const res = customerOperations.update(id, customer);
    broadcastDatabaseChange('customers', 'update', { id });
    return res;
  });
  ipcMain.handle('customers:delete', (_, id) => {
    const res = customerOperations.delete(id);
    broadcastDatabaseChange('customers', 'delete', { id });
    return res;
  });
  ipcMain.handle('customers:archive', (_e, id, anonymize) => {
    customerOperations.archive(id, !!anonymize);
    broadcastDatabaseChange('customers', 'archive', { id });
    return true;
  });
  ipcMain.handle('customers:unarchive', (_e, id) => {
    customerOperations.unarchive(id);
    broadcastDatabaseChange('customers', 'unarchive', { id });
    return true;
  });
  ipcMain.handle('customers:getCount', () => customerOperations.getCount());
  ipcMain.handle('customers:getRecent', (_, limit) => customerOperations.getRecent(limit));
  ipcMain.handle('customers:getMonthlyComparison', () => customerOperations.getMonthlyComparison());
  ipcMain.handle('customers:deleteAll', () => customerOperations.deleteAll());



  ipcMain.handle('products:getAll', () => productOperations.getAll());
  ipcMain.handle('products:getPaginated', (_, page, pageSize, searchTerm) => 
    productOperations.getPaginated(page, pageSize, searchTerm));
  ipcMain.handle('products:search', (_, searchTerm, limit) => productOperations.search(searchTerm, limit));
  ipcMain.handle('products:getActive', () => productOperations.getActive());
  ipcMain.handle('products:getById', (_, id) => productOperations.getById(id));
  ipcMain.handle('products:create', (_, product) => {
    const res = productOperations.create(product);
    broadcastDatabaseChange('products', 'create', { id: res });
    return res;
  });
  ipcMain.handle('products:update', (_, id, product) => {
    const res = productOperations.update(id, product);
    broadcastDatabaseChange('products', 'update', { id });
    return res;
  });
  ipcMain.handle('products:delete', (_, id) => {
    const res = productOperations.delete(id);
    broadcastDatabaseChange('products', 'delete', { id });
    return res;
  });
  ipcMain.handle('products:getCount', () => productOperations.getCount());
  ipcMain.handle('products:getMonthlyComparison', () => productOperations.getMonthlyComparison());
  ipcMain.handle('products:deleteAll', () => productOperations.deleteAll());



  ipcMain.handle('partners:getAll', () => partnerOperations.getAll());
  ipcMain.handle('partners:create', (_e, partner) => partnerOperations.create(partner));
  ipcMain.handle('partners:update', (_e, id, partner) => partnerOperations.update(id, partner));
  ipcMain.handle('partners:delete', (_e, id) => partnerOperations.delete(id));



  ipcMain.handle('sales:getAll', () => saleOperations.getAll());
  ipcMain.handle('sales:getPaginated', (_, page, pageSize, searchTerm) => 
    saleOperations.getPaginated(page, pageSize, searchTerm));

  ipcMain.handle('sales:search', (_, searchTerm, limit) => saleOperations.search(searchTerm, limit));
  ipcMain.handle('sales:getById', (_, id) => saleOperations.getById(id));
  ipcMain.handle('sales:getByCustomer', (_, customerId) => saleOperations.getByCustomer(customerId));
  ipcMain.handle('sales:create', async (_, saleData) => {
    const id = await saleOperations.create(saleData);


    checkLowStockAfterSale(saleData, () => mainWindow);
    broadcastDatabaseChange('sales', 'create', { id });
    return id;
  });
  ipcMain.handle('sales:update', (_, id, sale) => {
    const res = saleOperations.update(id, sale);
    broadcastDatabaseChange('sales', 'update', { id });
    return res;
  });
  ipcMain.handle('sales:delete', (_, id) => {
    const res = saleOperations.delete(id);
    broadcastDatabaseChange('sales', 'delete', { id });
    return res;
  });
  ipcMain.handle('sales:getWithDetails', (_, id) => saleOperations.getWithDetails(id));
  ipcMain.handle('sales:getOverdueSales', () => saleOperations.getOverdueSales());
  ipcMain.handle('sales:getOverdueSalesCount', () => saleOperations.getOverdueSalesCount());
  ipcMain.handle('sales:getCount', () => saleOperations.getCount());
  ipcMain.handle('sales:getTotalRevenue', () => saleOperations.getTotalRevenue());
  ipcMain.handle('sales:getRecent', (_, limit) => saleOperations.getRecent(limit));
  ipcMain.handle('sales:getSalesChartData', (_, days) => saleOperations.getSalesChartData(days));
  ipcMain.handle('sales:getStatsComparison', () => saleOperations.getStatsComparison());
  ipcMain.handle('sales:deleteAll', () => saleOperations.deleteAll());



  ipcMain.handle('installments:getBySale', (_, saleId) => installmentOperations.getBySale(saleId));
  ipcMain.handle('installments:getOverdue', () => installmentOperations.getOverdue());
  ipcMain.handle('installments:getUpcoming', (_, limit) => installmentOperations.getUpcoming(limit));
  ipcMain.handle('installments:create', (_, installment) => installmentOperations.create(installment));
  ipcMain.handle('installments:markAsPaid', (_, id, paymentDate) => {
    const result = installmentOperations.markAsPaid(id, paymentDate);
    try {
      if (result && result.rescheduled) {
        broadcastDatabaseChange('installments', 'update', { id: result.rescheduled.nextPendingId });
      } else {
        broadcastDatabaseChange('installments', 'update', { id });
      }
    } catch {}
    return result;
  });
  ipcMain.handle('installments:recordPayment', (_, installmentId, amount, paymentMethod, reference, paymentDate) => {
    const result = installmentOperations.recordPayment(installmentId, amount, paymentMethod, reference, paymentDate);
    try {
      if (result && result.rescheduled) {
        broadcastDatabaseChange('installments', 'update', { id: result.rescheduled.nextPendingId });
      } else {
        broadcastDatabaseChange('installments', 'update', { id: installmentId });
      }
    } catch {}
    return result;
  });
  ipcMain.handle('installments:applyLateFee', (_, installmentId, fee) =>
    installmentOperations.applyLateFee(installmentId, fee));
  ipcMain.handle('installments:revertPayment', (_, installmentId, transactionId) =>
    installmentOperations.revertPayment(installmentId, transactionId));
  ipcMain.handle('installments:update', (_, id, data) => {
    const res = installmentOperations.update(id, data);
    try { broadcastDatabaseChange('installments', 'update', { id }); } catch {}
    return res;
  });
  ipcMain.handle('installments:delete', (_, id) => installmentOperations.delete(id));
  ipcMain.handle('installments:deleteAll', () => installmentOperations.deleteAll());



  ipcMain.handle('saleItems:getBySale', (_, saleId) => saleItemOperations.getBySale(saleId));
ipcMain.handle('saleItems:create', (_, saleItem) => {
  const res = saleItemOperations.create(saleItem);
  broadcastDatabaseChange('saleItems', 'create', { sale_id: saleItem?.sale_id, id: res });
  return res;
});
ipcMain.handle('saleItems:getSalesForProduct', (_, productId) => saleItemOperations.getSalesForProduct(productId));
ipcMain.handle('saleItems:deleteAll', () => saleItemOperations.deleteAll());





  ipcMain.handle('payments:getBySale', (_, saleId) => paymentOperations.getBySale(saleId));
  ipcMain.handle('payments:getOverdue', () => paymentOperations.getOverdue());
  ipcMain.handle('payments:create', (_, payment) => paymentOperations.create(payment));
  ipcMain.handle('payments:deleteAll', () => paymentOperations.deleteAll());







  const coerceNumber = (v: any, fallback = 0) => {
    const n = typeof v === 'string' ? parseFloat(v) : v;
    return Number.isFinite(n) ? Number(n) : fallback;
  };

  const normalizePaymentWindow = (v: any): string | null => {
    if (!v && v !== 0) return null;
    const s = String(v).toLowerCase().trim();
    switch (s) {
      case 'weekly':
      case 'semanal':
      case 'semana':
        return 'weekly';
      case 'biweekly':
      case 'quincenal':
      case 'cada 15 dias':
        return 'biweekly';
      case 'monthly':
      case 'mensual':
        return 'monthly';
      default:
        return s || null;
    }
  };

  const normalizeCustomerBackup = (c: any) => {
    return {
      id: c.id ?? null,
      name: c.name ?? c.full_name ?? c.nombre ?? '',
      dni: c.dni ?? c.identification ?? c.cedula ?? null,
      email: c.email ?? c.correo ?? c.mail ?? null,
      phone: c.phone ?? c.telefono ?? null,
      secondary_phone: c.secondary_phone ?? c.alt_phone ?? c.segundo_telefono ?? null,
      contact_info: c.contact_info ?? c.contact ?? c.telefono ?? '',
      address: c.address ?? c.direccion ?? '',
      payment_window: normalizePaymentWindow(c.payment_window ?? c.payment_period ?? c.periodo_pago ?? null),
      created_at: c.created_at ?? null,
      updated_at: c.updated_at ?? null,
    };
  };

  const normalizeProductBackup = (p: any) => {
    const isActive = typeof p.is_active === 'boolean'
      ? p.is_active
      : typeof p.active === 'boolean'
        ? p.active
        : p.status === 'active' || p.is_active === 1 || p.active === 1;
    return {
      id: p.id ?? null,
      name: p.name ?? p.nombre ?? '',


      price: coerceNumber(p.price ?? p.unit_price ?? p.precio, 0),
      category: p.category ?? p.categoria ?? null,
      description: p.description ?? p.descripcion ?? null,
      cost_price: coerceNumber(p.cost_price ?? p.costo, 0),
      stock: coerceNumber(p.stock ?? p.existencias, 0),
      is_active: !!isActive,
      created_at: p.created_at ?? null,
      updated_at: p.updated_at ?? null,
    };
  };

  const normalizeSaleItemBackup = (si: any) => {
    return {
      product_id: si.product_id ?? si.productId ?? si.product?.id ?? null,
      quantity: coerceNumber(si.quantity ?? si.qty ?? si.cantidad, 0),
      unit_price: coerceNumber(si.unit_price ?? si.price ?? si.precio, 0),
      product_name: si.product_name ?? si.product?.name ?? si.nombre ?? null,
    };
  };

  const normalizeSaleBackup = (s: any) => {
    const paymentType = (s.payment_type ?? s.tipo_pago ?? '').toLowerCase();
    const paymentStatus = (s.payment_status ?? s.estado_pago ?? '').toLowerCase();
    const partnerId = s.partner_id ?? s.partnerId ?? s.partner?.id ?? null;
    const customerId = s.customer_id ?? s.client_id ?? s.customer?.id ?? null;

    const itemsSrc = Array.isArray(s.items)
      ? s.items
      : Array.isArray(s.line_items)
        ? s.line_items
        : Array.isArray(s.products)
          ? s.products
          : [];

    const items = itemsSrc.map(normalizeSaleItemBackup).filter((i: any) => i.product_id || i.product_name);



    const mapPaymentType = (t: string) => {
      if (t === 'cash' || t === 'contado') return 'cash';
      if (t === 'installments' || t === 'cuotas' || t === 'credit') return 'installments';
      if (t === 'mixed') return 'installments';
      return 'cash';
    };
    const mapPaymentStatus = (st: string) => {
      if (st === 'paid' || st === 'pagado') return 'paid';
      if (st === 'unpaid' || st === 'impago' || st === 'pending') return 'unpaid';
      if (st === 'overdue' || st === 'vencido') return 'overdue';
      if (st === 'partial' || st === 'parcial') return 'unpaid';
      return 'paid';
    };

    return {
      customer_id: customerId,
      partner_id: partnerId,
      payment_type: mapPaymentType(paymentType),
      payment_status: mapPaymentStatus(paymentStatus),
      sale_number: s.sale_number ?? s.numero ?? null,
      // Preserve original sale date from backup to avoid resetting to current
      // Accept common field aliases used across exports/backups
      date: s.date ?? s.fecha ?? s.created_at ?? null,
      due_date: s.due_date ?? s.fecha_vencimiento ?? null,
      subtotal: coerceNumber(s.subtotal ?? s.sub_total ?? s.subtotal_amount, 0),
      total_amount: coerceNumber(s.total_amount ?? s.total ?? s.monto_total, 0),
      payment_method: s.payment_method ?? s.metodo_pago ?? null,
      payment_period: s.payment_period ?? s.ventana_pago ?? null,
      period_type: s.period_type ?? s.tipo_periodo ?? null,
      reference_code: s.reference_code ?? s.referencia ?? null,
      number_of_installments: coerceNumber(s.number_of_installments ?? s.installments ?? s.cuotas, 0),
      installment_amount: coerceNumber(s.installment_amount ?? s.monto_cuota, 0),
      first_payment_date: s.first_payment_date ?? s.fecha_primer_pago ?? null,
      notes: s.notes ?? s.nota ?? null,
      items,
    };
  };

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



  ipcMain.handle('backup:importCustomers', async (_, customers) => {
    try {


      const existingCustomers = await customerOperations.getAll();
      for (const customer of existingCustomers) {
        if (customer.id) {
          await customerOperations.delete(customer.id);
        }
      }
      


      for (const customer of customers) {
        const normalized = normalizeCustomerBackup(customer);
        await customerOperations.insertFromBackup(normalized as any);
      }
      return { success: true };
    } catch (error) {
      console.error('Error importing customers:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  });

  ipcMain.handle('backup:importProducts', async (_, products) => {
    try {


      const existingProducts = await productOperations.getAll();
      for (const product of existingProducts) {
        if (product.id) {
          await productOperations.delete(product.id);
        }
      }
      


      for (const product of products) {
        const normalized = normalizeProductBackup(product);
        await productOperations.insertFromBackup(normalized as any);
      }
      return { success: true };
    } catch (error) {
      console.error('Error importing products:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  });

  ipcMain.handle('backup:importSales', async (_, sales) => {
    try {


      const existingSales = await saleOperations.getAll();
      for (const sale of existingSales) {
        if (sale.id) {
          await saleOperations.delete(sale.id);
        }
      }
      


      for (const sale of sales) {
        const normalized = normalizeSaleBackup(sale);
        await saleOperations.importFromBackup(normalized as any);
      }
      return { success: true };
    } catch (error) {
      console.error('Error importing sales:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  });



  ipcMain.handle('cache:getSize', async () => {
    try {


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


      if (mainWindow && mainWindow.webContents.session) {
        await mainWindow.webContents.session.clearCache();
        await mainWindow.webContents.session.clearStorageData();
      }
      


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


          console.warn(`Could not clear cache directory ${cacheDir}:`, dirError);
          errors.push(`${path.basename(cacheDir)}: ${dirError instanceof Error ? dirError.message : 'Unknown error'}`);
        }
      }
      


  const message = errors.length > 0 
    ? `Cache cleared with some warnings: ${errors.join(', ')}`
    : 'Cache cleared successfully';
  
  return { success: true, message };
  } catch (error) {
      console.error('Error clearing cache:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  });



  ipcMain.handle('db:deleteAll', async () => {
    try {


      await saleOperations.deleteAll();
      await customerOperations.deleteAll();
      await productOperations.deleteAll();


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






app.whenReady().then(() => {


  try {
    initializeDatabase();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }



  Menu.setApplicationMenu(null);



  setupIpcHandlers();




  setupNotificationIpcHandlers(() => (notificationsMuted ? null : mainWindow));





  const rawInterval = process.env.NOTIFICATIONS_SCHEDULER_INTERVAL_MS || process.env.NOTIFICATIONS_INTERVAL_MS;
  if (rawInterval) {
    const parsed = parseInt(rawInterval, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      setupNotificationScheduler(() => (notificationsMuted ? null : mainWindow), parsed);
    } else {
  setupNotificationScheduler(() => (notificationsMuted ? null : mainWindow));
    }
  } else {
    setupNotificationScheduler(() => (notificationsMuted ? null : mainWindow));
  }



  session.defaultSession.protocol.interceptBufferProtocol('file', (request, callback) => {
    const url = request.url;
    


    if (url.includes('index.txt') && url.includes('_rsc=')) {
      console.log('Intercepted RSC request:', url);
      


       let rscPath = url.replace('file:///', '');
       rscPath = decodeURIComponent(rscPath);
       


       const [pathOnly] = rscPath.split('?');
       


       const relativePath = pathOnly.replace(/^[A-Za-z]:/, '');
       


       const appPath = path.join(__dirname, '../../../', 'out');
       const fullPath = path.join(appPath, relativePath.replace(/\//g, path.sep));
      
      console.log('Mapped RSC path:', fullPath);
      


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
    


    let filePath = url.replace('file:///', '');


    filePath = decodeURIComponent(filePath);







    const rootPathCandidate = filePath.replace(/^[A-Za-z]:/, '');
    if (rootPathCandidate.startsWith('/_next') || rootPathCandidate.startsWith('/static')) {
      const assetRelative = rootPathCandidate.replace(/^\//, '');
      filePath = path.join(__dirname, '../../../', 'out', assetRelative.replace(/\//g, path.sep));
    }
    






    const hasExtension = path.extname(filePath) !== '';
    const isDirectoryPath = filePath.endsWith('/') || !hasExtension;
    
    if (isDirectoryPath || (!hasExtension && !fs.existsSync(filePath))) {


      const outDir = path.join(__dirname, '../../../', 'out');


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
    




    filePath = filePath.replace(/\//g, path.sep);
    
    console.log('Loading static file:', filePath);
    
    try {


      if (!fs.existsSync(filePath)) {
        callback({ error: -6 }); // net::ERR_FILE_NOT_FOUND
        return;
      }
      


      const fileContent = fs.readFileSync(filePath);
      


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



  try {
    const loginSettings = app.getLoginItemSettings();
    openAtLogin = !!loginSettings.openAtLogin;
  } catch (e) {
    console.warn('Failed to read login item settings:', e);
  }

  createWindow();



  if (process.platform === 'win32' || process.platform === 'darwin') {
    createTray();
  }



  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});



app.on('window-all-closed', () => {




  if (isQuiting) {


    closeDatabase();
    
    if (process.platform !== 'darwin') {
      app.quit();
    }
  }


});



app.on('before-quit', () => {
  closeDatabase();
});



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
ipcMain.handle('show-item-in-folder', async (_event, pathStr: string) => {
  try {
    if (typeof pathStr !== 'string' || pathStr.length === 0) return false;
    shell.showItemInFolder(pathStr);
    return true;
  } catch (err) {
    console.error('show-item-in-folder failed:', err);
    return false;
  }
});
ipcMain.handle('get-downloads-path', async () => {
  try {
    return app.getPath('downloads');
  } catch (err) {
    console.error('get-downloads-path failed:', err);
    return null;
  }
});
ipcMain.handle('open-path', async (_event, pathStr: string) => {
  try {
    if (typeof pathStr !== 'string' || pathStr.length === 0) return false;
    const res = await shell.openPath(pathStr);
    return !res;
  } catch (err) {
    console.error('open-path failed:', err);
    return false;
  }
});
// Auto-updater removed per request
