## Problem
- Payments currently use the computer's current datetime when recorded (see `lib/database-operations.ts:1654–1658`, `1799–1811`).
- When the user returns after days, the app registers the payment with today's date, creating a mismatch with the invoice date.

## Solution Overview
- Allow choosing a "Payment Date" at the moment of registering a payment and when using "Mark as Paid".
- Persist that selected date as `paid_date` in the installment and as the `transaction_date` in the payment transaction.
- Default to today, but allow backdating; restrict future dates.

## UI Changes
1. Register Payment Dialog
   - Add a compact date picker labeled "Payment Date" with default today.
   - Validation: not in the future; show a note if date < due_date (early payment).
   - Display chosen date in the confirmation and apply it to DB.
2. Mark as Paid (quick action)
   - Keep the existing button as requested.
   - On click: either apply today OR open a tiny date popover for backdating (single click → today, expandable affordance for date overwrite). For simplicity, show an inline popover to pick date.
   - Use the selected date to update `paid_date`.

## Backend Changes
1. Database API
   - `recordPayment(installmentId, amount, paymentMethod, reference, paymentDate?)`:
     - Use `paymentDate` if provided for `paid_date` and `transaction_date`; otherwise use today.
     - Normalize to local date-only (`YYYY-MM-DD`) to avoid timezone drift.
     - If `paymentDate < due_date`, set `notes = 'Pago adelantado'` on installment.
   - `markAsPaid(id, paymentDate?)`:
     - Use provided date for `paid_date`; insert a transaction with that same date.
2. Electron Bridge
   - Preload: add `paymentDate?: string` to `installments.recordPayment(...)` and `installments.markAsPaid(...)`.
   - Main IPC: accept the extra argument and forward to database operations.

## Data Rules
- Allowed: past dates and same day.
- Disallowed: future dates beyond today.
- Optional: Disallow dates before the sale date; warn but still allow if business rules permit prepayments.

## Display & Consistency
- Dashboard already shows `paid_date` when status is `paid` (`components/sales/installments-dashboard/installment-dashboard.tsx:1405–1407`). No extra change needed beyond writing the correct date.
- Invoices/receipts should use `paid_date` for the payment date field (confirm current template; update if it uses `transaction_date` instead).

## Testing
- Record a payment with `paymentDate = today - 5 days`; verify row shows the backdated date and transaction history matches.
- Mark as Paid with selected backdate; verify installment and transaction record use chosen date.
- Revert payment still restores original `due_date` (`lib/database-operations.ts:1720–1725`), unaffected by backdated paid date.

## Rollout
- Make backend changes first (types + IPC + DB ops), then wire the UI.
- Keep the "Marcar Pagada" button visible and functional; add the date picker popover to support backdating.

## Next Step
- Implement the above changes and provide a preview so you can validate backdated payments end-to-end.