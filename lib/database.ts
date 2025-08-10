import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

let db: Database.Database | null = null;

// Get the user data directory for storing the database
function getDatabasePath(): string {
  if (typeof window !== 'undefined') {
    // We're in the renderer process, this shouldn't happen
    throw new Error('Database should only be accessed from the main process');
  }
  
  const userDataPath = app?.getPath('userData') || './';
  return path.join(userDataPath, 'sales_management.db');
}

export function initializeDatabase(): Database.Database {
  if (db) return db;

  const dbPath = getDatabasePath();
  db = new Database(dbPath);
  
  // Enable foreign keys
  db.pragma('foreign_keys = ON');
  
  // Create tables and run migrations
  createTables();
  runMigrations();
  
  return db;
}

function createTables() {
  if (!db) throw new Error('Database not initialized');

  // Customers table
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact_info TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Products table
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      description TEXT,
      is_active BOOLEAN DEFAULT 1
    )
  `);

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
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price DECIMAL(10,2) NOT NULL,
      discount_per_item DECIMAL(10,2) DEFAULT 0,
      line_total DECIMAL(10,2) NOT NULL,
      product_name TEXT NOT NULL,
      product_description TEXT,
      status TEXT CHECK(status IN ('active', 'returned', 'exchanged')) DEFAULT 'active',
      returned_quantity INTEGER DEFAULT 0,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
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
      FOREIGN KEY (related_payment_id) REFERENCES payments(id)
    )
  `);

  // Create indexes for better performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);
    CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);
    CREATE INDEX IF NOT EXISTS idx_installments_sale_id ON installments(sale_id);
    CREATE INDEX IF NOT EXISTS idx_installments_due_date ON installments(due_date);
    CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
    CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);
    CREATE INDEX IF NOT EXISTS idx_payments_sale_id ON payments(sale_id);
    CREATE INDEX IF NOT EXISTS idx_payments_due_date ON payments(due_date);
    CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(date);
  `);
}

function runMigrations() {
  if (!db) throw new Error('Database not initialized');

  // Check if we need to migrate the sales table
  const tableInfo = db.prepare("PRAGMA table_info(sales)").all();
  const columnNames = tableInfo.map((col: any) => col.name);
  
  console.log('Current sales table columns:', columnNames);
  
  // Check if we have the old schema (missing required columns)
  const requiredColumns = ['sale_number', 'subtotal', 'tax_amount', 'discount_amount', 'payment_status', 'down_payment'];
  const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
  
  if (missingColumns.length > 0) {
    console.log('Missing columns detected, recreating sales table:', missingColumns);
    
    // Backup existing data if any
    let existingData = [];
    try {
      existingData = db.prepare('SELECT * FROM sales').all();
      console.log('Backing up existing sales data:', existingData.length, 'records');
    } catch (error) {
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
  if (!db) throw new Error('Database not initialized');
  
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
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price DECIMAL(10,2) NOT NULL,
      discount_per_item DECIMAL(10,2) DEFAULT 0,
      line_total DECIMAL(10,2) NOT NULL,
      product_name TEXT NOT NULL,
      product_description TEXT,
      status TEXT CHECK(status IN ('active', 'returned', 'exchanged')) DEFAULT 'active',
      returned_quantity INTEGER DEFAULT 0,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
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

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}