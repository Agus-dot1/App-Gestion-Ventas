import { Installment } from './database-operations';

function ymdTupleUTC(d: Date): [number, number, number] {
  return [d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()];
}

function isBeforeByUTCDate(a: Date, b: Date): boolean {
  const [ay, am, ad] = ymdTupleUTC(a);
  const [by, bm, bd] = ymdTupleUTC(b);
  if (ay !== by) return ay < by;
  if (am !== bm) return am < bm;
  return ad < bd;
}

/**
 * Valida que el pago de una cuota sea secuencial: no se permite pagar una cuota
 * si existen cuotas anteriores del mismo plan/sale pendientes.
 */
export function validateSequentialPayment(
  saleInstallments: Installment[],
  targetInstallmentNumber: number
): boolean {
  return !saleInstallments.some(
    (i) => i.status !== 'paid' && (i.installment_number || 0) < targetInstallmentNumber
  );
}

/**
 * Calcula el nuevo vencimiento de la próxima cuota pendiente para un plan mensual,
 * moviéndola al mes siguiente del último pago registrado.
 * Devuelve el id de la cuota y la nueva fecha si aplica; de lo contrario null.
 */
export function scheduleNextPendingMonthly(
  saleInstallments: Installment[]
): { nextPendingId: number; newDueISO: string } | null {
  const paidDates = saleInstallments
    .filter((i) => i.status === 'paid' && i.paid_date)
    .map((i) => new Date(i.paid_date!))
    .filter((d) => !isNaN(d.getTime()));

  if (paidDates.length === 0) return null;

  const lastPaidDate = new Date(Math.max(...paidDates.map((d) => d.getTime())));
  const nextPending = saleInstallments
    .filter((i) => i.status !== 'paid')
    .sort((a, b) => (a.installment_number || 0) - (b.installment_number || 0))[0];

  if (!nextPending || !nextPending.id) return null;

  const originalDue = new Date(nextPending.due_date);
  const anchorDay = isNaN(originalDue.getTime()) ? 15 : originalDue.getUTCDate();

  // Nuevo vencimiento (UTC): mes siguiente del último pago
  const nextMonthIndexRaw = lastPaidDate.getUTCMonth() + 1;
  const targetYear = lastPaidDate.getUTCFullYear() + (nextMonthIndexRaw >= 12 ? 1 : 0);
  const targetMonth = nextMonthIndexRaw % 12;
  const daysInNewMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const day = Math.min(anchorDay, daysInNewMonth);
  const y = targetYear;
  const m = String(targetMonth + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  const isoDateOnly = `${y}-${m}-${d}`;

  return { nextPendingId: nextPending.id, newDueISO: isoDateOnly };
}