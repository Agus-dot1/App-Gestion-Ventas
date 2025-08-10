// Database operations for the sales management system
import { getDatabase } from './database';

export interface Customer {
  id?: number;
  name: string;
  contact_info?: string;
  created_at?: string;
}

export interface Product {
  id?: number;
  name: string;
  price: number;
  description?: string;
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
  down_payment: number;
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
  down_payment?: number;
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
          getById: (id: number) => Promise<Customer>;
          create: (customer: Omit<Customer, 'id' | 'created_at'>) => Promise<number>;
          update: (id: number, customer: Partial<Customer>) => Promise<void>;
          delete: (id: number) => Promise<void>;
        };
        products: {
          getAll: () => Promise<Product[]>;
          getById: (id: number) => Promise<Product>;
          getActive: () => Promise<Product[]>;
          create: (product: Omit<Product, 'id'>) => Promise<number>;
          update: (id: number, product: Partial<Product>) => Promise<void>;
          delete: (id: number) => Promise<void>;
        };
        sales: {
          getAll: () => Promise<Sale[]>;
          getById: (id: number) => Promise<Sale>;
          getByCustomer: (customerId: number) => Promise<Sale[]>;
          create: (sale: SaleFormData) => Promise<number>;
          update: (id: number, sale: Partial<Sale>) => Promise<void>;
          delete: (id: number) => Promise<void>;
          getWithDetails: (id: number) => Promise<Sale>;
          getOverdueSales: () => Promise<Sale[]>;
        };
        installments: {
          getBySale: (saleId: number) => Promise<Installment[]>;
          getOverdue: () => Promise<Installment[]>;
          recordPayment: (installmentId: number, amount: number, paymentMethod: string, reference?: string) => Promise<void>;
          applyLateFee: (installmentId: number, fee: number) => Promise<void>;
        };
        payments: {
          getBySale: (saleId: number) => Promise<PaymentTransaction[]>;
          create: (payment: Omit<PaymentTransaction, 'id' | 'created_at'>) => Promise<number>;
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

  getById: (id: number): Customer => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM customers WHERE id = ?');
    const result = stmt.get(id) as Customer;
    if (!result) {
      throw new Error(`Customer with id ${id} not found`);
    }
    return result;
  },

  create: (customer: Omit<Customer, 'id' | 'created_at'>): number => {
    const db = getDatabase();
    const stmt = db.prepare('INSERT INTO customers (name, contact_info) VALUES (?, ?)');
    const result = stmt.run(customer.name, customer.contact_info || null);
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
    if (customer.contact_info !== undefined) {
      fields.push('contact_info = ?');
      values.push(customer.contact_info);
    }
    
    if (fields.length === 0) return;
    
    values.push(id);
    const stmt = db.prepare(`UPDATE customers SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);
  },

  delete: (id: number): void => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM customers WHERE id = ?');
    stmt.run(id);
  }
};

export const productOperations = {
  getAll: (): Product[] => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM products ORDER BY name');
    return stmt.all() as Product[];
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
    const stmt = db.prepare('INSERT INTO products (name, price, description, is_active) VALUES (?, ?, ?, ?)');
    const result = stmt.run(product.name, product.price, product.description || null, product.is_active ? 1 : 0);
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
    const stmt = db.prepare('DELETE FROM products WHERE id = ?');
    stmt.run(id);
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
    
    // Generate sale number
    const saleNumber = `SALE-${Date.now()}`;
    
    // Insert sale
    const saleStmt = db.prepare(`
      INSERT INTO sales (
        customer_id, sale_number, date, due_date, subtotal, tax_amount,
        discount_amount, total_amount, payment_type, payment_status,
        number_of_installments, installment_amount, down_payment,
        transaction_type, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const installmentAmount = saleData.payment_type === 'installments' && saleData.number_of_installments
      ? (totalAmount - (saleData.down_payment || 0)) / saleData.number_of_installments
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
      saleData.down_payment || 0,
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
      const remainingAmount = totalAmount - (saleData.down_payment || 0);
      const monthlyAmount = remainingAmount / saleData.number_of_installments;
      
      const installmentStmt = db.prepare(`
        INSERT INTO installments (
          sale_id, installment_number, due_date, amount, paid_amount,
          balance, status, days_overdue, late_fee, late_fee_applied
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      for (let i = 1; i <= saleData.number_of_installments; i++) {
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + i);
        
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