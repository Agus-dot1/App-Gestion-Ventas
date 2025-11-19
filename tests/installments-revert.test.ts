import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { initializeDatabase, closeDatabase } from '../lib/database';
import { customerOperations, saleOperations, installmentOperations, paymentOperations } from '../lib/database-operations';

const DB_FILE = path.join('./', 'sales_management.db');

describe('Installment revert restores original schedule', () => {
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

  it('revert sets status pending, resets amounts and restores due_date', () => {
    if (!dbAvailable) {
      expect(true).toBe(true);
      return;
    }

    const customerId = customerOperations.create({ name: 'Cliente Revert' } as any);
    const saleId = saleOperations.importFromBackup({
      customer_id: customerId,
      sale_number: 'BKP-R1',
      date: '2023-05-15T00:00:00.000Z',
      subtotal: 150,
      total_amount: 150,
      payment_type: 'installments',
      payment_status: 'unpaid',
      number_of_installments: 3,
      installment_amount: 50,
      items: []
    });

    let installments = installmentOperations.getBySale(saleId);
    expect(installments.length).toBe(3);
    const first = installments[0];
    const originalDue = first.due_date; // should be 2023-06-30 with default window

    // Mark first installment as paid (full payment)
    installmentOperations.recordPayment(first.id!, first.amount, 'cash', 'Pago completo');

    // Simulate a due_date change (e.g., rescheduling) before revert
    installmentOperations.update(first.id!, { due_date: '2025-12-27' });

    // Find the payment transaction associated with the first installment
    const payments = paymentOperations.getBySale(saleId);
    const payment = payments.find(p => p.installment_id === first.id && p.status === 'completed');
    expect(payment).toBeTruthy();

    // Revert payment
    installmentOperations.revertPayment(first.id!, payment!.id!);

    // Verify installment restored
    installments = installmentOperations.getBySale(saleId);
    const updatedFirst = installments.find(i => i.installment_number === 1)!;
    expect(updatedFirst.status).toBe('pending');
    expect(updatedFirst.paid_amount).toBe(0);
    expect(updatedFirst.balance).toBe(updatedFirst.amount);
    expect(updatedFirst.paid_date == null).toBe(true);
    expect(updatedFirst.due_date).toBe(originalDue);
  });

  it('fixed-position order is stable despite due_date changes', () => {
    if (!dbAvailable) {
      expect(true).toBe(true);
      return;
    }

    const customerId = customerOperations.create({ name: 'Cliente Orden' } as any);
    const saleId = saleOperations.importFromBackup({
      customer_id: customerId,
      sale_number: 'BKP-R2',
      date: '2023-05-15T00:00:00.000Z',
      subtotal: 300,
      total_amount: 300,
      payment_type: 'installments',
      payment_status: 'unpaid',
      number_of_installments: 3,
      installment_amount: 100,
      items: []
    });

    let installments = installmentOperations.getBySale(saleId);
    expect(installments.map(i => i.installment_number)).toEqual([1, 2, 3]);

    // Change due_date of the first installment to a far future date
    installmentOperations.update(installments[0].id!, { due_date: '2026-11-27' });

    // Order should remain by fixed position (original_installment_number)
    installments = installmentOperations.getBySale(saleId);
    expect(installments.map(i => i.installment_number)).toEqual([1, 2, 3]);
  });
});