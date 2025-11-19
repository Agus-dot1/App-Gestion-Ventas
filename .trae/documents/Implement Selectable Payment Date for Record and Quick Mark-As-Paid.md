## Goal
- Let the user backdate payments reliably: choose a payment date in the "Registrar Pago" dialog and in the quick "Marcar Pagada" action.

## Backend Changes
1. Update types (`types/electron.d.ts`)
   - `recordPayment(installmentId, amount, paymentMethod, reference?, paymentDate?)`
   - `markAsPaid(id, paymentDate?)`
2. Preload (`electron/preload.js`)
   - Expose the extra `paymentDate?` parameter for both functions.
3. Main IPC (`electron/main.ts`)
   - Accept and forward `paymentDate` in handlers for `installments:recordPayment` and `installments:markAsPaid`.
4. DB Ops (`lib/database-operations.ts`)
   - `recordPayment(...)` and `markAsPaid(...)` accept `paymentDate?: string`.
   - Use `paymentDate || new Date().toISOString()` for `paid_date` and `transaction_date`.
   - If `paymentDate < due_date`, annotate `notes = 'Pago adelantado'`.

## UI Changes
1. Dialog `InstallmentPaymentDialog`
   - Add a payment date selector (Popover + Calendar) defaulting to today.
   - Pass `toISODateLocal(selectedDate)` to `recordPayment`.
   - Validate: no future dates.
2. Dashboard quick action
   - Keep the existing "Marcar Pagada" button as-is (one-click → today).
   - Add a small calendar icon next to it to allow backdating:
     - Opens a popover with Calendar; selecting a date calls `markAsPaid(id, date)`.
     - Validate: disallow future dates and show toast if invalid.

## Verification
- Register payment with date 5 days ago via dialog; row shows backdated `paid_date`.
- Use calendar icon next to "Marcar Pagada" to set a past date; row and transaction history reflect chosen date.
- Revert payment keeps behavior unchanged.

## Deliverables
- Types, preload, main IPC, DB ops updated.
- Payment dialog with date picker.
- Dashboard action with optional date backdating control.

Proceeding to implement and test end-to-end.