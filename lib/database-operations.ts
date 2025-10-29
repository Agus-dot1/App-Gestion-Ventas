

import { getDatabase } from './database';

function generateSaleNumberBase(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStart = `${year}-${month}-${day}`;
  const db = getDatabase();
  const todayCountStmt = db.prepare(`
    SELECT COUNT(*) as count FROM sales 
    WHERE date(date) = date(?)
  `);
  const todayCount = (todayCountStmt.get(todayStart) as { count: number }).count + 1;
  const sequentialNumber = String(todayCount).padStart(3, '0');
  return `VENTA-${sequentialNumber}-${year}${month}${day}`;
}

function saleNumberExists(candidate: string): boolean {
  const db = getDatabase();
  const row = db.prepare('SELECT 1 FROM sales WHERE sale_number = ?').get(candidate);
  return !!row;
}

function generateUniqueSaleNumber(): string {
  // Try base first (sequential per day)
  const base = generateSaleNumberBase();
  if (!saleNumberExists(base)) return base;
  // Add a short random suffix until unique
  for (let i = 0; i < 5; i++) {
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    const candidate = `${base}-${suffix}`;
    if (!saleNumberExists(candidate)) return candidate;
  }
  // Fallback: timestamp-based code
  return `VENTA-${Date.now()}`;
}

function ensureUniqueSaleNumber(preferred?: string): string {
  const base = preferred || generateSaleNumberBase();
  if (!saleNumberExists(base)) return base;
  for (let i = 0; i < 5; i++) {
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    const candidate = `${base}-${suffix}`;
    if (!saleNumberExists(candidate)) return candidate;
  }
  return `VENTA-${Date.now()}`;
}

// Normalize legacy/variant payment window values to the canonical union
function normalizePaymentWindow(value?: string): '1 to 10' | '20 to 30' | undefined {
  if (!value) return undefined;
  if (value === '10 to 20') return '1 to 10';
  if (value === '10 a 20' || value === '10-20' || value === '10-20') return '1 to 10';
  if (value === '1 a 10' || value === '1 al 10') return '1 to 10';
  if (value === '20 a 30' || value === '20 al 30') return '20 to 30';
  if (value === '1 to 10' || value === '20 to 30') return value as '1 to 10' | '20 to 30';
  return undefined;
}

function normalizeCustomer(c: Customer): Customer {
  const normalized = normalizePaymentWindow(c.payment_window as unknown as string | undefined);
  return normalized ? { ...c, payment_window: normalized } : c;
}

export interface Customer {
  id?: number;
  name: string;
  dni?: string;
  email?: string;
  phone?: string;
  secondary_phone?: string;
  address?: string;
  company?: string;
  notes?: string;
  payment_window?: '1 to 10' | '20 to 30';
  contact_info?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id?: number;
  name: string;
  price: number;
  cost_price?: number;
  description?: string;
  category?: string;
  stock?: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Partner {
  id?: number;
  name: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SaleItem {
  id?: number;
  sale_id: number;
  product_id: number | null;
  quantity: number;
  unit_price: number;
  line_total: number;
  product_name: string;
  product_description?: string;
  status: 'active';
  returned_quantity: number;
}

export interface Installment {
  id?: number;
  sale_id: number;
  installment_number: number;
  due_date: string;
  amount: number;
  paid_amount: number;
  balance: number;
  status: 'pending' | 'paid' | 'overdue';
  paid_date?: string;
  days_overdue: number;
  late_fee: number;
  late_fee_applied: boolean;
  created_at?: string;
  updated_at?: string;
  notes?: string;
}

export interface Sale {
  id?: number;
  customer_id: number;
  partner_id?: number;
  sale_number: string;
  date: string;
  due_date?: string;
  subtotal: number;
  total_amount: number;
  payment_type: 'cash' | 'installments';
  payment_method?: 'cash' | 'bank_transfer';
  payment_status: 'paid' | 'unpaid' | 'overdue';
  payment_period?: '1 to 10' | '20 to 30';
  period_type?: 'monthly' | 'weekly';
  number_of_installments?: number;
  installment_amount?: number;
  installment_payment_method?: 'cash' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'check';
  transaction_type: 'sale';
  status: 'pending' | 'completed';
  created_by?: number;
  created_at?: string;
  updated_at?: string;
  notes?: string;
  parent_sale_id?: number;
  customer_name?: string;
  partner_name?: string;
  items?: SaleItem[];
  installments?: Installment[];
}

export interface PaymentTransaction {
  id?: number;
  sale_id: number;
  installment_id?: number;
  amount: number;
  payment_method: 'cash' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'check';
  payment_reference?: string;
  transaction_date: string;
  processed_by?: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  created_at?: string;
  notes?: string;
}

export interface SaleFormData {
  customer_id: number;
  partner_id?: number;
  items: Array<{
    product_id: number | null;
    quantity: number;
    unit_price: number;
    product_name?: string;
  }>;
  payment_type: 'cash' | 'installments';
  payment_method?: 'cash' | 'bank_transfer';
  period_type?: 'monthly' | 'weekly';
  payment_period?: '1 to 10' | '20 to 30';
  number_of_installments?: number;
  notes?: string;
}

// Database operation implementations
export const customerOperations = {
  getAll: (): Customer[] => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM customers ORDER BY name');
    const rows = stmt.all() as Customer[];
    return rows.map(normalizeCustomer);
  },

  getPaginated: (page: number = 1, pageSize: number = 10, searchTerm: string = ''): {
    customers: Customer[];
    total: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  } => {
    const db = getDatabase();
    const offset = (page - 1) * pageSize;
    
    let whereClause = '';
    let params: any[] = [];
    
    if (searchTerm.trim()) {
      whereClause = `WHERE 
        dni LIKE ? OR
        name LIKE ? OR 
        email LIKE ? OR 
        company LIKE ? OR 
        tags LIKE ? OR
        phone LIKE ? OR
        secondary_phone LIKE ?`;
      const searchPattern = `%${searchTerm.trim()}%`;
      params = [searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern];
    }

    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM customers ${whereClause}`);
    const { total } = countStmt.get(...params) as { total: number };
    
    const stmt = db.prepare(`
      SELECT * FROM customers 
      ${whereClause}
      ORDER BY name 
      LIMIT ? OFFSET ?
    `);
    
    const customers = (stmt.all(...params, pageSize, offset) as Customer[]).map(normalizeCustomer);
    
    return {
      customers,
      total,
      totalPages: Math.ceil(total / pageSize),
      currentPage: page,
      pageSize
    };
  },

  // Optimized search function
  search: (searchTerm: string, limit: number = 50): Customer[] => {
    const db = getDatabase();
    if (!searchTerm.trim()) return [];
    
    const stmt = db.prepare(`
      SELECT * FROM customers 
      WHERE 
        dni LIKE ? OR
        name LIKE ? OR 
        email LIKE ? OR 
        company LIKE ? OR 
        tags LIKE ? OR
        phone LIKE ? OR
        secondary_phone LIKE ?
      ORDER BY 
        CASE 
          WHEN dni = ? THEN 1
          WHEN dni LIKE ? THEN 2
          WHEN name LIKE ? THEN 3
          WHEN email LIKE ? THEN 4
          WHEN company LIKE ? THEN 5
          ELSE 6
        END,
        name
      LIMIT ?
    `);
    
    const searchPattern = `%${searchTerm.trim()}%`;
    const exactPattern = `${searchTerm.trim()}%`;
    const exactMatch = searchTerm.trim();
    
    const rows = stmt.all(
      searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern,
      exactMatch, exactPattern, exactPattern, exactPattern, exactPattern,
      limit
    ) as Customer[];
    return rows.map(normalizeCustomer);
  },

  getById: (id: number): Customer => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM customers WHERE id = ?');
    const result = stmt.get(id) as Customer;
    if (!result) {
      throw new Error(`Customer with id ${id} not found`);
    }
    return normalizeCustomer(result);
  },

  create: (customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): number => {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO customers (name, dni, email, phone, secondary_phone, address, company, notes, tags, payment_window, contact_info) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      customer.name,
      customer.dni || null,
      customer.email || null,
      customer.phone || null,
      customer.secondary_phone || null,
      customer.address || null,
      customer.company || null,
      customer.notes || null,
      normalizePaymentWindow(customer.payment_window as unknown as string | undefined) || null,
      customer.contact_info || null
    );
    return result.lastInsertRowid as number;
  },

  update: (id: number, customer: Partial<Customer>): void => {
    const db = getDatabase();
    const fields = [];
    const values = [];
    
    if (customer.name !== undefined) {
      fields.push('name = ?');
      values.push(customer.name);
    }
    if (customer.dni !== undefined) {
      fields.push('dni = ?');
      values.push(customer.dni);
    }
    if (customer.email !== undefined) {
      fields.push('email = ?');
      values.push(customer.email);
    }
    if (customer.phone !== undefined) {
      fields.push('phone = ?');
      values.push(customer.phone);
    }
    if (customer.secondary_phone !== undefined) {
      fields.push('secondary_phone = ?');
      values.push(customer.secondary_phone);
    }
    if (customer.address !== undefined) {
      fields.push('address = ?');
      values.push(customer.address);
    }
    if (customer.company !== undefined) {
      fields.push('company = ?');
      values.push(customer.company);
    }
    if (customer.notes !== undefined) {
      fields.push('notes = ?');
      values.push(customer.notes);
    }
    if (customer.payment_window !== undefined) {
      fields.push('payment_window = ?');
      values.push(normalizePaymentWindow(customer.payment_window as unknown as string | undefined) || null);
    }
    if (customer.contact_info !== undefined) {
      fields.push('contact_info = ?');
      values.push(customer.contact_info);
    }
    
    if (fields.length === 0) return;
    
    // Always update the updated_at timestamp
    fields.push('updated_at = CURRENT_TIMESTAMP');
    
    values.push(id);
    const stmt = db.prepare(`UPDATE customers SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);
  },

  delete: (id: number): { deletedSales: Sale[] } => {
    const db = getDatabase();
    
    // Get all related sales for this customer before deleting them
    const salesStmt = db.prepare(`
      SELECT s.*, c.name as customer_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.customer_id = ?
      ORDER BY s.date DESC
    `);
    const deletedSales = salesStmt.all(id) as Sale[];
    
    // Delete all related sales for this customer
    // This will automatically cascade to delete installments, sale_items, and payment_transactions
    // due to the ON DELETE CASCADE constraints in the database schema
    const deleteSalesStmt = db.prepare('DELETE FROM sales WHERE customer_id = ?');
    deleteSalesStmt.run(id);
    
    // Now delete the customer
    const stmt = db.prepare('DELETE FROM customers WHERE id = ?');
    const result = stmt.run(id);
    
    return { deletedSales };
  },

  getCount: (): number => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT COUNT(*) as count FROM customers');
    const result = stmt.get() as { count: number };
    return result.count;
  },

  getRecent: (limit: number = 5): Customer[] => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM customers ORDER BY created_at DESC LIMIT ?');
    const rows = stmt.all(limit) as Customer[];
    return rows.map(normalizeCustomer);
  },

  getMonthlyComparison: (): { current: number; previous: number; change: number } => {
    const db = getDatabase();
    const currentMonthStmt = db.prepare(`
      SELECT COUNT(*) as count FROM customers 
      WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
    `);
    const previousMonthStmt = db.prepare(`
      SELECT COUNT(*) as count FROM customers 
      WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', '-1 month')
    `);
    
    const current = (currentMonthStmt.get() as { count: number }).count;
    const previous = (previousMonthStmt.get() as { count: number }).count;
    const change = previous === 0 ? 0 : ((current - previous) / previous) * 100;
    
    return { current, previous, change };
  },

  deleteAll: (): void => {
    const db = getDatabase();
    try {
      db.exec('BEGIN');
      // Eliminar ventas primero para evitar violaciones de claves foráneas
      db.prepare('DELETE FROM sales').run();
      // Luego eliminar clientes
      db.prepare('DELETE FROM customers').run();
      db.exec('COMMIT');
    } catch (e) {
      try { db.exec('ROLLBACK'); } catch (_) {}
      throw e;
    }
  },

  // Insertar cliente preservando su ID desde un backup
  insertFromBackup: (customer: Customer): number => {
    const db = getDatabase();
    if (customer.id === undefined || customer.id === null) {
      // Fallback: crear sin ID explícito si falta
      return customerOperations.create({
        name: customer.name,
        dni: customer.dni,
        email: customer.email,
        phone: customer.phone,
        secondary_phone: customer.secondary_phone,
        address: customer.address,
        company: customer.company,
        notes: customer.notes,
        contact_info: customer.contact_info,
        payment_window: normalizePaymentWindow(customer.payment_window),
      });
    }

    const stmt = db.prepare(`
      INSERT INTO customers (
        id, name, dni, email, phone, secondary_phone, address, company, notes, contact_info, payment_window,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), COALESCE(?, CURRENT_TIMESTAMP))
    `);
    const result = stmt.run(
      customer.id,
      customer.name,
      customer.dni || null,
      customer.email || null,
      customer.phone || null,
      customer.secondary_phone || null,
      customer.address || null,
      customer.company || null,
      customer.notes || null,
      customer.contact_info || null,
      normalizePaymentWindow(customer.payment_window) || null,
      customer.created_at || null,
      customer.updated_at || null
    );
    return result.lastInsertRowid as number;
  }
};

export const productOperations = {
  getAll: (): Product[] => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM products ORDER BY name');
    return stmt.all() as Product[];
  },

  getPaginated: (page: number = 1, pageSize: number = 10, searchTerm: string = ''): {
    products: Product[];
    total: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  } => {
    const db = getDatabase();
    const offset = (page - 1) * pageSize;
    
    let whereClause = '';
    let params: any[] = [];
    
    if (searchTerm.trim()) {
      whereClause = 'WHERE name LIKE ? OR description LIKE ? OR category LIKE ?';
      const searchPattern = `%${searchTerm.trim()}%`;
      params = [searchPattern, searchPattern, searchPattern];
    }
    
    // Get total count for pagination
    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM products ${whereClause}`);
    const { total } = countStmt.get(...params) as { total: number };
    
    // Get paginated results
    const stmt = db.prepare(`
      SELECT * FROM products 
      ${whereClause}
      ORDER BY name 
      LIMIT ? OFFSET ?
    `);
    
    const products = stmt.all(...params, pageSize, offset) as Product[];
    
    return {
      products,
      total,
      totalPages: Math.ceil(total / pageSize),
      currentPage: page,
      pageSize
    };
  },

  search: (searchTerm: string, limit: number = 50): Product[] => {
    const db = getDatabase();
    if (!searchTerm.trim()) return [];
    
    const stmt = db.prepare(`
      SELECT * FROM products 
      WHERE 
        name LIKE ? OR 
        description LIKE ? OR 
        category LIKE ?
      ORDER BY 
        CASE 
          WHEN name LIKE ? THEN 1
          WHEN description LIKE ? THEN 2
          WHEN category LIKE ? THEN 3
          ELSE 4
        END,
        name
      LIMIT ?
    `);
    
    const searchPattern = `%${searchTerm.trim()}%`;
    const exactPattern = `${searchTerm.trim()}%`;
    
    return stmt.all(
      searchPattern, searchPattern, searchPattern,
      exactPattern, exactPattern, exactPattern,
      limit
    ) as Product[];
  },

  getActive: (): Product[] => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM products WHERE is_active = 1 ORDER BY name');
    return stmt.all() as Product[];
  },

  getById: (id: number): Product => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM products WHERE id = ?');
    const result = stmt.get(id) as Product;
    if (!result) {
      throw new Error(`Product with id ${id} not found`);
    }
    return result;
  },

  create: (product: Omit<Product, 'id'>): number => {
    const db = getDatabase();
    const stmt = db.prepare(
      "INSERT INTO products (name, price, cost_price, description, category, stock, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))"
    );
    const result = stmt.run(
      product.name,
      product.price,
      (product.cost_price ?? null),
      product.description || null,
      product.category || null,
      product.stock || null,
      product.is_active ? 1 : 0
    );
    return result.lastInsertRowid as number;
  },

  update: (id: number, product: Partial<Product>): void => {
    const db = getDatabase();
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
    if (product.cost_price !== undefined) {
      fields.push('cost_price = ?');
      values.push(product.cost_price);
    }
    if (product.description !== undefined) {
      fields.push('description = ?');
      values.push(product.description);
    }
    if (product.category !== undefined) {
      fields.push('category = ?');
      values.push(product.category);
    }
    if (product.stock !== undefined) {
      fields.push('stock = ?');
      values.push(product.stock);
    }
    if (product.is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(product.is_active ? 1 : 0);
    }
    
    // Always update the timestamp when modifying a product
    fields.push("updated_at = datetime('now')");

    if (fields.length === 0) return;
    
    values.push(id);
    const stmt = db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);
  },

  delete: (id: number): void => {
    const db = getDatabase();
    
    // Delete the product
    // The foreign key constraint will automatically set product_id to NULL in sale_items
    const stmt = db.prepare('DELETE FROM products WHERE id = ?');
    stmt.run(id);
  },

  getCount: (): number => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT COUNT(*) as count FROM products');
    const result = stmt.get() as { count: number };
    return result.count;
  },

  getMonthlyComparison: (): { current: number; previous: number; change: number } => {
    const db = getDatabase();
    const currentMonthStmt = db.prepare(`
      SELECT COUNT(*) as count FROM products 
      WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
    `);
    const previousMonthStmt = db.prepare(`
      SELECT COUNT(*) as count FROM products 
      WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', '-1 month')
    `);

    const current = (currentMonthStmt.get() as { count: number }).count;
    const previous = (previousMonthStmt.get() as { count: number }).count;
    const change = previous === 0 ? 0 : ((current - previous) / previous) * 100;
    
    return { current, previous, change };
  },

  deleteAll: (): void => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM products');
    stmt.run();
  },

  // Insertar producto preservando su ID desde un backup
  insertFromBackup: (product: Product): number => {
    const db = getDatabase();
    if (product.id === undefined || product.id === null) {
      return productOperations.create({
        name: product.name,
        price: product.price,
        description: product.description,
        category: product.category,
        stock: product.stock,
        is_active: product.is_active,
      });
    }
    const stmt = db.prepare(`
      INSERT INTO products (
        id, name, price, description, category, stock, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')), COALESCE(?, datetime('now')))
    `);
    const result = stmt.run(
      product.id,
      product.name,
      product.price,
      product.description || null,
      product.category || null,
      product.stock ?? null,
      product.is_active ? 1 : 0,
      product.created_at || null,
      product.updated_at || null
    );
    return result.lastInsertRowid as number;
  }
};

export const partnerOperations = {
  getAll: (): Partner[] => {
    const db = getDatabase();
    // diagnóstico: listar conteo y muestra de partners
    try {
      const rows = db.prepare('SELECT id, name, is_active FROM partners ORDER BY name').all() as Array<{ id: number; name: string; is_active: number }>;
      console.log('partners:getAll ejecutándose en el proceso', process.type, 'count:', rows.length);
      if (rows.length > 0) {
        console.log('partners sample:', rows.slice(0, Math.min(rows.length, 5)));
      }
    } catch (e) {
      console.error('partners:getAll error inspeccionando tabla:', e);
    }
    return db.prepare('SELECT * FROM partners WHERE is_active = 1 ORDER BY name').all() as Partner[];
  },

  getById: (id: number): Partner => {
    const db = getDatabase();
    const partner = db.prepare('SELECT * FROM partners WHERE id = ?').get(id) as Partner;
    if (!partner) {
      throw new Error(`Partner with id ${id} not found`);
    }
    return partner;
  },

  create: (partner: Omit<Partner, 'id' | 'created_at' | 'updated_at'>): number => {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO partners (name, is_active)
      VALUES (?, ?)
    `);
    const result = stmt.run(partner.name, partner.is_active ? 1 : 0);
    return result.lastInsertRowid as number;
  },

  update: (id: number, partner: Partial<Partner>): void => {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE partners 
      SET name = COALESCE(?, name),
          is_active = COALESCE(?, is_active),
          updated_at = datetime('now')
      WHERE id = ?
    `);
    stmt.run(partner.name, partner.is_active ? 1 : 0, id);
  },

  delete: (id: number): void => {
    const db = getDatabase();
    // Hard delete: disassociate sales and remove partner row atomically
    try {
      db.exec('BEGIN');
      // Disassociate any sales referencing this partner
      const clearSales = db.prepare('UPDATE sales SET partner_id = NULL WHERE partner_id = ?');
      clearSales.run(id);
      // Remove partner row
      const del = db.prepare('DELETE FROM partners WHERE id = ?');
      del.run(id);
      db.exec('COMMIT');
    } catch (e) {
      try { db.exec('ROLLBACK'); } catch {}
      throw e;
    }
  }
};

export const saleOperations = {
  getAll: (): Sale[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT s.*, c.name as customer_name, p.name as partner_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN partners p ON s.partner_id = p.id
      ORDER BY s.date DESC
    `);
    return stmt.all() as Sale[];
  },

  getPaginated: (page: number = 1, pageSize: number = 10, searchTerm: string = ''): {
    sales: Sale[];
    total: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  } => {
    console.log('getPaginated ejecutándose en el proceso', process.type);
    console.time('sales_query_total');
    const db = getDatabase();
    const offset = (page - 1) * pageSize;
    
    let whereClause = '';
    let params: any[] = [];
    
    if (searchTerm.trim()) {
      whereClause = 'WHERE s.sale_number LIKE ? OR c.name LIKE ? OR s.notes LIKE ?';
      const searchPattern = `%${searchTerm.trim()}%`;
      params = [searchPattern, searchPattern, searchPattern];
    }
    
    // Get total count for pagination
    const countStmt = db.prepare(`
      SELECT COUNT(*) as total 
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN partners p ON s.partner_id = p.id
      ${whereClause}
    `);
    const { total } = countStmt.get(...params) as { total: number };
    
    // Get paginated results
    const stmt = db.prepare(`
      SELECT s.*, c.name as customer_name, p.name as partner_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN partners p ON s.partner_id = p.id
      ${whereClause}
      ORDER BY s.date DESC 
      LIMIT ? OFFSET ?
    `);
    
    const sales = stmt.all(...params, pageSize, offset) as Sale[];
    
    // Get items for each sale
    const itemsStmt = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?');
    sales.forEach(sale => {
      if (sale.id) {
        sale.items = itemsStmt.all(sale.id) as SaleItem[];
      }
    });
    
    console.timeEnd('sales_query_total');
    return {
      sales,
      total,
      totalPages: Math.ceil(total / pageSize),
      currentPage: page,
      pageSize
    };
  },

  search: (searchTerm: string, limit: number = 50): Sale[] => {
    const db = getDatabase();
    if (!searchTerm.trim()) return [];
    
    const stmt = db.prepare(`
      SELECT s.*, c.name as customer_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE 
        s.sale_number LIKE ? OR 
        c.name LIKE ? OR 
        s.notes LIKE ?
      ORDER BY 
        CASE 
          WHEN s.sale_number LIKE ? THEN 1
          WHEN c.name LIKE ? THEN 2
          WHEN s.notes LIKE ? THEN 3
          ELSE 4
        END,
        s.date DESC
      LIMIT ?
    `);
    
    const searchPattern = `%${searchTerm.trim()}%`;
    const exactPattern = `${searchTerm.trim()}%`;
    
    return stmt.all(
      searchPattern, searchPattern, searchPattern,
      exactPattern, exactPattern, exactPattern,
      limit
    ) as Sale[];
  },

  getById: (id: number): Sale => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT s.*, c.name as customer_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.id = ?
    `);
    const result = stmt.get(id) as Sale;
    if (!result) {
      throw new Error(`Sale with id ${id} not found`);
    }
    return result;
  },

  getByCustomer: (customerId: number): Sale[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT s.*, c.name as customer_name, p.name as partner_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN partners p ON s.partner_id = p.id
      WHERE s.customer_id = ?
      ORDER BY s.date DESC
    `);
    return stmt.all(customerId) as Sale[];
  },

  getByPartner: (partnerId: number): Sale[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT s.*, c.name as customer_name, p.name as partner_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN partners p ON s.partner_id = p.id
      WHERE s.partner_id = ?
      ORDER BY s.date DESC
    `);
    return stmt.all(partnerId) as Sale[];
  },

  getPaginatedByPartner: (partnerId: number, page: number = 1, pageSize: number = 10, searchTerm: string = ''): {
    sales: Sale[];
    total: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  } => {
    const db = getDatabase();
    const offset = (page - 1) * pageSize;
    
    let whereClause = 'WHERE s.partner_id = ?';
    let params: any[] = [partnerId];
    
    if (searchTerm.trim()) {
      whereClause += ' AND (s.sale_number LIKE ? OR c.name LIKE ? OR s.notes LIKE ?)';
      const searchPattern = `%${searchTerm.trim()}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }
    
    // Get total count for pagination
    const countStmt = db.prepare(`
      SELECT COUNT(*) as total 
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN partners p ON s.partner_id = p.id
      ${whereClause}
    `);
    const { total } = countStmt.get(...params) as { total: number };
    
    // Get paginated results
    const stmt = db.prepare(`
      SELECT s.*, c.name as customer_name, p.name as partner_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN partners p ON s.partner_id = p.id
      ${whereClause}
      ORDER BY s.date DESC 
      LIMIT ? OFFSET ?
    `);
    
    const sales = stmt.all(...params, pageSize, offset) as Sale[];
    
    // Get items for each sale
    const itemsStmt = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?');
    sales.forEach(sale => {
      sale.items = itemsStmt.all(sale.id) as SaleItem[];
    });
    
    return {
      sales,
      total,
      totalPages: Math.ceil(total / pageSize),
      currentPage: page,
      pageSize
    };
  },

  create: (saleData: SaleFormData): number => {
    const db = getDatabase();
    
    // Calculate totals
    const subtotal = saleData.items.reduce((sum, item) =>
      sum + (item.quantity * item.unit_price), 0
    );
    const totalAmount = subtotal;
    
    // Generate unique sale number
    const saleNumber = generateUniqueSaleNumber();
    
    // Insert sale
    const saleStmt = db.prepare(`
      INSERT INTO sales (
        customer_id, partner_id, sale_number, date, due_date, subtotal, tax_amount,
        discount_amount, total_amount, payment_type, payment_method, payment_status, period_type,
        number_of_installments, installment_amount, advance_installments,
        transaction_type, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
    `);
    
    const installmentAmount = saleData.payment_type === 'installments' && saleData.number_of_installments
      ? Math.round(totalAmount / saleData.number_of_installments)
      : null;
    
    const saleResult = saleStmt.run(
      saleData.customer_id,
      saleData.partner_id || null,
      saleNumber,
      new Date().toISOString(),
      null, // due_date
      subtotal,
      totalAmount,
      saleData.payment_type,
      saleData.payment_method || null,
      saleData.payment_type === 'cash' ? 'paid' : 'unpaid',
      saleData.period_type || null,
      saleData.number_of_installments || null,
      installmentAmount,
      'sale',
      'completed',
      saleData.notes || null
    );
    
    const saleId = saleResult.lastInsertRowid as number;
    
    // Insert sale items
    const itemStmt = db.prepare(`
      INSERT INTO sale_items (
        sale_id, product_id, quantity, unit_price, discount_per_item,
        line_total, product_name, status, returned_quantity
      ) VALUES (?, ?, ?, ?, 0, ?, ?, 'active', 0)
    `);
    
    for (const item of saleData.items) {
      const lineTotal = (item.quantity * item.unit_price);
      let productName: string | null = null;
      if (item.product_id != null) {
        try {
          const p = productOperations.getById(item.product_id);
          productName = p?.name || null;
        } catch (_) {
          productName = null;
        }
      }
      if (!productName) {
        productName = item.product_name || (item.product_id != null ? `Producto ${item.product_id}` : 'Producto sin catálogo');
      }

      itemStmt.run(
        saleId,
        item.product_id,
        item.quantity,
        item.unit_price,
        lineTotal,
        productName
      );

      // Decrement product stock if the item references a catalog product
      if (item.product_id != null) {
        try {
          const product = productOperations.getById(item.product_id);
          // Only update stock if it exists (not null/undefined)
          if (product && product.stock !== undefined && product.stock !== null) {
            const newStock = Math.max(0, (product.stock as number) - item.quantity);
            productOperations.update(item.product_id, { stock: newStock });
          }
        } catch (e) {
          // If product lookup fails, skip stock update to avoid breaking sale creation
        }
      }
    }
    
    // Create installments if needed
    if (saleData.payment_type === 'installments' && saleData.number_of_installments) {
      const monthlyAmount = Math.round(totalAmount / saleData.number_of_installments);

      // Determine customer's payment window anchor day (end of window)
      const customerWindowRow = db.prepare('SELECT payment_window FROM customers WHERE id = ?').get(saleData.customer_id) as { payment_window?: string } | undefined;
      // Use customer's payment window if defined; otherwise fallback to saleData.payment_period
      const fallbackPeriod = saleData.payment_period;
      const anchorDay = customerWindowRow?.payment_window === '1 to 10' ? 10
        : customerWindowRow?.payment_window === '20 to 30' ? 30
        : fallbackPeriod === '1 to 10' ? 10
        : fallbackPeriod === '20 to 30' ? 30
        : 30; // default to end-of-month window

      // If customer has no defined window but sale provided a period, persist it for future sales
      const needsCustomerWindowUpdate = (!customerWindowRow?.payment_window || (customerWindowRow.payment_window !== '1 to 10' && customerWindowRow.payment_window !== '20 to 30'))
        && (fallbackPeriod === '1 to 10' || fallbackPeriod === '20 to 30');
      if (needsCustomerWindowUpdate) {
        try {
          customerOperations.update(saleData.customer_id, { payment_window: fallbackPeriod });
        } catch {
          // Do not block sale creation if updating the customer fails
        }
      }

      const installmentStmt = db.prepare(`
        INSERT INTO installments (
          sale_id, installment_number, due_date, amount, paid_amount,
          balance, status, days_overdue, late_fee, late_fee_applied
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const nowDate = new Date();
      for (let i = 1; i <= saleData.number_of_installments; i++) {
        // Compute due date anchored to the customer's window within the target month
        const targetMonthIndex = nowDate.getMonth() + i;
        const targetYear = nowDate.getFullYear() + Math.floor(targetMonthIndex / 12);
        const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
        const lastDayOfTargetMonth = new Date(targetYear, normalizedMonth + 1, 0).getDate();
        const day = Math.min(anchorDay, lastDayOfTargetMonth);
        const dueDate = new Date(targetYear, normalizedMonth, day);

        installmentStmt.run(
          saleId,
          i,
          dueDate.toISOString().split('T')[0],
          monthlyAmount,
          0,
          monthlyAmount,
          'pending',
          0,
          0,
          0
        );
      }
    }
    
    return saleId;
  },

  // Import a sale from backup data that may not include items
  importFromBackup: (sale: Partial<Sale> & { items?: Array<{
    product_id: number;
    quantity: number;
    unit_price: number;
    product_name?: string;
  }> }): number => {
    const db = getDatabase();

    // Ensure referenced customer exists; if not, create a stub to satisfy FK
    if (sale.customer_id == null) {
      throw new Error('customer_id es requerido para importar una venta');
    }
    const customerCheck = db.prepare('SELECT 1 FROM customers WHERE id = ?').get(sale.customer_id);
    if (!customerCheck) {
      customerOperations.insertFromBackup({
        id: sale.customer_id,
        name: sale.customer_name || `Cliente ${sale.customer_id}`,
      } as Customer);
    }

    const saleNumber = ensureUniqueSaleNumber(sale.sale_number);

    const date = sale.date || new Date().toISOString();
    const subtotal = typeof sale.subtotal === 'number' ? sale.subtotal : 0;
    const totalAmount = typeof sale.total_amount === 'number' ? sale.total_amount : subtotal;
    const paymentType: 'cash' | 'installments' = (sale.payment_type === 'installments') ? 'installments' : 'cash';
    const paymentStatus: 'paid' | 'unpaid' = (sale.payment_status === 'paid' || paymentType === 'cash') ? 'paid' : 'unpaid';
    const numberOfInstallments = sale.number_of_installments || null;
    const installmentAmount = typeof sale.installment_amount === 'number'
      ? sale.installment_amount
      : (numberOfInstallments ? Math.round(totalAmount / numberOfInstallments) : null);
    const status: 'pending' | 'completed' = sale.status === 'pending' ? 'pending' : 'completed';
    const transactionType: 'sale' = 'sale';
    const notes = sale.notes || null;

    // Insert sale row
    const saleStmt = db.prepare(`
      INSERT INTO sales (
        customer_id, sale_number, date, due_date, subtotal, tax_amount,
        discount_amount, total_amount, payment_type, payment_method, payment_status, period_type,
        number_of_installments, installment_amount, advance_installments,
        transaction_type, status, notes
      ) VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
    `);

    const saleResult = saleStmt.run(
      sale.customer_id!,
      saleNumber,
      date,
      sale.due_date || null,
      subtotal,
      
      totalAmount,
      paymentType,
      sale.payment_method || null,
      paymentStatus,
      sale.period_type || null,
      numberOfInstallments,
      installmentAmount,
      transactionType,
      status,
      notes
    );

    const saleId = saleResult.lastInsertRowid as number;

    // Insert sale items if provided in backup
    if (sale.items && Array.isArray(sale.items) && sale.items.length > 0) {
      const itemStmt = db.prepare(`
        INSERT INTO sale_items (
          sale_id, product_id, quantity, unit_price, discount_per_item,
          line_total, product_name, product_description, status, returned_quantity
        ) VALUES (?, ?, ?, ?, 0, ?, ?, ?, 'active', 0)
      `);
      for (const item of sale.items) {
        const lineTotal = (item.quantity * item.unit_price);
        let productName = item.product_name || null;
        if (!productName) {
          try {
            const p = productOperations.getById(item.product_id);
            productName = p?.name || null;
          } catch (_) {
            productName = null;
          }
        }
        if (!productName) {
          productName = `Producto ${item.product_id}`;
        }
        itemStmt.run(
          saleId,
          item.product_id,
          item.quantity,
          item.unit_price,
          lineTotal,
          productName,
          null
        );
      }
    }

    // Recreate installments if needed based on sale fields
    if (paymentType === 'installments' && numberOfInstallments) {
      const monthlyAmount = installmentAmount || Math.round(totalAmount / numberOfInstallments);
      const installmentStmt = db.prepare(`
        INSERT INTO installments (
          sale_id, installment_number, due_date, amount, paid_amount,
          balance, status, days_overdue, late_fee, late_fee_applied
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      // Determine customer's payment window anchor day (end of window)
      const customerWindowRow = db.prepare('SELECT payment_window FROM customers WHERE id = ?').get(sale.customer_id) as { payment_window?: string } | undefined;
      const anchorDay = customerWindowRow?.payment_window === '1 to 10' ? 10
        : customerWindowRow?.payment_window === '20 to 30' ? 30
        : 30;

      const baseDate = new Date(date);
      for (let i = 1; i <= numberOfInstallments; i++) {
        const targetMonthIndex = baseDate.getMonth() + i;
        const targetYear = baseDate.getFullYear() + Math.floor(targetMonthIndex / 12);
        const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
        const lastDayOfTargetMonth = new Date(targetYear, normalizedMonth + 1, 0).getDate();
        const day = Math.min(anchorDay, lastDayOfTargetMonth);
        const dueDate = new Date(targetYear, normalizedMonth, day);
        installmentStmt.run(
          saleId,
          i,
          dueDate.toISOString().split('T')[0],
          monthlyAmount,
          0,
          monthlyAmount,
          'pending',
          0,
          0,
          0
        );
      }
    }

    return saleId;
  },

  update: (id: number, sale: Partial<Sale>): void => {
    const db = getDatabase();
    const fields = [];
    const values = [];
    
    // Add updatable fields
    const updatableFields = [
      'customer_id', 'due_date', 'tax_amount', 'discount_amount',
      'payment_status', 'status', 'notes'
    ];
    
    for (const field of updatableFields) {
      if (sale[field as keyof Sale] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(sale[field as keyof Sale]);
      }
    }
    
    if (fields.length === 0) return;
    
    values.push(id);
    const stmt = db.prepare(`UPDATE sales SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);
  },

  delete: (id: number): void => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM sales WHERE id = ?');
    stmt.run(id);
  },

  getCount: (): number => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT COUNT(*) as count FROM sales');
    const result = stmt.get() as { count: number };
    return result.count;
  },

  getTotalRevenue: (): number => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as total
      FROM sales
    `);
    const result = stmt.get() as { total: number };
    return result.total;
  },

  getRecent: (limit: number = 5): Sale[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT s.*, c.name as customer_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      ORDER BY s.created_at DESC 
      LIMIT ?
    `);
    return stmt.all(limit) as Sale[];
  },

  getSalesChartData: (days: number = 30): Array<{ date: string; sales: number; revenue: number }> => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT 
        strftime('%Y-%m-%d', date) as date,
        COUNT(*) as sales,
        COALESCE(SUM(total_amount), 0) as revenue
      FROM sales 
      WHERE date >= date('now', '-' || ? || ' days')
      GROUP BY strftime('%Y-%m-%d', date)
      ORDER BY date
    `);
    return stmt.all(days) as Array<{ date: string; sales: number; revenue: number }>;
  },

  getStatsComparison: (): { current: number; previous: number; change: number } => {
    const db = getDatabase();
    const currentMonthStmt = db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as total FROM sales 
      WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now') AND status != 'refunded'
    `);
    const previousMonthStmt = db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as total FROM sales 
      WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now', '-1 month') AND status != 'refunded'
    `);
    
    const current = (currentMonthStmt.get() as { total: number }).total;
    const previous = (previousMonthStmt.get() as { total: number }).total;
    const change = previous === 0 ? 0 : ((current - previous) / previous) * 100;
    
    return { current, previous, change };
  },

  getWithDetails: (id: number): Sale => {
    const sale = saleOperations.getById(id);
    sale.items = saleItemOperations.getBySale(id);
    sale.installments = installmentOperations.getBySale(id);
    return sale;
  },

  getOverdueSales: (): Sale[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT DISTINCT s.*, c.name as customer_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN installments i ON s.id = i.sale_id
      WHERE i.status = 'overdue' OR (s.payment_status = 'unpaid' AND s.due_date < date('now'))
      ORDER BY s.date DESC
    `);
    return stmt.all() as Sale[];
  },

  getOverdueSalesCount: (): number => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT COUNT(DISTINCT s.id) AS count
      FROM sales s
      LEFT JOIN installments i ON s.id = i.sale_id
      WHERE i.status = 'overdue' OR (s.payment_status = 'unpaid' AND s.due_date < date('now'))
    `);
    const result = stmt.get() as { count: number };
    return result.count;
  },
  deleteAll: (): void => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM sales');
    stmt.run();
  }
};

export const saleItemOperations = {
  getBySale: (saleId: number): SaleItem[] => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?');
    return stmt.all(saleId) as SaleItem[];
  },

  create: (saleItem: Omit<SaleItem, 'id'>): number => {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO sale_items (
        sale_id, product_id, quantity, unit_price, discount_per_item,
        line_total, product_name, product_description, status, returned_quantity
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      saleItem.sale_id,
      saleItem.product_id,
      saleItem.quantity,
      saleItem.unit_price,
      saleItem.line_total,
      saleItem.product_name,
      saleItem.product_description || null,
      saleItem.status,
      saleItem.returned_quantity
    );
    return result.lastInsertRowid as number;
  },

  getSalesForProduct: (productId: number): Array<{ sale_id: number; sale_number: string; date: string; customer_id: number; customer_name: string }> => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT DISTINCT 
        s.id AS sale_id,
        s.sale_number AS sale_number,
        s.date AS date,
        s.customer_id AS customer_id,
        c.name AS customer_name
      FROM sale_items si
      INNER JOIN sales s ON si.sale_id = s.id
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE si.product_id = ?
      ORDER BY s.date DESC
    `);
    return stmt.all(productId) as Array<{ sale_id: number; sale_number: string; date: string; customer_id: number; customer_name: string }>;
  },

  deleteAll: (): void => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM sale_items');
    stmt.run();
  }
};

export const installmentOperations = {
  getBySale: (saleId: number): Installment[] => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM installments WHERE sale_id = ? ORDER BY installment_number');
    return stmt.all(saleId) as Installment[];
  },

  getOverdue: (): Installment[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT i.*, c.name as customerName, s.sale_number
      FROM installments i
      JOIN sales s ON i.sale_id = s.id
      JOIN customers c ON s.customer_id = c.id
      WHERE i.status IN ('pending') 
      AND i.due_date < date('now')
      AND i.balance > 0
      ORDER BY i.due_date
    `);
    return stmt.all() as Installment[];
  },

  getUpcoming: (limit: number = 5): Array<Installment & { customer_name: string; sale_number: string; customer_id: number }> => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT 
        i.*,
        c.name as customer_name,
        s.sale_number,
        s.customer_id as customer_id
      FROM installments i
      JOIN sales s ON i.sale_id = s.id
      JOIN customers c ON s.customer_id = c.id
      WHERE i.status IN ('pending') 
      AND i.due_date >= date('now')
      AND i.due_date <= date('now', '+30 days')
      AND i.balance > 0
      ORDER BY i.due_date ASC
      LIMIT ?
    `);
    return stmt.all(limit) as Array<Installment & { customer_name: string; sale_number: string; customer_id: number }>;
  },

  recordPayment: (installmentId: number, amount: number, paymentMethod: string, reference?: string): void => {
    const db = getDatabase();
    
    // Get current installment
    const installment = db.prepare('SELECT * FROM installments WHERE id = ?').get(installmentId) as Installment;
    if (!installment) {
      throw new Error(`Installment with id ${installmentId} not found`);
    }
    
    // Enforce full-payment only
    const expectedAmount = installment.amount - installment.paid_amount;
    if (amount !== expectedAmount) {
      throw new Error(`Solo se permiten pagos completos. Monto esperado: ${expectedAmount}`);
    }
    const newPaidAmount = installment.amount;
    const newBalance = 0;
    const newStatus: 'paid' = 'paid';
    
    const updateStmt = db.prepare(`
      UPDATE installments
      SET paid_amount = ?, balance = ?, status = ?, paid_date = ?
      WHERE id = ?
    `);
    updateStmt.run(newPaidAmount, newBalance, newStatus, new Date().toISOString(), installmentId);
    
    // Create payment transaction
    const paymentStmt = db.prepare(`
      INSERT INTO payment_transactions (
        sale_id, installment_id, amount, payment_method, payment_reference,
        transaction_date, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    paymentStmt.run(
      installment.sale_id,
      installmentId,
      expectedAmount,
      paymentMethod,
      reference || null,
      new Date().toISOString(),
      'completed'
    );
  },

  applyLateFee: (installmentId: number, fee: number): void => {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE installments
      SET late_fee = ?, late_fee_applied = 1, amount = amount + ?
      WHERE id = ?
    `);
    stmt.run(fee, fee, installmentId);
  },

  revertPayment: (installmentId: number, transactionId: number): void => {
    const db = getDatabase();
    
    // Get the payment transaction to revert
    const transactionStmt = db.prepare('SELECT * FROM payment_transactions WHERE id = ?');
    const transaction = transactionStmt.get(transactionId) as PaymentTransaction;
    
    if (!transaction) {
      throw new Error(`Payment transaction with id ${transactionId} not found`);
    }
    
    // Get current installment
    const installment = db.prepare('SELECT * FROM installments WHERE id = ?').get(installmentId) as Installment;
    if (!installment) {
      throw new Error(`Installment with id ${installmentId} not found`);
    }
    
    // Only allow revert if it reverts a full payment to pending
    if (installment.paid_amount !== installment.amount || transaction.amount !== installment.amount) {
      throw new Error('Solo se puede revertir pagos completos de la cuota');
    }
    const newPaidAmount = 0;
    const newBalance = installment.amount;
    const newStatus: 'pending' = 'pending';
    
    // Update installment
    const updateStmt = db.prepare(`
      UPDATE installments
      SET paid_amount = ?, balance = ?, status = ?
      WHERE id = ?
    `);
    updateStmt.run(newPaidAmount, newBalance, newStatus, installmentId);
    
    // Mark the payment transaction as cancelled
    const cancelTransactionStmt = db.prepare(`
      UPDATE payment_transactions
      SET status = 'cancelled'
      WHERE id = ?
    `);
    cancelTransactionStmt.run(transactionId);
  },

  // Generic update for installments (e.g., due_date or status)
  update: (id: number, data: Partial<Installment>): void => {
    const db = getDatabase();
    const fields: string[] = [];
    const values: any[] = [];
    const allowed = [
      'due_date', 'status', 'amount', 'paid_amount', 'balance',
      'days_overdue', 'late_fee', 'late_fee_applied', 'notes'
    ];

    for (const key of allowed) {
      const value = (data as any)[key];
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) return;

    values.push(id);
    const stmt = db.prepare(`UPDATE installments SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);
  },

  create: (installment: Omit<Installment, 'id' | 'created_at' | 'updated_at'>): number => {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO installments (
        sale_id, installment_number, due_date, amount, paid_amount,
        balance, status, paid_date, days_overdue, late_fee, late_fee_applied, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      installment.sale_id,
      installment.installment_number,
      installment.due_date,
      installment.amount,
      installment.paid_amount,
      installment.balance,
      installment.status,
      installment.paid_date || null,
      installment.days_overdue,
      installment.late_fee,
      installment.late_fee_applied ? 1 : 0,
      installment.notes || null
    );
    return result.lastInsertRowid as number;
  },

  markAsPaid: (id: number): void => {
    const db = getDatabase();
    const installment = db.prepare('SELECT * FROM installments WHERE id = ?').get(id) as Installment;
    if (!installment) {
      throw new Error(`Installment with id ${id} not found`);
    }
    
    // Calculate the remaining amount to be paid
    const remainingAmount = installment.amount - installment.paid_amount;
    
    // Update installment to mark as paid
    const stmt = db.prepare(`
      UPDATE installments
      SET paid_amount = amount, balance = 0, status = 'paid', paid_date = ?
      WHERE id = ?
    `);
    stmt.run(new Date().toISOString(), id);
    
    // Create a payment transaction record for the remaining amount
    if (remainingAmount > 0) {
      const paymentStmt = db.prepare(`
        INSERT INTO payment_transactions (
          sale_id, installment_id, amount, payment_method, payment_reference,
          transaction_date, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      paymentStmt.run(
        installment.sale_id,
        id,
        remainingAmount,
        'cash',
        'Marcado como pagado',
        new Date().toISOString(),
        'completed'
      );
    }
  },

  delete: (id: number): void => {
    const db = getDatabase();
    
    // First check if installment exists
    const installment = db.prepare('SELECT * FROM installments WHERE id = ?').get(id) as Installment;
    if (!installment) {
      throw new Error(`Installment with id ${id} not found`);
    }
    
    // Delete related payment transactions first
    const deletePaymentsStmt = db.prepare('DELETE FROM payment_transactions WHERE installment_id = ?');
    deletePaymentsStmt.run(id);
    
    // Delete the installment
    const stmt = db.prepare('DELETE FROM installments WHERE id = ?');
    stmt.run(id);
  },

  deleteAll: (): void => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM installments');
    stmt.run();
  }
};

export const paymentOperations = {
  getBySale: (saleId: number): PaymentTransaction[] => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM payment_transactions WHERE sale_id = ? ORDER BY transaction_date DESC');
    return stmt.all(saleId) as PaymentTransaction[];
  },

  create: (payment: Omit<PaymentTransaction, 'id' | 'created_at'>): number => {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO payment_transactions (
        sale_id, installment_id, amount, payment_method, payment_reference,
        transaction_date, processed_by, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      payment.sale_id,
      payment.installment_id || null,
      payment.amount,
      payment.payment_method,
      payment.payment_reference || null,
      payment.transaction_date,
      payment.processed_by || null,
      payment.status,
      payment.notes || null
    );
    return result.lastInsertRowid as number;
  },

  getOverdue: (): PaymentTransaction[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT pt.* FROM payment_transactions pt
      JOIN installments i ON pt.installment_id = i.id
      WHERE i.status = 'overdue' OR (pt.status = 'pending' AND i.due_date < date('now'))
      ORDER BY i.due_date
    `);
    return stmt.all() as PaymentTransaction[];
  },

  deleteAll: (): void => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM payment_transactions');
    stmt.run();
  }
};

export interface NotificationRecord {
  id?: number;
  user_id?: number;
  message: string;
  type: 'attention' | 'alert' | 'info';
  read_at?: string;
  created_at?: string;
  deleted_at?: string;
  message_key?: string;
}

export const notificationOperations = {
  list: (limit: number = 20): NotificationRecord[] => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM notifications WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT ?');
    return stmt.all(limit) as NotificationRecord[];
  },
  markRead: (id: number): void => {
    const db = getDatabase();
    db.prepare("UPDATE notifications SET read_at = datetime('now') WHERE id = ? AND read_at IS NULL").run(id);
  },
  markUnread: (id: number): void => {
    const db = getDatabase();
    db.prepare("UPDATE notifications SET read_at = NULL WHERE id = ?").run(id);
  },
  delete: (id: number): void => {
    const db = getDatabase();
    db.prepare("UPDATE notifications SET deleted_at = datetime('now') WHERE id = ? AND deleted_at IS NULL").run(id);
  },
  // Nuevo: eliminar todas las notificaciones con el mismo mensaje creadas hoy
  deleteByMessageToday: (message: string): void => {
    const db = getDatabase();
    db.prepare("UPDATE notifications SET deleted_at = datetime('now') WHERE message = ? AND date(created_at) = date('now') AND deleted_at IS NULL").run(message);
  },
  // Nuevo: eliminar por clave semántica creadas hoy
  deleteByKeyToday: (key: string): void => {
    const db = getDatabase();
    db.prepare("UPDATE notifications SET deleted_at = datetime('now') WHERE message_key = ? AND date(created_at) = date('now') AND deleted_at IS NULL").run(key);
  },
  create: (message: string, type: 'attention' | 'alert' | 'info' = 'info', message_key?: string): number => {
    const db = getDatabase();
    const res = db
      .prepare('INSERT INTO notifications (message, type, message_key) VALUES (?, ?, ?)')
      .run(message, type, message_key ?? null);
    return res.lastInsertRowid as number;
  },
  existsTodayWithMessage: (message: string): boolean => {
    const db = getDatabase();
    const row = db
      .prepare("SELECT COUNT(*) as cnt FROM notifications WHERE message = ? AND (date(created_at) = date('now') OR date(deleted_at) = date('now'))")
      .get(message) as { cnt: number } | undefined;
    return !!row && row.cnt > 0;
  },
  // Nuevo: existencia por clave semántica (incluye eliminadas hoy)
  existsTodayWithKey: (key: string): boolean => {
    const db = getDatabase();
    const row = db
      .prepare("SELECT COUNT(*) as cnt FROM notifications WHERE message_key = ? AND (date(created_at) = date('now') OR date(deleted_at) = date('now'))")
      .get(key) as { cnt: number } | undefined;
    return !!row && row.cnt > 0;
  },
  // Nuevo: existencia activa por clave (sin importar el día)
  existsActiveWithKey: (key: string): boolean => {
    const db = getDatabase();
    const row = db
      .prepare("SELECT COUNT(*) as cnt FROM notifications WHERE message_key = ? AND deleted_at IS NULL")
      .get(key) as { cnt: number } | undefined;
    return !!row && row.cnt > 0;
  },
  // Nuevo: existencia activa por mensaje (sin importar el día)
  existsActiveWithMessage: (message: string): boolean => {
    const db = getDatabase();
    const row = db
      .prepare("SELECT COUNT(*) as cnt FROM notifications WHERE message = ? AND deleted_at IS NULL")
      .get(message) as { cnt: number } | undefined;
    return !!row && row.cnt > 0;
  },
  // Clear all active notifications via soft-delete to keep history
  clearAll: (): void => {
    const db = getDatabase();
    db.prepare("UPDATE notifications SET deleted_at = datetime('now') WHERE deleted_at IS NULL").run();
  },
  // List archived (soft-deleted) notifications
  listArchived: (limit: number = 20): NotificationRecord[] => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM notifications WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC LIMIT ?');
    return stmt.all(limit) as NotificationRecord[];
  },
  // Permanently delete archived notifications
  purgeArchived: (): void => {
    const db = getDatabase();
    db.prepare('DELETE FROM notifications WHERE deleted_at IS NOT NULL').run();
  },
  // Fetch latest notification by semantic key (active or archived)
  getLatestByKey: (key: string): NotificationRecord | null => {
    const db = getDatabase();
    const row = db
      .prepare("SELECT * FROM notifications WHERE message_key = ? ORDER BY datetime(created_at) DESC LIMIT 1")
      .get(key) as NotificationRecord | undefined;
    return row ?? null;
  }
};