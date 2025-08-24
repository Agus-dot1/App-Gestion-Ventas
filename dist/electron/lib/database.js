"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeDatabase = exports.getDatabase = exports.initializeDatabase = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const electron_1 = require("electron");
let db = null;
// Get the user data directory for storing the database
function getDatabasePath() {
    if (typeof window !== 'undefined') {
        // We're in the renderer process, this shouldn't happen
        throw new Error('Database should only be accessed from the main process');
    }
    const userDataPath = electron_1.app?.getPath('userData') || './';
    return path_1.default.join(userDataPath, 'sales_management.db');
}
function initializeDatabase() {
    if (db)
        return db;
    const dbPath = getDatabasePath();
    db = new better_sqlite3_1.default(dbPath);
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    // Create tables and run migrations
    createTables();
    runMigrations();
    return db;
}
exports.initializeDatabase = initializeDatabase;
function createTables() {
    if (!db)
        throw new Error('Database not initialized');
    // Customers table
    db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      address TEXT,
      company TEXT,
      notes TEXT,
      tags TEXT,
      contact_info TEXT, -- Keep for backward compatibility
      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now'))
    )
  `);
    // Add new columns if they don't exist (for existing databases)
    try {
        db.exec('ALTER TABLE customers ADD COLUMN email TEXT');
    }
    catch (e) { /* Column already exists */ }
    try {
        db.exec('ALTER TABLE customers ADD COLUMN phone TEXT');
    }
    catch (e) { /* Column already exists */ }
    try {
        db.exec('ALTER TABLE customers ADD COLUMN address TEXT');
    }
    catch (e) { /* Column already exists */ }
    try {
        db.exec('ALTER TABLE customers ADD COLUMN company TEXT');
    }
    catch (e) { /* Column already exists */ }
    try {
        db.exec('ALTER TABLE customers ADD COLUMN notes TEXT');
    }
    catch (e) { /* Column already exists */ }
    try {
        db.exec('ALTER TABLE customers ADD COLUMN tags TEXT');
    }
    catch (e) { /* Column already exists */ }
    // Check if updated_at column exists before adding it
    const tableInfo = db.prepare("PRAGMA table_info(customers)").all();
    const hasUpdatedAt = tableInfo.some((col) => col.name === 'updated_at');
    if (!hasUpdatedAt) {
        try {
            // Add column without default value first
            db.exec('ALTER TABLE customers ADD COLUMN updated_at DATETIME');
            // Then update existing rows to have current timestamp
            db.exec("UPDATE customers SET updated_at = datetime('now') WHERE updated_at IS NULL");
            console.log('Successfully added updated_at column to customers table');
        }
        catch (e) {
            console.error('Critical error: Failed to add updated_at column to customers table:', e);
            throw new Error(`Database migration failed: ${e}`);
        }
    }
    else {
        console.log('updated_at column already exists in customers table');
    }
    // Products table
    db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      description TEXT,
      category TEXT,
      stock INTEGER,
      is_active BOOLEAN DEFAULT 1
    )
  `);
    // Add category and stock columns if they don't exist (for existing databases)
    const productsTableInfo = db.prepare("PRAGMA table_info(products)").all();
    const hasCategory = productsTableInfo.some((col) => col.name === 'category');
    const hasStock = productsTableInfo.some((col) => col.name === 'stock');
    if (!hasCategory) {
        try {
            db.exec('ALTER TABLE products ADD COLUMN category TEXT');
            console.log('Successfully added category column to products table');
        }
        catch (e) {
            console.error('Error adding category column to products table:', e);
        }
    }
    if (!hasStock) {
        try {
            db.exec('ALTER TABLE products ADD COLUMN stock INTEGER');
            console.log('Successfully added stock column to products table');
        }
        catch (e) {
            console.error('Error adding stock column to products table:', e);
        }
    }
    // Sales table
    db.exec(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      sale_number TEXT NOT NULL,
      date DATETIME DEFAULT CURRENT_TIMESTAMP,
      due_date DATETIME,
      subtotal DECIMAL(10,2) NOT NULL,
      tax_amount DECIMAL(10,2) DEFAULT 0,
      discount_amount DECIMAL(10,2) DEFAULT 0,
      total_amount DECIMAL(10,2) NOT NULL,
      payment_type TEXT CHECK(payment_type IN ('cash', 'installments', 'credit', 'mixed')) NOT NULL,
      payment_status TEXT CHECK(payment_status IN ('paid', 'partial', 'unpaid', 'overdue')) DEFAULT 'unpaid',
      number_of_installments INTEGER,
      installment_amount DECIMAL(10,2),
      down_payment DECIMAL(10,2) DEFAULT 0,
      transaction_type TEXT CHECK(transaction_type IN ('sale', 'return', 'exchange', 'refund')) DEFAULT 'sale',
      status TEXT CHECK(status IN ('pending', 'completed', 'cancelled', 'refunded')) DEFAULT 'completed',
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      parent_sale_id INTEGER,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (parent_sale_id) REFERENCES sales(id)
    )
  `);
    // Installments table
    db.exec(`
    CREATE TABLE IF NOT EXISTS installments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      installment_number INTEGER NOT NULL,
      due_date DATE NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      paid_amount DECIMAL(10,2) DEFAULT 0,
      balance DECIMAL(10,2) NOT NULL,
      status TEXT CHECK(status IN ('pending', 'paid', 'partial', 'overdue', 'cancelled')) DEFAULT 'pending',
      paid_date DATETIME,
      days_overdue INTEGER DEFAULT 0,
      late_fee DECIMAL(10,2) DEFAULT 0,
      late_fee_applied BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
    )
  `);
    // Sale items table
    db.exec(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      product_id INTEGER,
      quantity INTEGER NOT NULL,
      unit_price DECIMAL(10,2) NOT NULL,
      discount_per_item DECIMAL(10,2) DEFAULT 0,
      line_total DECIMAL(10,2) NOT NULL,
      product_name TEXT NOT NULL,
      product_description TEXT,
      status TEXT CHECK(status IN ('active', 'returned', 'exchanged')) DEFAULT 'active',
      returned_quantity INTEGER DEFAULT 0,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    )
  `);
    // Payment transactions table
    db.exec(`
    CREATE TABLE IF NOT EXISTS payment_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      installment_id INTEGER,
      amount DECIMAL(10,2) NOT NULL,
      payment_method TEXT CHECK(payment_method IN ('cash', 'credit_card', 'debit_card', 'bank_transfer', 'check')) NOT NULL,
      payment_reference TEXT,
      transaction_date DATETIME NOT NULL,
      processed_by INTEGER,
      status TEXT CHECK(status IN ('pending', 'completed', 'failed', 'cancelled')) DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY (installment_id) REFERENCES installments(id)
    )
  `);
    // Notifications table
    db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      message TEXT NOT NULL,
      type TEXT CHECK(type IN ('reminder', 'alert', 'info')) NOT NULL,
      read_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
    // Reports table
    db.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      query_params TEXT, -- JSON string
      generated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
    // Calendar events table
    db.exec(`
    CREATE TABLE IF NOT EXISTS calendar_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      date DATE NOT NULL,
      related_payment_id INTEGER,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (related_payment_id) REFERENCES payment_transactions(id)
    )
  `);
    // Create indexes for better performance
    db.exec(`
    -- Customer table indexes for optimized search and queries
    CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
    CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
    CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company);
    CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);
    CREATE INDEX IF NOT EXISTS idx_customers_updated_at ON customers(updated_at);
    CREATE INDEX IF NOT EXISTS idx_customers_name_email ON customers(name, email);
    CREATE INDEX IF NOT EXISTS idx_customers_search ON customers(name, email, company, tags);
    
    -- Sales and related table indexes
    CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);
    CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);
    CREATE INDEX IF NOT EXISTS idx_installments_sale_id ON installments(sale_id);
    CREATE INDEX IF NOT EXISTS idx_installments_due_date ON installments(due_date);
    CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
    CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);
    CREATE INDEX IF NOT EXISTS idx_payment_transactions_sale_id ON payment_transactions(sale_id);
    CREATE INDEX IF NOT EXISTS idx_payment_transactions_transaction_date ON payment_transactions(transaction_date);
    CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(date);
  `);
}
function runMigrations() {
    if (!db)
        throw new Error('Database not initialized');
    // Check if we need to migrate the sales table
    const tableInfo = db.prepare("PRAGMA table_info(sales)").all();
    const columnNames = tableInfo.map((col) => col.name);
    console.log('Current sales table columns:', columnNames);
    // Check if we have the old schema (missing required columns)
    const requiredColumns = ['sale_number', 'subtotal', 'tax_amount', 'discount_amount', 'payment_status', 'down_payment'];
    const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
    // Check if sale_items table needs to be migrated to allow NULL product_id
    const saleItemsTableInfo = db.prepare("PRAGMA table_info(sale_items)").all();
    const product_id_column = saleItemsTableInfo.find((col) => col.name === 'product_id');
    const needsProductIDMigration = product_id_column && product_id_column.notnull === 1;
    if (missingColumns.length > 0 || needsProductIDMigration) {
        console.log('Missing columns detected or sale_items table needs migration:', missingColumns);
        // Backup existing data if any
        let existingData = [];
        try {
            existingData = db.prepare('SELECT * FROM sales').all();
            console.log('Backing up existing sales data:', existingData.length, 'records');
        }
        catch (error) {
            console.log('No existing sales data to backup');
        }
        // Drop and recreate the sales table with new schema
        db.exec('DROP TABLE IF EXISTS sales');
        db.exec('DROP TABLE IF EXISTS sale_items');
        db.exec('DROP TABLE IF EXISTS installments');
        db.exec('DROP TABLE IF EXISTS payment_transactions');
        // Recreate tables with new schema
        createSalesRelatedTables();
        console.log('Sales table recreated with new schema');
    }
}
function createSalesRelatedTables() {
    if (!db)
        throw new Error('Database not initialized');
    // Sales table with complete schema
    db.exec(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      sale_number TEXT NOT NULL,
      date DATETIME DEFAULT CURRENT_TIMESTAMP,
      due_date DATETIME,
      subtotal DECIMAL(10,2) NOT NULL,
      tax_amount DECIMAL(10,2) DEFAULT 0,
      discount_amount DECIMAL(10,2) DEFAULT 0,
      total_amount DECIMAL(10,2) NOT NULL,
      payment_type TEXT CHECK(payment_type IN ('cash', 'installments', 'credit', 'mixed')) NOT NULL,
      payment_status TEXT CHECK(payment_status IN ('paid', 'partial', 'unpaid', 'overdue')) DEFAULT 'unpaid',
      number_of_installments INTEGER,
      installment_amount DECIMAL(10,2),
      down_payment DECIMAL(10,2) DEFAULT 0,
      transaction_type TEXT CHECK(transaction_type IN ('sale', 'return', 'exchange', 'refund')) DEFAULT 'sale',
      status TEXT CHECK(status IN ('pending', 'completed', 'cancelled', 'refunded')) DEFAULT 'completed',
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      parent_sale_id INTEGER,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (parent_sale_id) REFERENCES sales(id)
    )
  `);
    // Installments table
    db.exec(`
    CREATE TABLE IF NOT EXISTS installments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      installment_number INTEGER NOT NULL,
      due_date DATE NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      paid_amount DECIMAL(10,2) DEFAULT 0,
      balance DECIMAL(10,2) NOT NULL,
      status TEXT CHECK(status IN ('pending', 'paid', 'partial', 'overdue', 'cancelled')) DEFAULT 'pending',
      paid_date DATETIME,
      days_overdue INTEGER DEFAULT 0,
      late_fee DECIMAL(10,2) DEFAULT 0,
      late_fee_applied BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
    )
  `);
    // Sale items table
    db.exec(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      product_id INTEGER,
      quantity INTEGER NOT NULL,
      unit_price DECIMAL(10,2) NOT NULL,
      discount_per_item DECIMAL(10,2) DEFAULT 0,
      line_total DECIMAL(10,2) NOT NULL,
      product_name TEXT NOT NULL,
      product_description TEXT,
      status TEXT CHECK(status IN ('active', 'returned', 'exchanged')) DEFAULT 'active',
      returned_quantity INTEGER DEFAULT 0,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    )
  `);
    // Payment transactions table
    db.exec(`
    CREATE TABLE IF NOT EXISTS payment_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      installment_id INTEGER,
      amount DECIMAL(10,2) NOT NULL,
      payment_method TEXT CHECK(payment_method IN ('cash', 'credit_card', 'debit_card', 'bank_transfer', 'check')) NOT NULL,
      payment_reference TEXT,
      transaction_date DATETIME NOT NULL,
      processed_by INTEGER,
      status TEXT CHECK(status IN ('pending', 'completed', 'failed', 'cancelled')) DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY (installment_id) REFERENCES installments(id)
    )
  `);
}
function getDatabase() {
    if (!db) {
        throw new Error('Database not initialized. Call initializeDatabase() first.');
    }
    return db;
}
exports.getDatabase = getDatabase;
function closeDatabase() {
    if (db) {
        db.close();
        db = null;
    }
}
exports.closeDatabase = closeDatabase;
//# sourceMappingURL=database.js.map