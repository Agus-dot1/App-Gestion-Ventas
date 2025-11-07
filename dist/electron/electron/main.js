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


function broadcastDatabaseChange(entity, operation, payload = {}) {
    try {
        mainWindow?.webContents.send('database:changed', { entity, operation, ...payload });
    }
    catch (e) {


    }
}
function getBaseUrl() {
    if (isDev) {
        return process.env.ELECTRON_DEV_URL || 'http://localhost:3001';
    }


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


    const candidates = [


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


        tray.on('click', () => {
            if (!mainWindow)
                return;
            mainWindow.show();
            mainWindow.focus();
        });


        tray.on('right-click', () => tray?.popUpContextMenu());
    }
    catch (e) {
        console.error('Failed to create tray:', e);
    }
}
function createWindow() {


    mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
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


    mainWindow.removeMenu();
    mainWindow.setMenuBarVisibility(false);
    mainWindow.setAutoHideMenuBar(false);


    mainWindow.setMinimumSize(800, 600);
    mainWindow.setSize(1200, 800);


    if (isDev) {
        const devUrl = process.env.ELECTRON_DEV_URL || 'http://localhost:3001';
        mainWindow.loadURL(devUrl);


        mainWindow.webContents.openDevTools();
    }
    else {
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


    electron_1.ipcMain.handle('products:getAll', () => database_operations_1.productOperations.getAll());
    electron_1.ipcMain.handle('products:getPaginated', (_, page, pageSize, searchTerm) => database_operations_1.productOperations.getPaginated(page, pageSize, searchTerm));
    electron_1.ipcMain.handle('products:search', (_, searchTerm, limit) => database_operations_1.productOperations.search(searchTerm, limit));
    electron_1.ipcMain.handle('products:getActive', () => database_operations_1.productOperations.getActive());
    electron_1.ipcMain.handle('products:getById', (_, id) => database_operations_1.productOperations.getById(id));
    electron_1.ipcMain.handle('products:create', (_, product) => {
        const res = database_operations_1.productOperations.create(product);
        broadcastDatabaseChange('products', 'create', { id: res });
        return res;
    });
    electron_1.ipcMain.handle('products:update', (_, id, product) => {
        const res = database_operations_1.productOperations.update(id, product);
        broadcastDatabaseChange('products', 'update', { id });
        return res;
    });
    electron_1.ipcMain.handle('products:delete', (_, id) => {
        const res = database_operations_1.productOperations.delete(id);
        broadcastDatabaseChange('products', 'delete', { id });
        return res;
    });
    electron_1.ipcMain.handle('products:getCount', () => database_operations_1.productOperations.getCount());
    electron_1.ipcMain.handle('products:getMonthlyComparison', () => database_operations_1.productOperations.getMonthlyComparison());
    electron_1.ipcMain.handle('products:deleteAll', () => database_operations_1.productOperations.deleteAll());


    electron_1.ipcMain.handle('partners:getAll', () => database_operations_1.partnerOperations.getAll());
    electron_1.ipcMain.handle('partners:create', (_e, partner) => database_operations_1.partnerOperations.create(partner));
    electron_1.ipcMain.handle('partners:update', (_e, id, partner) => database_operations_1.partnerOperations.update(id, partner));
    electron_1.ipcMain.handle('partners:delete', (_e, id) => database_operations_1.partnerOperations.delete(id));


    electron_1.ipcMain.handle('sales:getAll', () => database_operations_1.saleOperations.getAll());
    electron_1.ipcMain.handle('sales:getPaginated', (_, page, pageSize, searchTerm) => database_operations_1.saleOperations.getPaginated(page, pageSize, searchTerm));
    electron_1.ipcMain.handle('sales:search', (_, searchTerm, limit) => database_operations_1.saleOperations.search(searchTerm, limit));
    electron_1.ipcMain.handle('sales:getById', (_, id) => database_operations_1.saleOperations.getById(id));
    electron_1.ipcMain.handle('sales:getByCustomer', (_, customerId) => database_operations_1.saleOperations.getByCustomer(customerId));
    electron_1.ipcMain.handle('sales:create', async (_, saleData) => {
        const id = await database_operations_1.saleOperations.create(saleData);


        (0, scheduler_1.checkLowStockAfterSale)(saleData, () => mainWindow);
        broadcastDatabaseChange('sales', 'create', { id });
        return id;
    });
    electron_1.ipcMain.handle('sales:update', (_, id, sale) => {
        const res = database_operations_1.saleOperations.update(id, sale);
        broadcastDatabaseChange('sales', 'update', { id });
        return res;
    });
    electron_1.ipcMain.handle('sales:delete', (_, id) => {
        const res = database_operations_1.saleOperations.delete(id);
        broadcastDatabaseChange('sales', 'delete', { id });
        return res;
    });
    electron_1.ipcMain.handle('sales:getWithDetails', (_, id) => database_operations_1.saleOperations.getWithDetails(id));
    electron_1.ipcMain.handle('sales:getOverdueSales', () => database_operations_1.saleOperations.getOverdueSales());
    electron_1.ipcMain.handle('sales:getOverdueSalesCount', () => database_operations_1.saleOperations.getOverdueSalesCount());
    electron_1.ipcMain.handle('sales:getCount', () => database_operations_1.saleOperations.getCount());
    electron_1.ipcMain.handle('sales:getTotalRevenue', () => database_operations_1.saleOperations.getTotalRevenue());
    electron_1.ipcMain.handle('sales:getRecent', (_, limit) => database_operations_1.saleOperations.getRecent(limit));
    electron_1.ipcMain.handle('sales:getSalesChartData', (_, days) => database_operations_1.saleOperations.getSalesChartData(days));
    electron_1.ipcMain.handle('sales:getStatsComparison', () => database_operations_1.saleOperations.getStatsComparison());
    electron_1.ipcMain.handle('sales:deleteAll', () => database_operations_1.saleOperations.deleteAll());


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


    electron_1.ipcMain.handle('saleItems:getBySale', (_, saleId) => database_operations_1.saleItemOperations.getBySale(saleId));
    electron_1.ipcMain.handle('saleItems:create', (_, saleItem) => {
        const res = database_operations_1.saleItemOperations.create(saleItem);
        broadcastDatabaseChange('saleItems', 'create', { sale_id: saleItem?.sale_id, id: res });
        return res;
    });
    electron_1.ipcMain.handle('saleItems:getSalesForProduct', (_, productId) => database_operations_1.saleItemOperations.getSalesForProduct(productId));
    electron_1.ipcMain.handle('saleItems:deleteAll', () => database_operations_1.saleItemOperations.deleteAll());


    electron_1.ipcMain.handle('payments:getBySale', (_, saleId) => database_operations_1.paymentOperations.getBySale(saleId));
    electron_1.ipcMain.handle('payments:getOverdue', () => database_operations_1.paymentOperations.getOverdue());
    electron_1.ipcMain.handle('payments:create', (_, payment) => database_operations_1.paymentOperations.create(payment));
    electron_1.ipcMain.handle('payments:deleteAll', () => database_operations_1.paymentOperations.deleteAll());






    const coerceNumber = (v, fallback = 0) => {
        const n = typeof v === 'string' ? parseFloat(v) : v;
        return Number.isFinite(n) ? Number(n) : fallback;
    };
    const normalizePaymentWindow = (v) => {
        if (!v && v !== 0)
            return null;
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
    const normalizeCustomerBackup = (c) => {
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
    const normalizeProductBackup = (p) => {
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
    const normalizeSaleItemBackup = (si) => {
        return {
            product_id: si.product_id ?? si.productId ?? si.product?.id ?? null,
            quantity: coerceNumber(si.quantity ?? si.qty ?? si.cantidad, 0),
            unit_price: coerceNumber(si.unit_price ?? si.price ?? si.precio, 0),
            product_name: si.product_name ?? si.product?.name ?? si.nombre ?? null,
        };
    };
    const normalizeSaleBackup = (s) => {
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
        const items = itemsSrc.map(normalizeSaleItemBackup).filter((i) => i.product_id || i.product_name);


        const mapPaymentType = (t) => {
            if (t === 'cash' || t === 'contado')
                return 'cash';
            if (t === 'installments' || t === 'cuotas' || t === 'credit')
                return 'installments';
            if (t === 'mixed')
                return 'installments';
            return 'cash';
        };
        const mapPaymentStatus = (st) => {
            if (st === 'paid' || st === 'pagado')
                return 'paid';
            if (st === 'unpaid' || st === 'impago' || st === 'pending')
                return 'unpaid';
            if (st === 'overdue' || st === 'vencido')
                return 'overdue';
            if (st === 'partial' || st === 'parcial')
                return 'unpaid';
            return 'paid';
        };
        return {
            customer_id: customerId,
            partner_id: partnerId,
            payment_type: mapPaymentType(paymentType),
            payment_status: mapPaymentStatus(paymentStatus),
            sale_number: s.sale_number ?? s.numero ?? null,
            total_amount: coerceNumber(s.total_amount ?? s.total ?? s.monto_total, 0),
            number_of_installments: coerceNumber(s.number_of_installments ?? s.installments ?? s.cuotas, 0),
            installment_amount: coerceNumber(s.installment_amount ?? s.monto_cuota, 0),
            first_payment_date: s.first_payment_date ?? s.fecha_primer_pago ?? null,
            notes: s.notes ?? s.nota ?? null,
            items,
        };
    };
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


    electron_1.ipcMain.handle('backup:importCustomers', async (_, customers) => {
        try {


            const existingCustomers = await database_operations_1.customerOperations.getAll();
            for (const customer of existingCustomers) {
                if (customer.id) {
                    await database_operations_1.customerOperations.delete(customer.id);
                }
            }


            for (const customer of customers) {
                const normalized = normalizeCustomerBackup(customer);
                await database_operations_1.customerOperations.insertFromBackup(normalized);
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


            const existingProducts = await database_operations_1.productOperations.getAll();
            for (const product of existingProducts) {
                if (product.id) {
                    await database_operations_1.productOperations.delete(product.id);
                }
            }


            for (const product of products) {
                const normalized = normalizeProductBackup(product);
                await database_operations_1.productOperations.insertFromBackup(normalized);
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


            const existingSales = await database_operations_1.saleOperations.getAll();
            for (const sale of existingSales) {
                if (sale.id) {
                    await database_operations_1.saleOperations.delete(sale.id);
                }
            }


            for (const sale of sales) {
                const normalized = normalizeSaleBackup(sale);
                await database_operations_1.saleOperations.importFromBackup(normalized);
            }
            return { success: true };
        }
        catch (error) {
            console.error('Error importing sales:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
        }
    });


    electron_1.ipcMain.handle('cache:getSize', async () => {
        try {


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


            if (mainWindow && mainWindow.webContents.session) {
                await mainWindow.webContents.session.clearCache();
                await mainWindow.webContents.session.clearStorageData();
            }


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


                    console.warn(`Could not clear cache directory ${cacheDir}:`, dirError);
                    errors.push(`${path.basename(cacheDir)}: ${dirError instanceof Error ? dirError.message : 'Unknown error'}`);
                }
            }


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


    electron_1.ipcMain.handle('db:deleteAll', async () => {
        try {


            await database_operations_1.saleOperations.deleteAll();
            await database_operations_1.customerOperations.deleteAll();
            await database_operations_1.productOperations.deleteAll();


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




electron_1.app.whenReady().then(() => {


    try {
        (0, database_1.initializeDatabase)();
        console.log('Database initialized successfully');
    }
    catch (error) {
        console.error('Failed to initialize database:', error);
    }


    electron_1.Menu.setApplicationMenu(null);


    setupIpcHandlers();




    (0, handlers_1.setupNotificationIpcHandlers)(() => (notificationsMuted ? null : mainWindow));




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


    const { session } = require('electron');
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
                }
                catch (error) {
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
            }
            catch (error) {
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
        }
        catch (error) {
            console.error('Error reading file:', filePath, error);
            callback({ error: -2 }); // net::ERR_FAILED
        }
    });


    try {
        const loginSettings = electron_1.app.getLoginItemSettings();
        openAtLogin = !!loginSettings.openAtLogin;
    }
    catch (e) {
        console.warn('Failed to read login item settings:', e);
    }
    createWindow();


    if (process.platform === 'win32' || process.platform === 'darwin') {
        createTray();
    }


    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});


electron_1.app.on('window-all-closed', () => {




    if (isQuiting) {


        (0, database_1.closeDatabase)();
        if (process.platform !== 'darwin') {
            electron_1.app.quit();
        }
    }


});


electron_1.app.on('before-quit', () => {
    (0, database_1.closeDatabase)();
});


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

