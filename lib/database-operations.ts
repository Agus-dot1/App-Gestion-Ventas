// Database operations for the sales management system
import { getDatabase } from './database';

export interface Customer {
  id?: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  company?: string;
  notes?: string;
  tags?: string;
  contact_info?: string; // Keep for backward compatibility
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id?: number;
  name: string;
  price: number;
  description?: string;
  category?: string;
  stock?: number;
  is_active: boolean;
}

export interface Sale {
  id?: number;
  customer_id: number;
  sale_number: string;
  date: string;
  due_date?: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_type: 'cash' | 'installments' | 'credit' | 'mixed';
  payment_status: 'paid' | 'partial' | 'unpaid' | 'overdue';
  number_of_installments?: number;
  installment_amount?: number;
  advance_installments: number;
  transaction_type: 'sale' | 'return' | 'exchange' | 'refund';
  status: 'pending' | 'completed' | 'cancelled' | 'refunded';
  created_by?: number;
  created_at?: string;
  updated_at?: string;
  notes?: string;
  parent_sale_id?: number;
  
  // Joined data
  customer_name?: string;
  items?: SaleItem[];
  installments?: Installment[];
}

export interface SaleItem {
  id?: number;
  sale_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  discount_per_item: number;
  line_total: number;
  product_name: string;
  product_description?: string;
  status: 'active' | 'returned' | 'exchanged';
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
  status: 'pending' | 'paid' | 'partial' | 'overdue' | 'cancelled';
  paid_date?: string;
  days_overdue: number;
  late_fee: number;
  late_fee_applied: boolean;
  created_at?: string;
  updated_at?: string;
  notes?: string;
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
  items: Array<{
    product_id: number;
    quantity: number;
    unit_price: number;
    discount_per_item?: number;
  }>;
  payment_type: 'cash' | 'installments' | 'credit' | 'mixed';
  number_of_installments?: number;
  advance_installments?: number;
  tax_amount?: number;
  discount_amount?: number;
  notes?: string;
}

// Declare global electronAPI interface
declare global {
  interface Window {
    electronAPI: {
      database: {
        customers: {
          getAll: () => Promise<Customer[]>;
          getPaginated: (page?: number, pageSize?: number, searchTerm?: string) => Promise<{
            customers: Customer[];
            total: number;
            totalPages: number;
            currentPage: number;
            pageSize: number;
          }>;
          search: (searchTerm: string, limit?: number) => Promise<Customer[]>;
          getById: (id: number) => Promise<Customer>;
          create: (customer: Omit<Customer, 'id' | 'created_at'>) => Promise<number>;
          update: (id: number, customer: Partial<Customer>) => Promise<void>;
          delete: (id: number) => Promise<void>;
          getCount: () => Promise<number>;
          getRecent: (limit?: number) => Promise<Customer[]>;
          getMonthlyComparison: () => Promise<{ current: number; previous: number; change: number }>;
        };
        products: {
          getAll: () => Promise<Product[]>;
          getPaginated: (page?: number, pageSize?: number, searchTerm?: string) => Promise<{
            products: Product[];
            total: number;
            totalPages: number;
            currentPage: number;
            pageSize: number;
          }>;
          search: (searchTerm: string, limit?: number) => Promise<Product[]>;
          getById: (id: number) => Promise<Product>;
          getActive: () => Promise<Product[]>;
          create: (product: Omit<Product, 'id'>) => Promise<number>;
          update: (id: number, product: Partial<Product>) => Promise<void>;
          delete: (id: number) => Promise<void>;
          getCount: () => Promise<number>;
          getMonthlyComparison: () => Promise<{ current: number; previous: number; change: number }>;
        };
        sales: {
          getAll: () => Promise<Sale[]>;
          getPaginated: (page?: number, pageSize?: number, searchTerm?: string) => Promise<{
            sales: Sale[];
            total: number;
            totalPages: number;
            currentPage: number;
            pageSize: number;
          }>;
          search: (searchTerm: string, limit?: number) => Promise<Sale[]>;
          getById: (id: number) => Promise<Sale>;
          getByCustomer: (customerId: number) => Promise<Sale[]>;
          create: (sale: SaleFormData) => Promise<number>;
          update: (id: number, sale: Partial<Sale>) => Promise<void>;
          delete: (id: number) => Promise<void>;
          getWithDetails: (id: number) => Promise<Sale>;
          getOverdueSales: () => Promise<Sale[]>;
          getCount: () => Promise<number>;
          getTotalRevenue: () => Promise<number>;
          getRecent: (limit?: number) => Promise<Sale[]>;
          getSalesChartData: (days?: number) => Promise<Array<{ date: string; sales: number; revenue: number }>>;
          getStatsComparison: () => Promise<{ current: number; previous: number; change: number }>;
        };
        installments: {
          getBySale: (saleId: number) => Promise<Installment[]>;
          getOverdue: () => Promise<Installment[]>;
          create: (installment: Omit<Installment, 'id' | 'created_at' | 'updated_at'>) => Promise<number>;
          recordPayment: (installmentId: number, amount: number, paymentMethod: string, reference?: string) => Promise<void>;
          revertPayment: (installmentId: number, transactionId: number) => Promise<void>;
          applyLateFee: (installmentId: number, fee: number) => Promise<void>;
        };
        payments: {
          getBySale: (saleId: number) => Promise<PaymentTransaction[]>;
          create: (payment: Omit<PaymentTransaction, 'id' | 'created_at'>) => Promise<number>;
        };
        saleItems: {
          getBySale: (saleId: number) => Promise<SaleItem[]>;
          create: (saleItem: Omit<SaleItem, 'id'>) => Promise<number>;
        };
      };
    };
  }
}

// Database operation implementations
export const customerOperations = {
  getAll: (): Customer[] => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM customers ORDER BY name');
    return stmt.all() as Customer[];
  },

  // Optimized pagination function
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
        name LIKE ? OR 
        email LIKE ? OR 
        company LIKE ? OR 
        tags LIKE ? OR
        phone LIKE ?`;
      const searchPattern = `%${searchTerm.trim()}%`;
      params = [searchPattern, searchPattern, searchPattern, searchPattern, searchPattern];
    }
    
    // Get total count for pagination
    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM customers ${whereClause}`);
    const { total } = countStmt.get(...params) as { total: number };
    
    // Get paginated results with optimized query
    const stmt = db.prepare(`
      SELECT * FROM customers 
      ${whereClause}
      ORDER BY name 
      LIMIT ? OFFSET ?
    `);
    
    const customers = stmt.all(...params, pageSize, offset) as Customer[];
    
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
        name LIKE ? OR 
        email LIKE ? OR 
        company LIKE ? OR 
        tags LIKE ? OR
        phone LIKE ?
      ORDER BY 
        CASE 
          WHEN name LIKE ? THEN 1
          WHEN email LIKE ? THEN 2
          WHEN company LIKE ? THEN 3
          ELSE 4
        END,
        name
      LIMIT ?
    `);
    
    const searchPattern = `%${searchTerm.trim()}%`;
    const exactPattern = `${searchTerm.trim()}%`;
    
    return stmt.all(
      searchPattern, searchPattern, searchPattern, searchPattern, searchPattern,
      exactPattern, exactPattern, exactPattern,
      limit
    ) as Customer[];
  },

  getById: (id: number): Customer => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM customers WHERE id = ?');
    const result = stmt.get(id) as Customer;
    if (!result) {
      throw new Error(`Customer with id ${id} not found`);
    }
    return result;
  },

  create: (customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): number => {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO customers (name, email, phone, address, company, notes, tags, contact_info) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      customer.name,
      customer.email || null,
      customer.phone || null,
      customer.address || null,
      customer.company || null,
      customer.notes || null,
      customer.tags || null,
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
    if (customer.email !== undefined) {
      fields.push('email = ?');
      values.push(customer.email);
    }
    if (customer.phone !== undefined) {
      fields.push('phone = ?');
      values.push(customer.phone);
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
    if (customer.tags !== undefined) {
      fields.push('tags = ?');
      values.push(customer.tags);
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
    return stmt.all(limit) as Customer[];
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
    const stmt = db.prepare('INSERT INTO products (name, price, description, category, stock, is_active) VALUES (?, ?, ?, ?, ?, ?)');
    const result = stmt.run(
      product.name, 
      product.price, 
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
    // Since products table doesn't have created_at column, return total active products
    // This is a placeholder implementation - in a real scenario, you'd need to add created_at to products
    const totalStmt = db.prepare('SELECT COUNT(*) as count FROM products WHERE is_active = 1');
    const total = (totalStmt.get() as { count: number }).count;
    
    // Return same count for both months as placeholder
    return { current: total, previous: total, change: 0 };
  }
};

export const saleOperations = {
  getAll: (): Sale[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT s.*, c.name as customer_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
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
      ${whereClause}
    `);
    const { total } = countStmt.get(...params) as { total: number };
    
    // Get paginated results
    const stmt = db.prepare(`
      SELECT s.*, c.name as customer_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      ${whereClause}
      ORDER BY s.date DESC 
      LIMIT ? OFFSET ?
    `);
    
    const sales = stmt.all(...params, pageSize, offset) as Sale[];
    
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
      SELECT s.*, c.name as customer_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.customer_id = ?
      ORDER BY s.date DESC
    `);
    return stmt.all(customerId) as Sale[];
  },

  create: (saleData: SaleFormData): number => {
    const db = getDatabase();
    
    // Calculate totals
    const subtotal = saleData.items.reduce((sum, item) =>
      sum + (item.quantity * item.unit_price) - (item.discount_per_item || 0), 0
    );
    const totalAmount = subtotal + (saleData.tax_amount || 0) - (saleData.discount_amount || 0);
    
    // Generate sale number with a more readable format
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    // Get the count of sales for today to create a sequential number
    const todayStart = `${year}-${month}-${day}`;
    const todayCountStmt = db.prepare(`
      SELECT COUNT(*) as count FROM sales 
      WHERE date(date) = date(?)
    `);
    const todayCount = (todayCountStmt.get(todayStart) as { count: number }).count + 1;
    const sequentialNumber = String(todayCount).padStart(3, '0');
    
    const saleNumber = `VENTA-${year}${month}${day}-${sequentialNumber}`;
    
    // Insert sale
    const saleStmt = db.prepare(`
      INSERT INTO sales (
        customer_id, sale_number, date, due_date, subtotal, tax_amount,
        discount_amount, total_amount, payment_type, payment_status,
        number_of_installments, installment_amount, advance_installments,
        transaction_type, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const installmentAmount = saleData.payment_type === 'installments' && saleData.number_of_installments
      ? totalAmount / saleData.number_of_installments
      : null;
    
    const saleResult = saleStmt.run(
      saleData.customer_id,
      saleNumber,
      new Date().toISOString(),
      null, // due_date
      subtotal,
      saleData.tax_amount || 0,
      saleData.discount_amount || 0,
      totalAmount,
      saleData.payment_type,
      saleData.payment_type === 'cash' ? 'paid' : 'unpaid',
      saleData.number_of_installments || null,
      installmentAmount,
      saleData.advance_installments || 0, // advance_installments
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const item of saleData.items) {
      const product = productOperations.getById(item.product_id);
      const lineTotal = (item.quantity * item.unit_price) - (item.discount_per_item || 0);
      
      itemStmt.run(
        saleId,
        item.product_id,
        item.quantity,
        item.unit_price,
        item.discount_per_item || 0,
        lineTotal,
        product.name,
        'active',
        0
      );
    }
    
    // Create installments if needed
    if (saleData.payment_type === 'installments' && saleData.number_of_installments) {
      const monthlyAmount = totalAmount / saleData.number_of_installments;
      const advanceInstallments = saleData.advance_installments || 0;
      
      const installmentStmt = db.prepare(`
        INSERT INTO installments (
          sale_id, installment_number, due_date, amount, paid_amount,
          balance, status, days_overdue, late_fee, late_fee_applied
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      for (let i = 1; i <= saleData.number_of_installments; i++) {
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + i);
        
        // Mark advance installments as paid
        const isPaid = i <= advanceInstallments;
        
        installmentStmt.run(
          saleId,
          i,
          dueDate.toISOString().split('T')[0],
          monthlyAmount,
          isPaid ? monthlyAmount : 0,
          isPaid ? 0 : monthlyAmount,
          isPaid ? 'paid' : 'pending',
          0,
          0,
          0
        );
      }
      
      // Create payment transactions for advance installments
      if (advanceInstallments > 0) {
        const paymentStmt = db.prepare(`
           INSERT INTO payment_transactions (
             sale_id, installment_id, amount, payment_method, payment_reference,
             transaction_date, status
           ) VALUES (?, ?, ?, ?, ?, ?, ?)
         `);
        
        // Get the created installment IDs for advance payments
        const installmentIds = db.prepare(`
          SELECT id FROM installments 
          WHERE sale_id = ? AND installment_number <= ?
          ORDER BY installment_number
        `).all(saleId, advanceInstallments);
        
        installmentIds.forEach((installment: any) => {
          paymentStmt.run(
            saleId,
            installment.id,
            monthlyAmount,
            'cash',
            'Pago adelantado',
            new Date().toISOString(),
            'completed'
          );
        });
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
      WHERE status != 'refunded'
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
        strftime('%Y-%m', date) as date,
        COUNT(*) as sales,
        COALESCE(SUM(total_amount), 0) as revenue
      FROM sales 
      WHERE status != 'cancelled' AND date >= date('now', '-' || ? || ' days')
      GROUP BY strftime('%Y-%m', date)
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
      saleItem.discount_per_item,
      saleItem.line_total,
      saleItem.product_name,
      saleItem.product_description || null,
      saleItem.status,
      saleItem.returned_quantity
    );
    return result.lastInsertRowid as number;
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
      SELECT * FROM installments
      WHERE status IN ('pending', 'partial') AND due_date < date('now')
      ORDER BY due_date
    `);
    return stmt.all() as Installment[];
  },

  recordPayment: (installmentId: number, amount: number, paymentMethod: string, reference?: string): void => {
    const db = getDatabase();
    
    // Get current installment
    const installment = db.prepare('SELECT * FROM installments WHERE id = ?').get(installmentId) as Installment;
    if (!installment) {
      throw new Error(`Installment with id ${installmentId} not found`);
    }
    
    // Update installment
    const newPaidAmount = installment.paid_amount + amount;
    const newBalance = installment.amount - newPaidAmount;
    const newStatus = newBalance <= 0 ? 'paid' : 'partial';
    
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
      amount,
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
    
    // Calculate new values after reverting the payment
    const newPaidAmount = installment.paid_amount - transaction.amount;
    const newBalance = installment.amount - newPaidAmount;
    const newStatus = newBalance <= 0 ? 'paid' : newBalance === installment.amount ? 'pending' : 'partial';
    
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
    
    const stmt = db.prepare(`
      UPDATE installments
      SET paid_amount = amount, balance = 0, status = 'paid', paid_date = ?
      WHERE id = ?
    `);
    stmt.run(new Date().toISOString(), id);
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
  }
};