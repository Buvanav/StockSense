# CLAUDE.md — StockSense Project Guidance

## Project Purpose

StockSense is an Inventory Management System (IMS) built to replace manual
registers, spreadsheets, and scattered tracking for small/medium operations
with multiple warehouses and locations. It supports inventory managers and
warehouse staff with a single connected workflow: receive stock, move it
between locations, ship it out, reconcile physical counts, and see every
change reflected instantly on the dashboard and in an auditable ledger.

## Problem Statement

Manual inventory tracking (paper registers, disconnected spreadsheets) leads
to stock discrepancies, no audit trail, and no real-time visibility into
what's low or out of stock across multiple warehouses. StockSense solves
this by modeling stock per-location (not as one global number), and by
making every stock-changing action pass through a single set of rules that
also write an audit ledger entry.

## Current Architecture

Single-file client-side web application:

- `StockSense.html` — self-contained HTML + CSS + vanilla JS
- No backend, no build step, no external dependencies
- Persistence: browser `localStorage` (key: `ss_db`)
- Runs by opening the file directly in any modern browser

See `docs/ARCHITECTURE.md` for the full breakdown and the planned migration
path to a real backend.

## Technology Choices

- **Frontend:** Vanilla HTML/CSS/JS (no framework). Chosen so the app runs
  with zero install steps and zero network dependency — important because
  the current development environment has no network access for `npm
  install` or git operations.
- **Persistence:** `localStorage`, structured to mirror what will become
  real database tables (see `docs/DATABASE.md`).
- **No CSS/JS frameworks, no build tooling** at this stage. This keeps the
  single-file constraint intact and avoids any dependency resolution step.

## Important Business Rules (never break these)

1. Receipt validation **increases** stock.
2. Delivery validation **decreases** stock.
3. Internal transfer **moves** stock between locations; total company stock
   is unchanged.
4. Adjustment sets stock to a physical count and records the delta.
5. Every stock-changing operation **must** create a ledger entry.
6. A transaction must never be capable of applying twice (each button click
   performs exactly one balance mutation plus one ledger write).
7. Stock must never go negative — deliveries and transfers are blocked with
   a clear "Insufficient stock" error if requested quantity exceeds
   available quantity at the source location.
8. Dashboard KPIs are always computed live from `DB.products`, `DB.stock`,
   and `DB.ledger` — never hard-coded.
9. SKUs must be unique; duplicate SKU creation is rejected.
10. Source and destination location must differ for a transfer.

## Development Rules

- Preserve existing working functionality. Do not rewrite the whole file
  to make a small change — use targeted edits.
- Keep the app dependency-free and runnable as a single HTML file unless
  the user explicitly asks to move to a real backend.
- Any new stock-changing feature must call the same
  `getStock`/`setStock`/`addLedger` helper pattern already used by
  Receipts/Deliveries/Transfers/Adjustments, so the ledger stays complete.
- Validate every operation (required fields, quantity > 0, sufficient
  stock, source ≠ destination) before mutating state.

## Current Implementation Strategy

Build and refine the client-side single-file app first (fast to iterate,
zero setup for the user), and keep the documentation in `docs/` describing
how it maps onto a future real backend. Do not introduce a backend until
the user explicitly asks for it, since this environment cannot install
packages or run a server for testing.

## How Claude Should Continue Development

1. **Always read `DEVELOPMENT_STATUS.md` first** before making any change —
   it is the single source of truth for what's done and what's next.
2. Read relevant `docs/` files for context on architecture, data model,
   and workflow before large changes.
3. Make the smallest safe change that satisfies the request.
4. Test manually by reasoning through the business rules above (no
   automated test runner exists yet).
5. **After any meaningful change**, update:
   - `DEVELOPMENT_STATUS.md`
   - `CHANGELOG.md`
   - the relevant file(s) under `docs/`
6. **Never rely only on conversation history** — this repository's files
   are the persistent memory of the project across sessions and across
   Claude accounts. If conversation context is unavailable, these files
   alone must be enough to resume work correctly.
