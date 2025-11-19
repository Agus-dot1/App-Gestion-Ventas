import { describe, it, expect } from 'vitest'
import { scheduleNextPendingMonthly } from '../lib/installments-scheduler'

describe('scheduleNextPendingMonthly', () => {
  it('returns null when no paid dates', () => {
    const saleInstallments = [
      { id: 1, installment_number: 1, due_date: '2025-01-10', status: 'pending' } as any,
      { id: 2, installment_number: 2, due_date: '2025-02-10', status: 'pending' } as any,
    ]
    const res = scheduleNextPendingMonthly(saleInstallments)
    expect(res).toBeNull()
  })

  it('moves next pending to month after last paid using anchor day', () => {
    const saleInstallments = [
      { id: 1, installment_number: 1, due_date: '2025-01-10', status: 'paid', paid_date: '2025-01-05' } as any,
      { id: 2, installment_number: 2, due_date: '2025-02-10', status: 'pending' } as any,
      { id: 3, installment_number: 3, due_date: '2025-03-10', status: 'pending' } as any,
    ]
    const res = scheduleNextPendingMonthly(saleInstallments)
    expect(res).not.toBeNull()
    expect(res!.nextPendingId).toBe(2)
    expect(res!.newDueISO).toMatch(/^2025-02-10$/)
  })

  it('caps anchor day to days in target month', () => {
    const saleInstallments = [
      { id: 1, installment_number: 1, due_date: '2025-01-31', status: 'paid', paid_date: '2025-01-31' } as any,
      { id: 2, installment_number: 2, due_date: '2025-02-28', status: 'pending' } as any,
    ]
    const res = scheduleNextPendingMonthly(saleInstallments)
    expect(res).not.toBeNull()
    expect(res!.newDueISO).toBe('2025-02-28')
  })
})