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
      dni TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      company TEXT,
      notes TEXT,
      tags TEXT,
      payment_window TEXT,
      contact_info TEXT, -- Keep for backward compatibility
      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now'))
    )
  `);

  // Add new columns if they don't exist (for existing databases)
  try {
    db.exec('ALTER TABLE customers ADD COLUMN dni TEXT');
  } catch (e) { /* Column already exists */ }
  try {
    db.exec('ALTER TABLE customers ADD COLUMN email TEXT');
  } catch (e) { /* Column already exists */ }
  try {
    db.exec('ALTER TABLE customers ADD COLUMN phone TEXT');
  } catch (e) { /* Column already exists */ }
  try {
    db.exec('ALTER TABLE customers ADD COLUMN address TEXT');
  } catch (e) { /* Column already exists */ }
  try {
    db.exec('ALTER TABLE customers ADD COLUMN company TEXT');
  } catch (e) { /* Column already exists */ }
  try {
    db.exec('ALTER TABLE customers ADD COLUMN notes TEXT');
  } catch (e) { /* Column already exists */ }
  try {
    db.exec('ALTER TABLE customers ADD COLUMN tags TEXT');
  } catch (e) { /* Column already exists */ }
  try {
    db.exec('ALTER TABLE customers ADD COLUMN payment_window TEXT');
  } catch (e) { /* Column already exists */ }
  // Check if updated_at column exists before adding it
  const tableInfo = db.prepare("PRAGMA table_info(customers)").all();
  const hasUpdatedAt = tableInfo.some((col: any) => col.name === 'updated_at');
  
  if (!hasUpdatedAt) {
    try {
      // Add column without default value first
      db.exec('ALTER TABLE customers ADD COLUMN updated_at DATETIME');
      // Then update existing rows to have current timestamp
      db.exec("UPDATE customers SET updated_at = datetime('now') WHERE updated_at IS NULL");
      console.log('Successfully added updated_at column to customers table');
    } catch (e) {
      console.error('Critical error: Failed to add updated_at column to customers table:', e);
      throw new Error(`Database migration failed: ${e}`);
    }
  } else {
    console.log('updated_at column already exists in customers table');
  }

  // Products table
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      cost_price DECIMAL(10,2),
      description TEXT,
      category TEXT,
      stock INTEGER,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now'))
    )
  `);

  // Add category and stock columns if they don't exist (for existing databases)
  const productsTableInfo = db.prepare("PRAGMA table_info(products)").all();
  const hasCategory = productsTableInfo.some((col: any) => col.name === 'category');
  const hasStock = productsTableInfo.some((col: any) => col.name === 'stock');
  const hasCostPrice = productsTableInfo.some((col: any) => col.name === 'cost_price');
  const hasProductCreatedAt = productsTableInfo.some((col: any) => col.name === 'created_at');
  const hasProductUpdatedAt = productsTableInfo.some((col: any) => col.name === 'updated_at');
  
  if (!hasCategory) {
    try {
      db.exec('ALTER TABLE products ADD COLUMN category TEXT');
      console.log('Successfully added category column to products table');
    } catch (e) {
      console.error('Error adding category column to products table:', e);
    }
  }
  
  if (!hasStock) {
    try {
      db.exec('ALTER TABLE products ADD COLUMN stock INTEGER');
      console.log('Successfully added stock column to products table');
    } catch (e) {
      console.error('Error adding stock column to products table:', e);
    }
  }
  
  if (!hasCostPrice) {
    try {
      db.exec('ALTER TABLE products ADD COLUMN cost_price DECIMAL(10,2)');
      console.log('Successfully added cost_price column to products table');
    } catch (e) {
      console.error('Error adding cost_price column to products table:', e);
    }
  }

  // Add timestamp columns if they don't exist (for existing databases)
  if (!hasProductCreatedAt) {
    try {
      // Add column and backfill existing rows
      db.exec('ALTER TABLE products ADD COLUMN created_at DATETIME');
      db.exec("UPDATE products SET created_at = datetime('now') WHERE created_at IS NULL");
      console.log('Successfully added created_at column to products table');
    } catch (e) {
      console.error('Error adding created_at column to products table:', e);
    }
  }

  if (!hasProductUpdatedAt) {
    try {
      // Add column and backfill existing rows
      db.exec('ALTER TABLE products ADD COLUMN updated_at DATETIME');
      db.exec("UPDATE products SET updated_at = datetime('now') WHERE updated_at IS NULL");
      console.log('Successfully added updated_at column to products table');
    } catch (e) {
      console.error('Error adding updated_at column to products table:', e);
    }
  }

  // Partners table
  db.exec(`
    CREATE TABLE IF NOT EXISTS partners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert default partners if they don't exist
  const existingPartners = db.prepare("SELECT COUNT(*) as count FROM partners").get() as { count: number };
  if (existingPartners.count === 0) {
    const insertPartner = db.prepare("INSERT INTO partners (name) VALUES (?)");
    insertPartner.run("Cruz");
    insertPartner.run("Gustavo");
    insertPartner.run("Persona");
    console.log('Default partners inserted successfully');
  }

  // Sales table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      partner_id INTEGER,
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
      advance_installments INTEGER DEFAULT 0,
      transaction_type TEXT CHECK(transaction_type IN ('sale', 'return', 'exchange', 'refund')) DEFAULT 'sale',
      status TEXT CHECK(status IN ('pending', 'completed', 'cancelled', 'refunded')) DEFAULT 'completed',
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      parent_sale_id INTEGER,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (partner_id) REFERENCES partners(id),
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

  // Migración: agregar deleted_at si falta
  try {
    const notifInfo = db.prepare("PRAGMA table_info(notifications)").all();
    const hasDeletedAt = notifInfo.some((col: any) => col.name === 'deleted_at');
    if (!hasDeletedAt) {
      db.exec('ALTER TABLE notifications ADD COLUMN deleted_at DATETIME');
      console.log('Successfully added deleted_at column to notifications table');
    }
  } catch (e) {
    console.error('Error adding deleted_at column to notifications table:', e);
  }

  // Migración: agregar message_key si falta
  try {
    const notifInfo2 = db.prepare("PRAGMA table_info(notifications)").all();
    const hasMessageKey = notifInfo2.some((col: any) => col.name === 'message_key');
    if (!hasMessageKey) {
      db.exec('ALTER TABLE notifications ADD COLUMN message_key TEXT');
      console.log('Successfully added message_key column to notifications table');
    }
  } catch (e) {
    console.error('Error adding message_key column to notifications table:', e);
  }

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
  // Deduplicate active notifications by message_key to allow unique index creation
  try {
    db.exec(`
      UPDATE notifications SET deleted_at = datetime('now')
      WHERE id IN (
        SELECT n1.id FROM notifications n1
        JOIN notifications n2
          ON n1.message_key = n2.message_key
         AND n1.id < n2.id
        WHERE n1.deleted_at IS NULL AND n2.deleted_at IS NULL AND n1.message_key IS NOT NULL
      );
    `);
  } catch (e) {
    console.error('Error deduplicating notifications before index creation:', e);
  }

  db.exec(`
    -- Customer table indexes for optimized search and queries
     
     -- Unique active notifications by message_key to prevent duplicates
     CREATE UNIQUE INDEX IF NOT EXISTS uniq_notifications_message_key_active
       ON notifications(message_key)
       WHERE deleted_at IS NULL;
 
     CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
     CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
    CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company);
    CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);
    CREATE INDEX IF NOT EXISTS idx_customers_updated_at ON customers(updated_at);
    CREATE INDEX IF NOT EXISTS idx_customers_name_email ON customers(name, email);
    CREATE INDEX IF NOT EXISTS idx_customers_search ON customers(name, email, company, tags);
    
    -- Product table indexes
    CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);
    CREATE INDEX IF NOT EXISTS idx_products_updated_at ON products(updated_at);
    
    -- Sales and related table indexes
    CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);
    CREATE INDEX IF NOT EXISTS idx_sales_partner_id ON sales(partner_id);
    CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);
    CREATE INDEX IF NOT EXISTS idx_sales_due_date ON sales(due_date);
    CREATE INDEX IF NOT EXISTS idx_sales_payment_status ON sales(payment_status);
    CREATE INDEX IF NOT EXISTS idx_sales_payment_status_due_date ON sales(payment_status, due_date);
    CREATE INDEX IF NOT EXISTS idx_installments_sale_id ON installments(sale_id);
    CREATE INDEX IF NOT EXISTS idx_installments_due_date ON installments(due_date);
    CREATE INDEX IF NOT EXISTS idx_installments_status ON installments(status);
    CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
    CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);
    CREATE INDEX IF NOT EXISTS idx_payment_transactions_sale_id ON payment_transactions(sale_id);
    CREATE INDEX IF NOT EXISTS idx_payment_transactions_transaction_date ON payment_transactions(transaction_date);
    CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(date);

    -- Notifications indexes
    CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
    CREATE INDEX IF NOT EXISTS idx_notifications_deleted_at ON notifications(deleted_at);
    CREATE INDEX IF NOT EXISTS idx_notifications_message ON notifications(message);
    CREATE INDEX IF NOT EXISTS idx_notifications_message_key ON notifications(message_key);
  `);
}

function runMigrations() {
  if (!db) throw new Error('Database not initialized');

  // Check if we need to migrate the sales table
  const tableInfo = db.prepare("PRAGMA table_info(sales)").all();
  const columnNames = tableInfo.map((col: any) => col.name);
  
  console.log('Current sales table columns:', columnNames);
  
  // Check if we have the old schema (missing required columns)
  const requiredColumns = ['sale_number', 'subtotal', 'tax_amount', 'discount_amount', 'payment_status', 'advance_installments'];
  const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
  
  // Check if partner_id column exists
  const hasPartnerId = columnNames.includes('partner_id');
  
  // Check if sale_items table needs to be migrated to allow NULL product_id
  const saleItemsTableInfo = db.prepare("PRAGMA table_info(sale_items)").all();
  const product_id_column = saleItemsTableInfo.find((col: any) => col.name === 'product_id');
  const needsProductIDMigration = product_id_column && (product_id_column as any).notnull === 1;
  
  if (missingColumns.length > 0 || needsProductIDMigration || !hasPartnerId) {
    console.log('Missing columns detected or sale_items table needs migration:', missingColumns);
    
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
      partner_id INTEGER,
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
      advance_installments INTEGER DEFAULT 0,
      transaction_type TEXT CHECK(transaction_type IN ('sale', 'return', 'exchange', 'refund')) DEFAULT 'sale',
      status TEXT CHECK(status IN ('pending', 'completed', 'cancelled', 'refunded')) DEFAULT 'completed',
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      parent_sale_id INTEGER,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (partner_id) REFERENCES partners(id),
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