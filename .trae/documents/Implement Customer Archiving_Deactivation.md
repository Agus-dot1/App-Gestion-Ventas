## Goals
- Replace destructive delete with archive/deactivate when the customer has sales.
- Preserve sales integrity and accounting while hiding archived customers by default.
- Allow optional PII anonymization and reactivation.

## Data Model
1. Add `is_active BOOLEAN DEFAULT 1` to `customers`.
2. Add `archived_at DATETIME NULL` to `customers`.
3. (Optional) Add `anonymized BOOLEAN DEFAULT 0` to track PII removal.

## Migrations
1. Extend `lib/database.ts` table creation with safe `ALTER TABLE` checks for the above columns.
2. Backfill: set `is_active = 1` for existing rows; leave `archived_at` NULL.
3. Ensure foreign keys remain ON; no schema change to `sales`/`installments` needed.

## Backend Operations
1. New `customerOperations.archive(id, options)`:
   - Set `is_active = 0`, `archived_at = datetime('now')`.
   - If `options.anonymize`, clear PII fields (`dni`, `email`, `phone`, `secondary_phone`, `address`, `notes`, `contact_info`).
2. New `customerOperations.unarchive(id)` sets `is_active = 1`, `archived_at = NULL`.
3. Update `customerOperations.getPaginated(...)` and `search(...)`:
   - Default filter `WHERE is_active = 1`.
   - Accept `includeArchived` flag to show all or only archived when needed.
4. Add IPC handlers: `customers:archive`, `customers:unarchive` and broadcast `database:changed` for customers (create/update/archive/unarchive/delete).

## UI/UX
1. Customers Page:
   - If a customer has sales, show dialog with options: `Archive`, `Archive & Anonymize`, `Delete All (Admin)`, `Cancel`.
   - Default to `Archive`; require type-to-confirm for destructive delete.
   - After archive, refresh list and pagination; show toast feedback.
2. Table filters:
   - Add toggle/dropdown to show `Active`, `Archived`, or `All`.
   - Exclude archived by default in normal views.
3. Customer Profile:
   - Show an “Archived” badge and disable editing of non-essential fields.
   - Provide `Unarchive` action.

## Privacy & Compliance
- Use `Archive & Anonymize` to retain financial records while removing PII.
- Document retention behavior and ensure exports respect the filter (exclude archived unless requested).

## Testing & Verification
1. Unit tests for `archive/unarchive` operations and paginator behavior after archival.
2. E2E: archive a customer with multiple sales; confirm sales remain, customer hidden, pagination corrected.
3. E2E: unarchive flow restores visibility.

## Rollout
- Add a setting in `Ajustes` to choose default action on delete when sales exist (Archive vs Prompt).
- Provide one-time migration notice and optional bulk-archive for legacy data.

## Success Criteria
- No loss of sales data; customer disappears from default views after archive.
- UI clearly communicates archival state; actions are reversible without data corruption.
- Loader never hangs; list refreshes and paginates correctly after archival.