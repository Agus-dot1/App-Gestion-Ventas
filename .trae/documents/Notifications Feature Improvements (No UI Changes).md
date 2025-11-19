## Goals
- Keep the current UI intact.
- Improve correctness, performance, and maintainability of notifications.
- Add observability and retention without altering user-facing components.

## Phase 1: Source‑Level Snooze/Mute Enforcement
- Gate creation and delivery in the main process:
  - Respect global mute and a new snooze window before creating DB rows or emitting IPC.
  - Implement `snoozeUntil` in main process memory and optional persistence.
- Apply gates in:
  - Overdue/upcoming/weekly scheduler (`notifications/scheduler.ts:26–181`).
  - Low‑stock after sale (`notifications/scheduler.ts:185–237`).
  - Manual/test event (`notifications/ipc/handlers.ts:28–55`).
- Rationale: current mute prevents only delivery (returns `null` window) but still creates DB entries; snooze in UI doesn’t stop source creation.

## Phase 2: Structured Meta Everywhere (Reduce Regex Reliance)
- Prefer explicit meta in events and DB normalization; only fall back to regex when meta is missing.
- Update normalizer to trust meta (customerName, due_at, amount, product details), and use regex only as fallback (`notifications/normalize.ts:47–129, 131–164`).
- Ensure all scheduler emissions include complete meta fields (already done for most payloads):
  - Overdue/upcoming: `customerName`, `due_at`, `amount` (`notifications/scheduler.ts:52–56, 88–99`).
  - Weekly precheck: `customerNames`, `customerCount`, `actionLabel`, `route` (`notifications/scheduler.ts:149–162`).
  - Low stock: product id/name/price/category/stock (`notifications/scheduler.ts:210–223`).
- Rationale: reduces brittle regex paths and locale dependencies while keeping messages unchanged for display.

## Phase 3: Stronger Dedup and Cleanup
- DB‑level cleanup: delete extra active duplicates by `message_key` in a single SQL statement.
  - Replace the in‑memory pass in `cleanupOrphanedNotifications()` with a deterministic SQL dedupe.
- Keep unique active key index (`lib/database.ts:416–423`) and `exists*` checks (`lib/database-operations.ts:2071–2104`).
- Rationale: current cleanup loop can be O(N) and error‑prone; SQL dedupe is faster and safer.

## Phase 4: Retention Policy & Archivado
- Add scheduled daily purge for archived notifications older than a retention window (e.g., 90 days):
  - New scheduler task with simple `DELETE` by `deleted_at < date('now','-90 days')`.
- Keep manual `purgeArchived()` (`lib/database-operations.ts:2120–2123`).
- Rationale: prevents unbounded table growth while preserving daily workflow.

## Phase 5: Performance and Throughput
- Batch delivery when many events are generated in one tick:
  - Aggregate overdue/upcoming into a single IPC batch with an array payload when count > threshold.
  - Adapter supports both single and batch events transparently.
- Micro‑optimizations:
  - Early `existsActiveWithKey` check before DB insert to avoid write+index churn.
  - Move currency formatting out of messages; rely on meta `amount` (keep message text as is to avoid UI change).
- Rationale: reduces IPC overhead and duplicate DB writes in burst scenarios.

## Phase 6: Observability (Latency & Health)
- Instrument delivery latency with lightweight markers:
  - Add `meta.created_at` (already used) and renderer receipt timestamp; compute deltas in adapter/controller.
  - Expose an in‑memory ring buffer for diagnostics (dev‑only, no UI surface required).
- Optional counters: deliveries per tick, drops by dedupe.
- Rationale: quantify improvements and detect regressions without UI changes.

## Phase 7: API Hardening & Error Handling
- Normalize and centralize error handling:
  - Replace empty `catch {}` with bounded logging in main process and guardrails for adapter callbacks (`notifications/renderer/adapter.ts:37–44`).
- Rate‑limit `emitTestEvent` to prevent spam tests.
- Rationale: safer behavior under failure, fewer silent errors.

## Phase 8: Tests
- Add unit tests for:
  - Normalizer meta‑first path and regex fallbacks.
  - Dedupe logic (`isDuplicate` and `dedupe`) with edge cases (`notifications/normalize.ts:232–260`).
  - Scheduler gates for snooze/mute (injectable clock).
- Rationale: confidence in refactors without UI impact.

## Phase 9: Schema Evolutions (Optional)
- Add `notifications.meta_json` to store structured meta alongside message (no UI change).
  - Backfill by serializing current meta into JSON on insert.
- Keep `message_key` and `message` for display and dedupe.
- Rationale: future‑proofing and simpler normalization.

## Acceptance Criteria
- No changes to UI components or markup.
- Mute/snooze prevents both creation and delivery during window.
- Normalizer uses meta by default; regex paths remain as fallback.
- Duplicates of active notifications are eliminated deterministically.
- Archived rows auto‑purged after retention period.
- Lower IPC volume under bursts; measurable latency improvements.
- Tests pass for normalization, dedupe, and gates.

## Rollout Plan
- Implement behind environment flags for scheduler gates and batching.
- Ship in stages: Phase 2 → 3 → 1 → 4 → 5; instrument in Phase 6; add tests in Phase 8.
- Monitor DB size and delivery metrics for two cycles before enabling purge by default.
