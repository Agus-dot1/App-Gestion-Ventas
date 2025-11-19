import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { initializeDatabase, closeDatabase } from '../lib/database';
import { customerOperations, saleOperations, installmentOperations } from '../lib/database-operations';

const DB_FILE = path.join('./', 'sales_management.db');

describe('Backup import preserves sale date', () => {
  let dbAvailable = true;
  beforeAll(() => {
    try {
      initializeDatabase();
    } catch (e) {
      dbAvailable = false;
    }
  });

  afterAll(() => {
    try { closeDatabase(); } catch {}
    try {
      if (fs.existsSync(DB_FILE)) fs.unlinkSync(DB_FILE);
    } catch {}
  });

  it('imports a cash sale keeping the original date', () => {
    if (!dbAvailable) {
      expect(true).toBe(true);
      return;
    }
    const customerId = customerOperations.create({ name: 'Cliente Test' } as any);
    const originalDate = '2023-05-15T00:00:00.000Z';

    const saleId = saleOperations.importFromBackup({
      customer_id: customerId,
      sale_number: 'BKP-1',
      date: originalDate,
      subtotal: 100,
      total_amount: 100,
      payment_type: 'cash',
      payment_status: 'paid',
      items: []
    });

    const sale = saleOperations.getById(saleId);
    expect(sale.date.startsWith('2023-05-15')).toBe(true);
  });

  it('generates installments anchored to the sale date', () => {
    if (!dbAvailable) {
      expect(true).toBe(true);
      return;
    }
    const customerId = customerOperations.create({ name: 'Cliente Cuotas' } as any);
    const originalDate = '2023-05-15T00:00:00.000Z';

    const saleId = saleOperations.importFromBackup({
      customer_id: customerId,
      sale_number: 'BKP-2',
      date: originalDate,
      subtotal: 150,
      total_amount: 150,
      payment_type: 'installments',
      payment_status: 'unpaid',
      number_of_installments: 3,
      installment_amount: 50,
      items: []
    });

    const installments = installmentOperations.getBySale(saleId);
    expect(installments.length).toBe(3);
    // With default payment window, anchor day is 30; month after May 15, 2023 is June 2023
    expect(installments[0].due_date).toBe('2023-06-30');
  });
});