"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationOperations = exports.paymentOperations = exports.installmentOperations = exports.saleItemOperations = exports.saleOperations = exports.partnerOperations = exports.productOperations = exports.customerOperations = void 0;
const database_1 = require("./database");
function generateSaleNumberBase() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStart = `${year}-${month}-${day}`;
    const db = (0, database_1.getDatabase)();
    const todayCountStmt = db.prepare(`
    SELECT COUNT(*) as count FROM sales 
    WHERE date(date) = date(?)
  `);
    const todayCount = todayCountStmt.get(todayStart).count + 1;
    const sequentialNumber = String(todayCount).padStart(3, '0');
    return `VENTA-${sequentialNumber}-${year}${month}${day}`;
}
function saleNumberExists(candidate) {
    const db = (0, database_1.getDatabase)();
    const row = db.prepare('SELECT 1 FROM sales WHERE sale_number = ?').get(candidate);
    return !!row;
}
function generateUniqueSaleNumber() {


    const base = generateSaleNumberBase();
    if (!saleNumberExists(base))
        return base;


    for (let i = 0; i < 5; i++) {
        const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
        const candidate = `${base}-${suffix}`;
        if (!saleNumberExists(candidate))
            return candidate;
    }


    return `VENTA-${Date.now()}`;
}
function ensureUniqueSaleNumber(preferred) {
    const base = preferred || generateSaleNumberBase();
    if (!saleNumberExists(base))
        return base;
    for (let i = 0; i < 5; i++) {
        const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
        const candidate = `${base}-${suffix}`;
        if (!saleNumberExists(candidate))
            return candidate;
    }
    return `VENTA-${Date.now()}`;
}


function referenceCodeExists(candidate) {
    const db = (0, database_1.getDatabase)();
    const row = db.prepare('SELECT 1 FROM sales WHERE reference_code = ?').get(candidate);
    return !!row;
}
function generateNumericReferenceCode(length = 8) {
    let code = '';
    for (let i = 0; i < length; i++) {
        code += Math.floor(Math.random() * 10).toString();
    }
    return code;
}
function generateUniqueReferenceCode() {


    let attempts = 0;
    while (attempts < 10) {
        const length = attempts < 3 ? 8 : attempts < 6 ? 9 : 12;
        const candidate = generateNumericReferenceCode(length);
        if (!referenceCodeExists(candidate))
            return candidate;
        attempts++;
    }


    return String(Date.now());
}
function ensureUniqueReferenceCode(preferred) {
    if (preferred && !referenceCodeExists(preferred))
        return preferred;
    return generateUniqueReferenceCode();
}


function normalizePaymentWindow(value) {
    if (!value)
        return undefined;
    if (value === '10 to 20')
        return '10 to 20';
    if (value === '10 a 20' || value === '10-20')
        return '10 to 20';
    if (value === '1 a 10' || value === '1 al 10')
        return '1 to 10';
    if (value === '20 a 30' || value === '20 al 30')
        return '20 to 30';
    if (value === '1 to 10' || value === '10 to 20' || value === '20 to 30')
        return value;
    return undefined;
}
function normalizeCustomer(c) {
    const normalized = normalizePaymentWindow(c.payment_window);
    return normalized ? { ...c, payment_window: normalized } : c;
}


exports.customerOperations = {
    getAll: () => {
        const db = (0, database_1.getDatabase)();
        const stmt = db.prepare('SELECT * FROM customers ORDER BY name');
        const rows = stmt.all();
        return rows.map(normalizeCustomer);
    },
    getPaginated: (page = 1, pageSize = 10, searchTerm = '') => {
        const db = (0, database_1.getDatabase)();
        const offset = (page - 1) * pageSize;
        let whereClause = '';
        let params = [];
        if (searchTerm.trim()) {
            whereClause = `WHERE 
        dni LIKE ? OR
        name LIKE ? OR 
        email LIKE ? OR 
        phone LIKE ? OR
        secondary_phone LIKE ?`;
            const searchPattern = `%${searchTerm.trim()}%`;
            params = [searchPattern, searchPattern, searchPattern, searchPattern, searchPattern];
        }
        const countStmt = db.prepare(`SELECT COUNT(*) as total FROM customers ${whereClause}`);
        const { total } = countStmt.get(...params);
        const stmt = db.prepare(`
      SELECT * FROM customers 
      ${whereClause}
      ORDER BY name 
      LIMIT ? OFFSET ?
    `);
        const customers = stmt.all(...params, pageSize, offset).map(normalizeCustomer);
        return {
            customers,
            total,
            totalPages: Math.ceil(total / pageSize),
            currentPage: page,
            pageSize
        };
    },


    search: (searchTerm, limit = 50) => {
        const db = (0, database_1.getDatabase)();
        if (!searchTerm.trim())
            return [];
        const stmt = db.prepare(`
      SELECT * FROM customers 
      WHERE 
        dni LIKE ? OR
        name LIKE ? OR 
        email LIKE ? OR 
        phone LIKE ? OR
        secondary_phone LIKE ?
      ORDER BY 
        CASE 
          WHEN dni = ? THEN 1
          WHEN dni LIKE ? THEN 2
          WHEN name LIKE ? THEN 3
          WHEN email LIKE ? THEN 4
          ELSE 5
        END,
        name
      LIMIT ?
    `);
        const searchPattern = `%${searchTerm.trim()}%`;
        const exactPattern = `${searchTerm.trim()}%`;
        const exactMatch = searchTerm.trim();
        const rows = stmt.all(


        searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, 


        exactMatch, exactPattern, exactPattern, exactPattern, exactPattern, 


        limit);
        return rows.map(normalizeCustomer);
    },
    getById: (id) => {
        const db = (0, database_1.getDatabase)();
        const stmt = db.prepare('SELECT * FROM customers WHERE id = ?');
        const result = stmt.get(id);
        if (!result) {
            throw new Error(`Customer with id ${id} not found`);
        }
        return normalizeCustomer(result);
    },
    create: (customer) => {
        const db = (0, database_1.getDatabase)();
        const stmt = db.prepare(`
      INSERT INTO customers (name, dni, email, phone, secondary_phone, address, notes, payment_window, contact_info) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        const result = stmt.run(customer.name, customer.dni || null, customer.email || null, customer.phone || null, customer.secondary_phone || null, customer.address || null, customer.notes || null, normalizePaymentWindow(customer.payment_window) || null, customer.contact_info || null);
        return result.lastInsertRowid;
    },
    update: (id, customer) => {
        const db = (0, database_1.getDatabase)();
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
        if (customer.notes !== undefined) {
            fields.push('notes = ?');
            values.push(customer.notes);
        }
        if (customer.payment_window !== undefined) {
            fields.push('payment_window = ?');
            values.push(normalizePaymentWindow(customer.payment_window) || null);
        }
        if (customer.contact_info !== undefined) {
            fields.push('contact_info = ?');
            values.push(customer.contact_info);
        }
        if (fields.length === 0)
            return;


        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);
        const stmt = db.prepare(`UPDATE customers SET ${fields.join(', ')} WHERE id = ?`);
        stmt.run(...values);
    },
    delete: (id) => {
        const db = (0, database_1.getDatabase)();


        const salesStmt = db.prepare(`
      SELECT s.*, c.name as customer_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.customer_id = ?
      ORDER BY s.date DESC
    `);
        const deletedSales = salesStmt.all(id);






        const deleteSalesStmt = db.prepare('DELETE FROM sales WHERE customer_id = ?');
        deleteSalesStmt.run(id);


        const stmt = db.prepare('DELETE FROM customers WHERE id = ?');
        const result = stmt.run(id);
        return { deletedSales };
    },
    getCount: () => {
        const db = (0, database_1.getDatabase)();
        const stmt = db.prepare('SELECT COUNT(*) as count FROM customers');
        const result = stmt.get();
        return result.count;
    },
    getRecent: (limit = 5) => {
        const db = (0, database_1.getDatabase)();
        const stmt = db.prepare('SELECT * FROM customers ORDER BY created_at DESC LIMIT ?');
        const rows = stmt.all(limit);
        return rows.map(normalizeCustomer);
    },
    getMonthlyComparison: () => {
        const db = (0, database_1.getDatabase)();
        const currentMonthStmt = db.prepare(`
      SELECT COUNT(*) as count FROM customers 
      WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
    `);
        const previousMonthStmt = db.prepare(`
      SELECT COUNT(*) as count FROM customers 
      WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', '-1 month')
    `);
        const current = currentMonthStmt.get().count;
        const previous = previousMonthStmt.get().count;
        const change = previous === 0 ? 0 : ((current - previous) / previous) * 100;
        return { current, previous, change };
    },
    deleteAll: () => {
        const db = (0, database_1.getDatabase)();
        try {
            db.exec('BEGIN');


            db.prepare('DELETE FROM sales').run();


            db.prepare('DELETE FROM customers').run();
            db.exec('COMMIT');
        }
        catch (e) {
            try {
                db.exec('ROLLBACK');
            }
            catch (_) { }
            throw e;
        }
    },


    insertFromBackup: (customer) => {
        const db = (0, database_1.getDatabase)();
        if (customer.id === undefined || customer.id === null) {


            return exports.customerOperations.create({
                name: customer.name,
                dni: customer.dni,
                email: customer.email,
                phone: customer.phone,
                secondary_phone: customer.secondary_phone,
                address: customer.address,
                notes: customer.notes,
                contact_info: customer.contact_info,
                payment_window: normalizePaymentWindow(customer.payment_window),
            });
        }
        const stmt = db.prepare(`
      INSERT INTO customers (
        id, name, dni, email, phone, secondary_phone, address, notes, contact_info, payment_window,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), COALESCE(?, CURRENT_TIMESTAMP))
    `);
        const result = stmt.run(customer.id, customer.name, customer.dni || null, customer.email || null, customer.phone || null, customer.secondary_phone || null, customer.address || null, customer.notes || null, customer.contact_info || null, normalizePaymentWindow(customer.payment_window) || null, customer.created_at || null, customer.updated_at || null);
        return result.lastInsertRowid;
    }
};
exports.productOperations = {
    getAll: () => {
        const db = (0, database_1.getDatabase)();
        const stmt = db.prepare('SELECT * FROM products ORDER BY name');
        return stmt.all();
    },
    getPaginated: (page = 1, pageSize = 10, searchTerm = '') => {
        const db = (0, database_1.getDatabase)();
        const offset = (page - 1) * pageSize;
        let whereClause = '';
        let params = [];
        if (searchTerm.trim()) {
            whereClause = 'WHERE name LIKE ? OR description LIKE ? OR category LIKE ?';
            const searchPattern = `%${searchTerm.trim()}%`;
            params = [searchPattern, searchPattern, searchPattern];
        }


        const countStmt = db.prepare(`SELECT COUNT(*) as total FROM products ${whereClause}`);
        const { total } = countStmt.get(...params);


        const stmt = db.prepare(`
      SELECT * FROM products 
      ${whereClause}
      ORDER BY name 
      LIMIT ? OFFSET ?
    `);
        const products = stmt.all(...params, pageSize, offset);
        return {
            products,
            total,
            totalPages: Math.ceil(total / pageSize),
            currentPage: page,
            pageSize
        };
    },
    search: (searchTerm, limit = 50) => {
        const db = (0, database_1.getDatabase)();
        if (!searchTerm.trim())
            return [];
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
        return stmt.all(searchPattern, searchPattern, searchPattern, exactPattern, exactPattern, exactPattern, limit);
    },
    getActive: () => {
        const db = (0, database_1.getDatabase)();
        const stmt = db.prepare('SELECT * FROM products WHERE is_active = 1 ORDER BY name');
        return stmt.all();
    },
    getById: (id) => {
        const db = (0, database_1.getDatabase)();
        const stmt = db.prepare('SELECT * FROM products WHERE id = ?');
        const result = stmt.get(id);
        if (!result) {
            throw new Error(`Product with id ${id} not found`);
        }
        return result;
    },
    create: (product) => {
        const db = (0, database_1.getDatabase)();
        const stmt = db.prepare("INSERT INTO products (name, price, cost_price, description, category, stock, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))");
        const result = stmt.run(product.name, product.price, (product.cost_price ?? null), product.description || null, product.category || null, product.stock || null, product.is_active ? 1 : 0);
        return result.lastInsertRowid;
    },
    update: (id, product) => {
        const db = (0, database_1.getDatabase)();
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


        fields.push("updated_at = datetime('now')");
        if (fields.length === 0)
            return;
        values.push(id);
        const stmt = db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`);
        stmt.run(...values);
    },
    delete: (id) => {
        const db = (0, database_1.getDatabase)();




        const stmt = db.prepare('DELETE FROM products WHERE id = ?');
        stmt.run(id);
    },
    getCount: () => {
        const db = (0, database_1.getDatabase)();
        const stmt = db.prepare('SELECT COUNT(*) as count FROM products');
        const result = stmt.get();
        return result.count;
    },
    getMonthlyComparison: () => {
        const db = (0, database_1.getDatabase)();
        const currentMonthStmt = db.prepare(`
      SELECT COUNT(*) as count FROM products 
      WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
    `);
        const previousMonthStmt = db.prepare(`
      SELECT COUNT(*) as count FROM products 
      WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', '-1 month')
    `);
        const current = currentMonthStmt.get().count;
        const previous = previousMonthStmt.get().count;
        const change = previous === 0 ? 0 : ((current - previous) / previous) * 100;
        return { current, previous, change };
    },
    deleteAll: () => {
        const db = (0, database_1.getDatabase)();
        const stmt = db.prepare('DELETE FROM products');
        stmt.run();
    },


    insertFromBackup: (product) => {
        const db = (0, database_1.getDatabase)();
        if (product.id === undefined || product.id === null) {
            return exports.productOperations.create({
                name: product.name,
                price: product.price,
                cost_price: product.cost_price,
                description: product.description,
                category: product.category,
                stock: product.stock,
                is_active: product.is_active,
            });
        }
        const stmt = db.prepare(`
      INSERT INTO products (
        id, name, price, cost_price, description, category, stock, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')), COALESCE(?, datetime('now')))
    `);
        const result = stmt.run(product.id, product.name, product.price, (product.cost_price ?? null), product.description || null, product.category || null, product.stock ?? null, product.is_active ? 1 : 0, product.created_at || null, product.updated_at || null);
        return result.lastInsertRowid;
    }
};
exports.partnerOperations = {
    getAll: () => {
        const db = (0, database_1.getDatabase)();


        try {
            const rows = db.prepare('SELECT id, name, is_active FROM partners ORDER BY name').all();
            console.log('partners:getAll ejecutándose en el proceso', process.type, 'count:', rows.length);
            if (rows.length > 0) {
                console.log('partners sample:', rows.slice(0, Math.min(rows.length, 5)));
            }
        }
        catch (e) {
            console.error('partners:getAll error inspeccionando tabla:', e);
        }
        return db.prepare('SELECT * FROM partners WHERE is_active = 1 ORDER BY name').all();
    },
    getById: (id) => {
        const db = (0, database_1.getDatabase)();
        const partner = db.prepare('SELECT * FROM partners WHERE id = ?').get(id);
        if (!partner) {
            throw new Error(`Partner with id ${id} not found`);
        }
        return partner;
    },
    create: (partner) => {
        const db = (0, database_1.getDatabase)();
        const stmt = db.prepare(`
      INSERT INTO partners (name, is_active)
      VALUES (?, ?)
    `);
        const result = stmt.run(partner.name, partner.is_active ? 1 : 0);
        return result.lastInsertRowid;
    },
    update: (id, partner) => {
        const db = (0, database_1.getDatabase)();
        const stmt = db.prepare(`
      UPDATE partners 
      SET name = COALESCE(?, name),
          is_active = COALESCE(?, is_active),
          updated_at = datetime('now')
      WHERE id = ?
    `);
        stmt.run(partner.name, partner.is_active ? 1 : 0, id);
    },
    delete: (id) => {
        const db = (0, database_1.getDatabase)();


        try {
            db.exec('BEGIN');


            const clearSales = db.prepare('UPDATE sales SET partner_id = NULL WHERE partner_id = ?');
            clearSales.run(id);


            const del = db.prepare('DELETE FROM partners WHERE id = ?');
            del.run(id);
            db.exec('COMMIT');
        }
        catch (e) {
            try {
                db.exec('ROLLBACK');
            }
            catch { }
            throw e;
        }
    }
};
exports.saleOperations = {
    getAll: () => {
        const db = (0, database_1.getDatabase)();
        const stmt = db.prepare(`
      SELECT s.*, c.name as customer_name, p.name as partner_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN partners p ON s.partner_id = p.id
      ORDER BY s.date DESC
    `);
        return stmt.all();
    },
    getPaginated: (page = 1, pageSize = 10, searchTerm = '') => {
        console.log('getPaginated ejecutándose en el proceso', process.type);
        console.time('sales_query_total');
        const db = (0, database_1.getDatabase)();
        const offset = (page - 1) * pageSize;
        let whereClause = '';
        let params = [];
        if (searchTerm.trim()) {
            whereClause = 'WHERE s.sale_number LIKE ? OR s.reference_code LIKE ? OR c.name LIKE ? OR s.notes LIKE ?';
            const searchPattern = `%${searchTerm.trim()}%`;
            params = [searchPattern, searchPattern, searchPattern, searchPattern];
        }


        const countStmt = db.prepare(`
      SELECT COUNT(*) as total 
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN partners p ON s.partner_id = p.id
      ${whereClause}
    `);
        const { total } = countStmt.get(...params);


        const stmt = db.prepare(`
      SELECT s.*, c.name as customer_name, p.name as partner_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN partners p ON s.partner_id = p.id
      ${whereClause}
      ORDER BY s.date DESC 
      LIMIT ? OFFSET ?
    `);
        const sales = stmt.all(...params, pageSize, offset);


        const itemsStmt = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?');
        sales.forEach(sale => {
            if (sale.id) {
                sale.items = itemsStmt.all(sale.id);
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
    search: (searchTerm, limit = 50) => {
        const db = (0, database_1.getDatabase)();
        if (!searchTerm.trim())
            return [];
        const stmt = db.prepare(`
      SELECT s.*, c.name as customer_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE 
        s.sale_number LIKE ? OR 
        s.reference_code LIKE ? OR 
        c.name LIKE ? OR 
        s.notes LIKE ?
      ORDER BY 
        CASE 
          WHEN s.sale_number LIKE ? THEN 1
          WHEN s.reference_code LIKE ? THEN 2
          WHEN c.name LIKE ? THEN 3
          WHEN s.notes LIKE ? THEN 4
          ELSE 5
        END,
        s.date DESC
      LIMIT ?
    `);
        const searchPattern = `%${searchTerm.trim()}%`;
        const exactPattern = `${searchTerm.trim()}%`;
        return stmt.all(searchPattern, searchPattern, searchPattern, searchPattern, exactPattern, exactPattern, exactPattern, exactPattern, limit);
    },
    getById: (id) => {
        const db = (0, database_1.getDatabase)();
        const stmt = db.prepare(`
      SELECT s.*, c.name as customer_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.id = ?
    `);
        const result = stmt.get(id);
        if (!result) {
            throw new Error(`Sale with id ${id} not found`);
        }
        return result;
    },
    getByCustomer: (customerId) => {
        const db = (0, database_1.getDatabase)();
        const stmt = db.prepare(`
      SELECT s.*, c.name as customer_name, p.name as partner_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN partners p ON s.partner_id = p.id
      WHERE s.customer_id = ?
      ORDER BY s.date DESC
    `);
        return stmt.all(customerId);
    },
    getByPartner: (partnerId) => {
        const db = (0, database_1.getDatabase)();
        const stmt = db.prepare(`
      SELECT s.*, c.name as customer_name, p.name as partner_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN partners p ON s.partner_id = p.id
      WHERE s.partner_id = ?
      ORDER BY s.date DESC
    `);
        return stmt.all(partnerId);
    },
    getPaginatedByPartner: (partnerId, page = 1, pageSize = 10, searchTerm = '') => {
        const db = (0, database_1.getDatabase)();
        const offset = (page - 1) * pageSize;
        let whereClause = 'WHERE s.partner_id = ?';
        let params = [partnerId];
        if (searchTerm.trim()) {
            whereClause += ' AND (s.sale_number LIKE ? OR s.reference_code LIKE ? OR c.name LIKE ? OR s.notes LIKE ?)';
            const searchPattern = `%${searchTerm.trim()}%`;
            params.push(searchPattern, searchPattern, searchPattern, searchPattern);
        }


        const countStmt = db.prepare(`
      SELECT COUNT(*) as total 
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN partners p ON s.partner_id = p.id
      ${whereClause}
    `);
        const { total } = countStmt.get(...params);


        const stmt = db.prepare(`
      SELECT s.*, c.name as customer_name, p.name as partner_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN partners p ON s.partner_id = p.id
      ${whereClause}
      ORDER BY s.date DESC 
      LIMIT ? OFFSET ?
    `);
        const sales = stmt.all(...params, pageSize, offset);


        const itemsStmt = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?');
        sales.forEach(sale => {
            sale.items = itemsStmt.all(sale.id);
        });
        return {
            sales,
            total,
            totalPages: Math.ceil(total / pageSize),
            currentPage: page,
            pageSize
        };
    },
    create: (saleData) => {
        const db = (0, database_1.getDatabase)();


        const subtotal = saleData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        const totalAmount = subtotal;


        const saleNumber = generateUniqueSaleNumber();


        const referenceCode = generateUniqueReferenceCode();


        const saleStmt = db.prepare(`
      INSERT INTO sales (
        customer_id, partner_id, sale_number, reference_code, date, due_date, subtotal, tax_amount,
        discount_amount, total_amount, payment_type, payment_method, payment_status, payment_period, period_type,
        number_of_installments, installment_amount, advance_installments,
        transaction_type, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
    `);
        const installmentAmount = saleData.payment_type === 'installments' && saleData.number_of_installments
            ? Math.round(totalAmount / saleData.number_of_installments)
            : null;
        const saleResult = saleStmt.run(saleData.customer_id, saleData.partner_id || null, saleNumber, referenceCode, new Date().toISOString(), null, // due_date
        subtotal, totalAmount, saleData.payment_type, saleData.payment_method || null, saleData.payment_type === 'cash' ? 'paid' : 'unpaid', saleData.payment_type === 'installments' ? (saleData.payment_period || null) : null, saleData.period_type || null, saleData.number_of_installments || null, installmentAmount, 'sale', 'completed', saleData.notes || null);
        const saleId = saleResult.lastInsertRowid;


        const itemStmt = db.prepare(`
      INSERT INTO sale_items (
        sale_id, product_id, quantity, unit_price, discount_per_item,
        line_total, product_name, status, returned_quantity
      ) VALUES (?, ?, ?, ?, 0, ?, ?, 'active', 0)
    `);
        for (const item of saleData.items) {
            const lineTotal = (item.quantity * item.unit_price);
            let productName = null;
            if (item.product_id != null) {
                try {
                    const p = exports.productOperations.getById(item.product_id);
                    productName = p?.name || null;
                }
                catch (_) {
                    productName = null;
                }
            }
            if (!productName) {
                productName = item.product_name || (item.product_id != null ? `Producto ${item.product_id}` : 'Producto sin catálogo');
            }
            itemStmt.run(saleId, item.product_id, item.quantity, item.unit_price, lineTotal, productName);


            if (item.product_id != null) {
                try {
                    const product = exports.productOperations.getById(item.product_id);


                    if (product && product.stock !== undefined && product.stock !== null) {
                        const newStock = Math.max(0, product.stock - item.quantity);
                        exports.productOperations.update(item.product_id, { stock: newStock });
                    }
                }
                catch (e) {


                }
            }
        }


        if (saleData.payment_type === 'installments' && saleData.number_of_installments) {
            const monthlyAmount = Math.round(totalAmount / saleData.number_of_installments);


            const customerWindowRow = db.prepare('SELECT payment_window FROM customers WHERE id = ?').get(saleData.customer_id);


            const fallbackPeriod = saleData.payment_period;
            const anchorDay = customerWindowRow?.payment_window === '1 to 10' ? 10
                : customerWindowRow?.payment_window === '10 to 20' ? 20
                    : customerWindowRow?.payment_window === '20 to 30' ? 30
                        : fallbackPeriod === '1 to 10' ? 10
                            : fallbackPeriod === '10 to 20' ? 20
                                : fallbackPeriod === '20 to 30' ? 30
                                    : 30; // default to end-of-month window


            const needsCustomerWindowUpdate = (!customerWindowRow?.payment_window || (customerWindowRow.payment_window !== '1 to 10' && customerWindowRow.payment_window !== '10 to 20' && customerWindowRow.payment_window !== '20 to 30'))
                && (fallbackPeriod === '1 to 10' || fallbackPeriod === '10 to 20' || fallbackPeriod === '20 to 30');
            if (needsCustomerWindowUpdate) {
                try {
                    exports.customerOperations.update(saleData.customer_id, { payment_window: fallbackPeriod });
                }
                catch {


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


                const targetMonthIndex = nowDate.getMonth() + i;
                const targetYear = nowDate.getFullYear() + Math.floor(targetMonthIndex / 12);
                const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
                const lastDayOfTargetMonth = new Date(targetYear, normalizedMonth + 1, 0).getDate();
                const day = Math.min(anchorDay, lastDayOfTargetMonth);
                const dueDate = new Date(targetYear, normalizedMonth, day);
                installmentStmt.run(saleId, i, dueDate.toISOString().split('T')[0], monthlyAmount, 0, monthlyAmount, 'pending', 0, 0, 0);
            }
        }
        return saleId;
    },


    importFromBackup: (sale) => {
        const db = (0, database_1.getDatabase)();


        if (sale.customer_id == null) {
            throw new Error('customer_id es requerido para importar una venta');
        }
        const customerCheck = db.prepare('SELECT 1 FROM customers WHERE id = ?').get(sale.customer_id);
        if (!customerCheck) {
            exports.customerOperations.insertFromBackup({
                id: sale.customer_id,
                name: sale.customer_name || `Cliente ${sale.customer_id}`,
            });
        }
        const saleNumber = ensureUniqueSaleNumber(sale.sale_number);
        const referenceCode = ensureUniqueReferenceCode(sale.reference_code ? String(sale.reference_code) : undefined);
        const date = sale.date || new Date().toISOString();
        const subtotal = typeof sale.subtotal === 'number' ? sale.subtotal : 0;
        const totalAmount = typeof sale.total_amount === 'number' ? sale.total_amount : subtotal;
        const paymentType = (sale.payment_type === 'installments') ? 'installments' : 'cash';
        const paymentStatus = (sale.payment_status === 'paid' || paymentType === 'cash') ? 'paid' : 'unpaid';
        const numberOfInstallments = sale.number_of_installments || null;
        const installmentAmount = typeof sale.installment_amount === 'number'
            ? sale.installment_amount
            : (numberOfInstallments ? Math.round(totalAmount / numberOfInstallments) : null);
        const status = sale.status === 'pending' ? 'pending' : 'completed';
        const transactionType = 'sale';
        const notes = sale.notes || null;


        const saleStmt = db.prepare(`
      INSERT INTO sales (
        customer_id, sale_number, reference_code, date, due_date, subtotal, tax_amount,
        discount_amount, total_amount, payment_type, payment_method, payment_status, payment_period, period_type,
        number_of_installments, installment_amount, advance_installments,
        transaction_type, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
    `);
        const saleResult = saleStmt.run(sale.customer_id, saleNumber, referenceCode, date, sale.due_date || null, subtotal, totalAmount, paymentType, sale.payment_method || null, paymentStatus, sale.payment_type === 'installments' ? (sale.payment_period || null) : null, sale.period_type || null, numberOfInstallments, installmentAmount, transactionType, status, notes);
        const saleId = saleResult.lastInsertRowid;


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
                        const p = exports.productOperations.getById(item.product_id);
                        productName = p?.name || null;
                    }
                    catch (_) {
                        productName = null;
                    }
                }
                if (!productName) {
                    productName = `Producto ${item.product_id}`;
                }
                itemStmt.run(saleId, item.product_id, item.quantity, item.unit_price, lineTotal, productName, null);
            }
        }


        if (paymentType === 'installments' && numberOfInstallments) {
            const monthlyAmount = installmentAmount || Math.round(totalAmount / numberOfInstallments);
            const installmentStmt = db.prepare(`
        INSERT INTO installments (
          sale_id, installment_number, due_date, amount, paid_amount,
          balance, status, days_overdue, late_fee, late_fee_applied
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);


            const customerWindowRow = db.prepare('SELECT payment_window FROM customers WHERE id = ?').get(sale.customer_id);
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
                installmentStmt.run(saleId, i, dueDate.toISOString().split('T')[0], monthlyAmount, 0, monthlyAmount, 'pending', 0, 0, 0);
            }
        }
        return saleId;
    },
    update: (id, sale) => {
        const db = (0, database_1.getDatabase)();
        const fields = [];
        const values = [];


        const updatableFields = [
            'customer_id', 'due_date', 'tax_amount', 'discount_amount',
            'payment_status', 'status', 'notes', 'period_type', 'payment_period'
        ];
        for (const field of updatableFields) {
            if (sale[field] !== undefined) {
                fields.push(`${field} = ?`);
                values.push(sale[field]);
            }
        }
        if (fields.length === 0)
            return;
        values.push(id);
        const stmt = db.prepare(`UPDATE sales SET ${fields.join(', ')} WHERE id = ?`);
        stmt.run(...values);
    },
    delete: (id) => {
        const db = (0, database_1.getDatabase)();
        const stmt = db.prepare('DELETE FROM sales WHERE id = ?');
        stmt.run(id);
    },
    getCount: () => {
        const db = (0, database_1.getDatabase)();
        const stmt = db.prepare('SELECT COUNT(*) as count FROM sales');
        const result = stmt.get();
        return result.count;
    },
    getTotalRevenue: () => {
        const db = (0, database_1.getDatabase)();
        const stmt = db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as total
      FROM sales
    `);
        const result = stmt.get();
        return result.total;
    },
    getRecent: (limit = 5) => {
        const db = (0, database_1.getDatabase)();
        const stmt = db.prepare(`
      SELECT s.*, c.name as customer_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      ORDER BY s.created_at DESC 
      LIMIT ?
    `);
        return stmt.all(limit);
    },
    getSalesChartData: (days = 30) => {
        const db = (0, database_1.getDatabase)();
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
        return stmt.all(days);
    },
    getStatsComparison: () => {
        const db = (0, database_1.getDatabase)();
        const currentMonthStmt = db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as total FROM sales 
      WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now') AND status != 'refunded'
    `);
        const previousMonthStmt = db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as total FROM sales 
      WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now', '-1 month') AND status != 'refunded'
    `);
        const current = currentMonthStmt.get().total;
        const previous = previousMonthStmt.get().total;
        const change = previous === 0 ? 0 : ((current - previous) / previous) * 100;
        return { current, previous, change };
    },
    getWithDetails: (id) => {
        const sale = exports.saleOperations.getById(id);
        sale.items = exports.saleItemOperations.getBySale(id);
        sale.installments = exports.installmentOperations.getBySale(id);
        return sale;
    },
    getOverdueSales: () => {
        const db = (0, database_1.getDatabase)();
        const stmt = db.prepare(`
      SELECT DISTINCT s.*, c.name as customer_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN installments i ON s.id = i.sale_id
      WHERE i.status = 'overdue' OR (s.payment_status = 'unpaid' AND s.due_date < date('now'))
      ORDER BY s.date DESC
    `);
        return stmt.all();
    },
    getOverdueSalesCount: () => {
        const db = (0, database_1.getDatabase)();
        const stmt = db.prepare(`
      SELECT COUNT(DISTINCT s.id) AS count
      FROM sales s
      LEFT JOIN installments i ON s.id = i.sale_id
      WHERE i.status = 'overdue' OR (s.payment_status = 'unpaid' AND s.due_date < date('now'))
    `);
        const result = stmt.get();
        return result.count;
    },
    deleteAll: () => {
        const db = (0, database_1.getDatabase)();
        const stmt = db.prepare('DELETE FROM sales');
        stmt.run();
    }
};
exports.saleItemOperations = {
    getBySale: (saleId) => {
        const db = (0, database_1.getDatabase)();
        const stmt = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?');
        return stmt.all(saleId);
    },
    create: (saleItem) => {
        const db = (0, database_1.getDatabase)();
        const stmt = db.prepare(`
      INSERT INTO sale_items (
        sale_id, product_id, quantity, unit_price, discount_per_item,
        line_total, product_name, product_description, status, returned_quantity
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        const result = stmt.run(saleItem.sale_id, saleItem.product_id, saleItem.quantity, saleItem.unit_price, saleItem.line_total, saleItem.product_name, saleItem.product_description || null, saleItem.status, saleItem.returned_quantity);
        return result.lastInsertRowid;
    },
    getSalesForProduct: (productId) => {
        const db = (0, database_1.getDatabase)();
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
        return stmt.all(productId);
    },
    deleteAll: () => {
        const db = (0, database_1.getDatabase)();
        const stmt = db.prepare('DELETE FROM sale_items');
        stmt.run();
    }
};
exports.installmentOperations = {
    getBySale: (saleId) => {
        const db = (0, database_1.getDatabase)();
        const stmt = db.prepare('SELECT * FROM installments WHERE sale_id = ? ORDER BY installment_number');
        return stmt.all(saleId);
    },
    getOverdue: () => {
        const db = (0, database_1.getDatabase)();
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
        return stmt.all();
    },
    getUpcoming: (limit = 5) => {
        const db = (0, database_1.getDatabase)();
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
      AND DATE(i.due_date) >= DATE('now')
      AND DATE(i.due_date) <= DATE('now', '+3 days')
      AND i.balance > 0
      ORDER BY i.due_date ASC
      LIMIT ?
    `);
        return stmt.all(limit);
    },
    recordPayment: (installmentId, amount, paymentMethod, reference) => {
        const db = (0, database_1.getDatabase)();


        const installment = db.prepare('SELECT * FROM installments WHERE id = ?').get(installmentId);
        if (!installment) {
            throw new Error(`Installment with id ${installmentId} not found`);
        }


        const expectedAmount = installment.amount - installment.paid_amount;
        if (amount !== expectedAmount) {
            throw new Error(`Solo se permiten pagos completos. Monto esperado: ${expectedAmount}`);
        }
        const newPaidAmount = installment.amount;
        const newBalance = 0;
        const newStatus = 'paid';
        const updateStmt = db.prepare(`
      UPDATE installments
      SET paid_amount = ?, balance = ?, status = ?, paid_date = ?
      WHERE id = ?
    `);
        updateStmt.run(newPaidAmount, newBalance, newStatus, new Date().toISOString(), installmentId);


        const paymentStmt = db.prepare(`
      INSERT INTO payment_transactions (
        sale_id, installment_id, amount, payment_method, payment_reference,
        transaction_date, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
        paymentStmt.run(installment.sale_id, installmentId, expectedAmount, paymentMethod, reference || null, new Date().toISOString(), 'completed');
    },
    applyLateFee: (installmentId, fee) => {
        const db = (0, database_1.getDatabase)();
        const stmt = db.prepare(`
      UPDATE installments
      SET late_fee = ?, late_fee_applied = 1, amount = amount + ?
      WHERE id = ?
    `);
        stmt.run(fee, fee, installmentId);
    },
    revertPayment: (installmentId, transactionId) => {
        const db = (0, database_1.getDatabase)();


        const transactionStmt = db.prepare('SELECT * FROM payment_transactions WHERE id = ?');
        const transaction = transactionStmt.get(transactionId);
        if (!transaction) {
            throw new Error(`Payment transaction with id ${transactionId} not found`);
        }


        const installment = db.prepare('SELECT * FROM installments WHERE id = ?').get(installmentId);
        if (!installment) {
            throw new Error(`Installment with id ${installmentId} not found`);
        }


        if (installment.paid_amount !== installment.amount || transaction.amount !== installment.amount) {
            throw new Error('Solo se puede revertir pagos completos de la cuota');
        }
        const newPaidAmount = 0;
        const newBalance = installment.amount;
        const newStatus = 'pending';


        const updateStmt = db.prepare(`
      UPDATE installments
      SET paid_amount = ?, balance = ?, status = ?
      WHERE id = ?
    `);
        updateStmt.run(newPaidAmount, newBalance, newStatus, installmentId);


        const cancelTransactionStmt = db.prepare(`
      UPDATE payment_transactions
      SET status = 'cancelled'
      WHERE id = ?
    `);
        cancelTransactionStmt.run(transactionId);
    },


    update: (id, data) => {
        const db = (0, database_1.getDatabase)();
        const fields = [];
        const values = [];
        const allowed = [
            'due_date', 'status', 'amount', 'paid_amount', 'balance',
            'days_overdue', 'late_fee', 'late_fee_applied', 'notes'
        ];
        for (const key of allowed) {
            const value = data[key];
            if (value !== undefined) {
                fields.push(`${key} = ?`);
                values.push(value);
            }
        }
        if (fields.length === 0)
            return;
        values.push(id);
        const stmt = db.prepare(`UPDATE installments SET ${fields.join(', ')} WHERE id = ?`);
        stmt.run(...values);
    },
    create: (installment) => {
        const db = (0, database_1.getDatabase)();
        const stmt = db.prepare(`
      INSERT INTO installments (
        sale_id, installment_number, due_date, amount, paid_amount,
        balance, status, paid_date, days_overdue, late_fee, late_fee_applied, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        const result = stmt.run(installment.sale_id, installment.installment_number, installment.due_date, installment.amount, installment.paid_amount, installment.balance, installment.status, installment.paid_date || null, installment.days_overdue, installment.late_fee, installment.late_fee_applied ? 1 : 0, installment.notes || null);
        return result.lastInsertRowid;
    },
    markAsPaid: (id) => {
        const db = (0, database_1.getDatabase)();
        const installment = db.prepare('SELECT * FROM installments WHERE id = ?').get(id);
        if (!installment) {
            throw new Error(`Installment with id ${id} not found`);
        }


        const remainingAmount = installment.amount - installment.paid_amount;


        const stmt = db.prepare(`
      UPDATE installments
      SET paid_amount = amount, balance = 0, status = 'paid', paid_date = ?
      WHERE id = ?
    `);
        stmt.run(new Date().toISOString(), id);


        if (remainingAmount > 0) {
            const paymentStmt = db.prepare(`
        INSERT INTO payment_transactions (
          sale_id, installment_id, amount, payment_method, payment_reference,
          transaction_date, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
            paymentStmt.run(installment.sale_id, id, remainingAmount, 'cash', 'Marcado como pagado', new Date().toISOString(), 'completed');
        }
    },
    delete: (id) => {
        const db = (0, database_1.getDatabase)();


        const installment = db.prepare('SELECT * FROM installments WHERE id = ?').get(id);
        if (!installment) {
            throw new Error(`Installment with id ${id} not found`);
        }


        const deletePaymentsStmt = db.prepare('DELETE FROM payment_transactions WHERE installment_id = ?');
        deletePaymentsStmt.run(id);


        const stmt = db.prepare('DELETE FROM installments WHERE id = ?');
        stmt.run(id);
    },
    deleteAll: () => {
        const db = (0, database_1.getDatabase)();
        const stmt = db.prepare('DELETE FROM installments');
        stmt.run();
    }
};
exports.paymentOperations = {
    getBySale: (saleId) => {
        const db = (0, database_1.getDatabase)();
        const stmt = db.prepare('SELECT * FROM payment_transactions WHERE sale_id = ? ORDER BY transaction_date DESC');
        return stmt.all(saleId);
    },
    create: (payment) => {
        const db = (0, database_1.getDatabase)();
        const stmt = db.prepare(`
      INSERT INTO payment_transactions (
        sale_id, installment_id, amount, payment_method, payment_reference,
        transaction_date, processed_by, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        const result = stmt.run(payment.sale_id, payment.installment_id || null, payment.amount, payment.payment_method, payment.payment_reference || null, payment.transaction_date, payment.processed_by || null, payment.status, payment.notes || null);
        return result.lastInsertRowid;
    },
    getOverdue: () => {
        const db = (0, database_1.getDatabase)();
        const stmt = db.prepare(`
      SELECT pt.* FROM payment_transactions pt
      JOIN installments i ON pt.installment_id = i.id
      WHERE i.status = 'overdue' OR (pt.status = 'pending' AND i.due_date < date('now'))
      ORDER BY i.due_date
    `);
        return stmt.all();
    },
    deleteAll: () => {
        const db = (0, database_1.getDatabase)();
        const stmt = db.prepare('DELETE FROM payment_transactions');
        stmt.run();
    }
};
exports.notificationOperations = {
    list: (limit = 20) => {
        const db = (0, database_1.getDatabase)();
        const stmt = db.prepare('SELECT * FROM notifications WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT ?');
        return stmt.all(limit);
    },
    markRead: (id) => {
        const db = (0, database_1.getDatabase)();
        db.prepare("UPDATE notifications SET read_at = datetime('now') WHERE id = ? AND read_at IS NULL").run(id);
    },
    markUnread: (id) => {
        const db = (0, database_1.getDatabase)();
        db.prepare("UPDATE notifications SET read_at = NULL WHERE id = ?").run(id);
    },
    delete: (id) => {
        const db = (0, database_1.getDatabase)();
        db.prepare("UPDATE notifications SET deleted_at = datetime('now') WHERE id = ? AND deleted_at IS NULL").run(id);
    },


    deleteByMessageToday: (message) => {
        const db = (0, database_1.getDatabase)();
        db.prepare("UPDATE notifications SET deleted_at = datetime('now') WHERE message = ? AND date(created_at) = date('now') AND deleted_at IS NULL").run(message);
    },


    deleteByKeyToday: (key) => {
        const db = (0, database_1.getDatabase)();
        db.prepare("UPDATE notifications SET deleted_at = datetime('now') WHERE message_key = ? AND date(created_at) = date('now') AND deleted_at IS NULL").run(key);
    },
    create: (message, type = 'info', message_key) => {
        const db = (0, database_1.getDatabase)();
        const normalizedType = (type === 'attention' ? 'reminder' : type);
        const res = db
            .prepare('INSERT INTO notifications (message, type, message_key) VALUES (?, ?, ?)')
            .run(message, normalizedType, message_key ?? null);
        return res.lastInsertRowid;
    },
    existsTodayWithMessage: (message) => {
        const db = (0, database_1.getDatabase)();
        const row = db
            .prepare("SELECT COUNT(*) as cnt FROM notifications WHERE message = ? AND (date(created_at) = date('now') OR date(deleted_at) = date('now'))")
            .get(message);
        return !!row && row.cnt > 0;
    },


    existsTodayWithKey: (key) => {
        const db = (0, database_1.getDatabase)();
        const row = db
            .prepare("SELECT COUNT(*) as cnt FROM notifications WHERE message_key = ? AND (date(created_at) = date('now') OR date(deleted_at) = date('now'))")
            .get(key);
        return !!row && row.cnt > 0;
    },


    existsActiveWithKey: (key) => {
        const db = (0, database_1.getDatabase)();
        const row = db
            .prepare("SELECT COUNT(*) as cnt FROM notifications WHERE message_key = ? AND deleted_at IS NULL")
            .get(key);
        return !!row && row.cnt > 0;
    },


    existsActiveWithMessage: (message) => {
        const db = (0, database_1.getDatabase)();
        const row = db
            .prepare("SELECT COUNT(*) as cnt FROM notifications WHERE message = ? AND deleted_at IS NULL")
            .get(message);
        return !!row && row.cnt > 0;
    },


    clearAll: () => {
        const db = (0, database_1.getDatabase)();
        db.prepare("UPDATE notifications SET deleted_at = datetime('now') WHERE deleted_at IS NULL").run();
    },


    listArchived: (limit = 20) => {
        const db = (0, database_1.getDatabase)();
        const stmt = db.prepare('SELECT * FROM notifications WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC LIMIT ?');
        return stmt.all(limit);
    },


    purgeArchived: () => {
        const db = (0, database_1.getDatabase)();
        db.prepare('DELETE FROM notifications WHERE deleted_at IS NOT NULL').run();
    },


    getLatestByKey: (key) => {
        const db = (0, database_1.getDatabase)();
        const row = db
            .prepare("SELECT * FROM notifications WHERE message_key = ? ORDER BY datetime(created_at) DESC LIMIT 1")
            .get(key);
        return row ?? null;
    }
};

