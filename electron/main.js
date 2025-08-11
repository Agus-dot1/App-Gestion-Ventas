const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let db;

// Initialize database
function initializeDatabase() {
  const dbPath = path.join(__dirname, 'database.sqlite');
  db = new Database(dbPath);
  
  // Read and execute schema
  const schemaPath = path.join(__dirname, 'database', 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema);
  }
  
  // Enable foreign keys
  db.pragma('foreign_keys = ON');
  
  console.log('Database initialized');
}
function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: false,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets/icon.png'), // Add your app icon here
    show: false, // Don't show until ready
    titleBarStyle: 'default',
  });

  // Load the app
  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, '../out/index.html')}`;
  
  mainWindow.loadURL(startUrl);

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Open DevTools in development
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
    if (db) {
      db.close();
    }
  });
}

// Database operations
const databaseOperations = {
  customers: {
    getAll: () => {
      return db.prepare('SELECT * FROM customers ORDER BY name').all();
    },
    getById: (id) => {
      return db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    },
    create: (customer) => {
      const stmt = db.prepare('INSERT INTO customers (name, contact_info) VALUES (?, ?)');
      const result = stmt.run(customer.name, customer.contact_info);
      return result.lastInsertRowid;
    },
    update: (id, customer) => {
      const fields = [];
      const values = [];
      
      if (customer.name !== undefined) {
        fields.push('name = ?');
        values.push(customer.name);
      }
      if (customer.contact_info !== undefined) {
        fields.push('contact_info = ?');
        values.push(customer.contact_info);
      }
      
      if (fields.length > 0) {
        values.push(id);
        const stmt = db.prepare(`UPDATE customers SET ${fields.join(', ')} WHERE id = ?`);
        stmt.run(...values);
      }
    },
    delete: (id) => {
      const stmt = db.prepare('DELETE FROM customers WHERE id = ?');
      stmt.run(id);
    }
  },
  
  products: {
    getAll: () => {
      return db.prepare('SELECT * FROM products ORDER BY name').all();
    },
    getById: (id) => {
      return db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    },
    getActive: () => {
      return db.prepare('SELECT * FROM products WHERE is_active = 1 ORDER BY name').all();
    },
    create: (product) => {
      const stmt = db.prepare('INSERT INTO products (name, price, description, is_active) VALUES (?, ?, ?, ?)');
      const result = stmt.run(product.name, product.price, product.description, product.is_active ? 1 : 0);
      return result.lastInsertRowid;
    },
    update: (id, product) => {
      const fields = [];
      const values = [];
      
      if (product.name !== undefined) {
        fields.push('name = ?');
        values.push(product.name);
      }
      if (product.price !== undefined) {
        fields.push('price = ?');
        values.push(product.price);
      }
      if (product.description !== undefined) {
        fields.push('description = ?');
        values.push(product.description);
      }
      if (product.is_active !== undefined) {
        fields.push('is_active = ?');
        values.push(product.is_active ? 1 : 0);
      }
      
      if (fields.length > 0) {
        values.push(id);
        const stmt = db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`);
        stmt.run(...values);
      }
    },
    delete: (id) => {
      const stmt = db.prepare('DELETE FROM products WHERE id = ?');
      stmt.run(id);
    }
  },
  
  sales: {
    getAll: () => {
      return db.prepare(`
        SELECT s.*, c.name as customer_name 
        FROM sales s 
        LEFT JOIN customers c ON s.customer_id = c.id 
        ORDER BY s.date DESC
      `).all();
    },
    getById: (id) => {
      return db.prepare(`
        SELECT s.*, c.name as customer_name 
        FROM sales s 
        LEFT JOIN customers c ON s.customer_id = c.id 
        WHERE s.id = ?
      `).get(id);
    },
    getByCustomer: (customerId) => {
      return db.prepare(`
        SELECT s.*, c.name as customer_name 
        FROM sales s 
        LEFT JOIN customers c ON s.customer_id = c.id 
        WHERE s.customer_id = ? 
        ORDER BY s.date DESC
      `).all(customerId);
    },
    create: (saleData) => {
      const transaction = db.transaction(() => {
        // Generate sale number
        const year = new Date().getFullYear();
        const lastSale = db.prepare('SELECT sale_number FROM sales WHERE sale_number LIKE ? ORDER BY id DESC LIMIT 1').get(`SALE-${year}-%`);
        let saleNumber;
        if (lastSale) {
          const lastNumber = parseInt(lastSale.sale_number.split('-')[2]);
          saleNumber = `SALE-${year}-${String(lastNumber + 1).padStart(3, '0')}`;
        } else {
          saleNumber = `SALE-${year}-001`;
        }
        
        // Calculate totals
        const subtotal = saleData.items.reduce((sum, item) => {
          return sum + (item.quantity * item.unit_price - (item.discount_per_item || 0));
        }, 0);
        
        const taxAmount = saleData.tax_amount || 0;
        const discountAmount = saleData.discount_amount || 0;
        const totalAmount = subtotal + taxAmount - discountAmount;
        
        // Create sale
        const saleStmt = db.prepare(`
          INSERT INTO sales (
            customer_id, sale_number, subtotal, tax_amount, discount_amount, 
            total_amount, payment_type, number_of_installments, down_payment, 
            installment_amount, status, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const installmentAmount = saleData.payment_type === 'installments' && saleData.number_of_installments 
          ? (totalAmount - (saleData.down_payment || 0)) / saleData.number_of_installments 
          : null;
        
        const saleResult = saleStmt.run(
          saleData.customer_id,
          saleNumber,
          subtotal,
          taxAmount,
          discountAmount,
          totalAmount,
          saleData.payment_type,
          saleData.number_of_installments,
          saleData.down_payment || 0,
          installmentAmount,
          'completed',
          saleData.notes
        );
        
        const saleId = saleResult.lastInsertRowid;
        
        // Create sale items
        const itemStmt = db.prepare(`
          INSERT INTO sale_items (
            sale_id, product_id, quantity, unit_price, discount_per_item, 
            line_total, product_name, product_description
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        for (const item of saleData.items) {
          const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id);
          const lineTotal = item.quantity * item.unit_price - (item.discount_per_item || 0);
          
          itemStmt.run(
            saleId,
            item.product_id,
            item.quantity,
            item.unit_price,
            item.discount_per_item || 0,
            lineTotal,
            product.name,
            product.description
          );
        }
        
        // Create installments if needed
        if (saleData.payment_type === 'installments' && saleData.number_of_installments) {
          const installmentStmt = db.prepare(`
            INSERT INTO installments (
              sale_id, installment_number, due_date, amount, balance
            ) VALUES (?, ?, ?, ?, ?)
          `);
          
          const startDate = new Date();
          for (let i = 1; i <= saleData.number_of_installments; i++) {
            const dueDate = new Date(startDate);
            dueDate.setMonth(dueDate.getMonth() + i);
            
            installmentStmt.run(
              saleId,
              i,
              dueDate.toISOString().split('T')[0],
              installmentAmount,
              installmentAmount
            );
          }
        }
        
        return saleId;
      });
      
      return transaction();
    },
    update: (id, sale) => {
      const fields = [];
      const values = [];
      
      Object.keys(sale).forEach(key => {
        if (sale[key] !== undefined && key !== 'id') {
          fields.push(`${key} = ?`);
          values.push(sale[key]);
        }
      });
      
      if (fields.length > 0) {
        values.push(id);
        const stmt = db.prepare(`UPDATE sales SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
        stmt.run(...values);
      }
    },
    delete: (id) => {
      const stmt = db.prepare('DELETE FROM sales WHERE id = ?');
      stmt.run(id);
    },
    getWithDetails: (id) => {
      const sale = db.prepare(`
        SELECT s.*, c.name as customer_name 
        FROM sales s 
        LEFT JOIN customers c ON s.customer_id = c.id 
        WHERE s.id = ?
      `).get(id);
      
      if (sale) {
        sale.items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(id);
        sale.installments = db.prepare('SELECT * FROM installments WHERE sale_id = ? ORDER BY installment_number').all(id);
      }
      
      return sale;
    },
    getOverdueSales: () => {
      return db.prepare(`
        SELECT DISTINCT s.*, c.name as customer_name 
        FROM sales s 
        LEFT JOIN customers c ON s.customer_id = c.id 
        INNER JOIN installments i ON s.id = i.sale_id 
        WHERE i.status = 'overdue' OR (i.due_date < date('now') AND i.status = 'pending')
        ORDER BY s.date DESC
      `).all();
    }
  },
  
  installments: {
    getBySale: (saleId) => {
      return db.prepare('SELECT * FROM installments WHERE sale_id = ? ORDER BY installment_number').all(saleId);
    },
    getOverdue: () => {
      return db.prepare(`
        SELECT i.*, s.sale_number, c.name as customer_name 
        FROM installments i 
        LEFT JOIN sales s ON i.sale_id = s.id 
        LEFT JOIN customers c ON s.customer_id = c.id 
        WHERE i.due_date < date('now') AND i.status IN ('pending', 'partial')
        ORDER BY i.due_date ASC
      `).all();
    },
    recordPayment: (installmentId, amount, paymentMethod, reference) => {
      const transaction = db.transaction(() => {
        const installment = db.prepare('SELECT * FROM installments WHERE id = ?').get(installmentId);
        if (!installment) throw new Error('Installment not found');
        
        const newPaidAmount = installment.paid_amount + amount;
        const newBalance = installment.amount - newPaidAmount;
        const newStatus = newBalance <= 0 ? 'paid' : 'partial';
        
        // Update installment
        db.prepare(`
          UPDATE installments 
          SET paid_amount = ?, balance = ?, status = ?, paid_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `).run(newPaidAmount, newBalance, newStatus, installmentId);
        
        // Record payment transaction
        db.prepare(`
          INSERT INTO payment_transactions (sale_id, installment_id, amount, payment_method, payment_reference) 
          VALUES (?, ?, ?, ?, ?)
        `).run(installment.sale_id, installmentId, amount, paymentMethod, reference);
        
        // Update sale payment status
        const remainingInstallments = db.prepare(`
          SELECT COUNT(*) as count FROM installments 
          WHERE sale_id = ? AND status IN ('pending', 'partial')
        `).get(installment.sale_id);
        
        if (remainingInstallments.count === 0) {
          db.prepare('UPDATE sales SET payment_status = ? WHERE id = ?').run('paid', installment.sale_id);
        } else {
          db.prepare('UPDATE sales SET payment_status = ? WHERE id = ?').run('partial', installment.sale_id);
        }
      });
      
      transaction();
    },
    applyLateFee: (installmentId, fee) => {
      db.prepare(`
        UPDATE installments 
        SET late_fee = ?, late_fee_applied = 1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(fee, installmentId);
    }
  },
  
  payments: {
    getBySale: (saleId) => {
      return db.prepare('SELECT * FROM payment_transactions WHERE sale_id = ? ORDER BY transaction_date DESC').all(saleId);
    },
    create: (payment) => {
      const stmt = db.prepare(`
        INSERT INTO payment_transactions (
          sale_id, installment_id, amount, payment_method, payment_reference, 
          transaction_date, processed_by, status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const result = stmt.run(
        payment.sale_id,
        payment.installment_id,
        payment.amount,
        payment.payment_method,
        payment.payment_reference,
        payment.transaction_date,
        payment.processed_by,
        payment.status,
        payment.notes
      );
      return result.lastInsertRowid;
    }
  }
};
// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  initializeDatabase();
  createWindow();

  // Create application menu
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // On macOS, re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (db) {
    db.close();
  }
  // On macOS, keep app running even when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
// Customer operations
ipcMain.handle('db:customers:getAll', () => databaseOperations.customers.getAll());
ipcMain.handle('db:customers:getById', (event, id) => databaseOperations.customers.getById(id));
ipcMain.handle('db:customers:create', (event, customer) => databaseOperations.customers.create(customer));
ipcMain.handle('db:customers:update', (event, id, customer) => databaseOperations.customers.update(id, customer));
ipcMain.handle('db:customers:delete', (event, id) => databaseOperations.customers.delete(id));
  }
// Product operations
ipcMain.handle('db:products:getAll', () => databaseOperations.products.getAll());
ipcMain.handle('db:products:getById', (event, id) => databaseOperations.products.getById(id));
ipcMain.handle('db:products:getActive', () => databaseOperations.products.getActive());
ipcMain.handle('db:products:create', (event, product) => databaseOperations.products.create(product));
ipcMain.handle('db:products:update', (event, id, product) => databaseOperations.products.update(id, product));
ipcMain.handle('db:products:delete', (event, id) => {
  return databaseOperations.products.delete(id);
});
});
// Sales operations
ipcMain.handle('db:sales:getAll', () => databaseOperations.sales.getAll());
ipcMain.handle('db:sales:getById', (event, id) => databaseOperations.sales.getById(id));
ipcMain.handle('db:sales:getByCustomer', (event, customerId) => databaseOperations.sales.getByCustomer(customerId));
ipcMain.handle('db:sales:create', (event, sale) => databaseOperations.sales.create(sale));
ipcMain.handle('db:sales:update', (event, id, sale) => databaseOperations.sales.update(id, sale));
ipcMain.handle('db:sales:delete', (event, id) => databaseOperations.sales.delete(id));
ipcMain.handle('db:sales:getWithDetails', (event, id) => databaseOperations.sales.getWithDetails(id));
ipcMain.handle('db:sales:getOverdueSales', () => databaseOperations.sales.getOverdueSales());

// Installment operations
ipcMain.handle('db:installments:getBySale', (event, saleId) => databaseOperations.installments.getBySale(saleId));
ipcMain.handle('db:installments:getOverdue', () => databaseOperations.installments.getOverdue());
ipcMain.handle('db:installments:recordPayment', (event, installmentId, amount, paymentMethod, reference) => 
  databaseOperations.installments.recordPayment(installmentId, amount, paymentMethod, reference));
ipcMain.handle('db:installments:applyLateFee', (event, installmentId, fee) => 
  databaseOperations.installments.applyLateFee(installmentId, fee));
// Make database operations available to renderer
// Payment operations
ipcMain.handle('db:payments:getBySale', (event, saleId) => databaseOperations.payments.getBySale(saleId));
ipcMain.handle('db:payments:create', (event, payment) => databaseOperations.payments.create(payment));
const { ipcMain } = require('electron');
// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (navigationEvent, navigationUrl) => {
    event.preventDefault();
    // You can add logic here to handle external links
    console.log('Prevented new window creation for:', navigationUrl);
  });
});