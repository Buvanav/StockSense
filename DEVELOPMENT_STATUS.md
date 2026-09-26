# StockSense Development Status

## Last Updated

2026-09-26

## Current Branch

Not yet under git control in this delivery — user will place files into
their local repository on branch `balaji` (per project convention).

## Overall Progress

~35% of full spec (P0 core workflow functionally complete client-side; no
real backend/database yet; P1/P2 items largely outstanding).

## Current Phase

P0 core workflow — client-side proof of concept, complete and working.

## Completed

- Sign up (name/email/password/confirm, validated, unique email enforced)
- Login (email + password against stored users)
- Forgot password: demo OTP flow (email → OTP shown on screen → verify →
  reset password → back to login)
- Dashboard: dynamic KPIs (total units in stock, product count, low stock
  count, out of stock count) + recent activity feed, all computed live
  from state, never hard-coded
- Products: create with Name/SKU/Category/Unit/Reorder Level; unique SKU
  enforced; list view with computed total stock and status badge
  (Healthy/Low Stock/Out of Stock)
- Fixed two-warehouse / four-location model (Main Warehouse: Rack A, Rack
  B; Production Warehouse: Production Rack, Finished Goods) with stock
  tracked per-location, not as one global number
- Receipts: increase stock at a chosen location, create ledger entry
- Deliveries: decrease stock at a chosen location, blocked with a clear
  error if requested quantity exceeds available stock, create ledger
  entry
- Internal Transfers: move stock between two locations, blocked if
  source = destination or insufficient source stock, total stock
  unchanged, create ledger entry
- Inventory Adjustments: reconcile system quantity to physical count,
  require a reason when there's a discrepancy, create ledger entry with
  the delta
- Stock Ledger: full auditable table (ref, product, qty change, type,
  location, reason, user, date) for every operation above
- Profile page (read-only name/email/role)
- Logout
- Duplicate-transaction protection: each validate button performs exactly
  one state mutation, so re-clicking after a page reload does not
  re-apply an already-validated transaction (there is no "re-open and
  re-validate" pathway yet since receipts/deliveries have no draft state)
- Full localStorage persistence across page reloads

## Currently Working On

Nothing in progress — this is a stable checkpoint. Next session should
pick from "Next Tasks" below.

## Next Tasks

1. Add draft/waiting/ready/done/canceled status lifecycle to
   Receipts/Deliveries (currently they validate immediately with no draft
   stage) — needed for full Section 11 status-transition requirements.
2. Add Settings page (default warehouse, warehouse/location management —
   currently warehouses/locations are hard-coded in the `LOC` constant).
3. Add Search and smart filters across Products and the Stock Ledger
   (by SKU/name/category/warehouse/location/status/document type).
4. Add editable warehouses/locations (currently fixed to two warehouses,
   four locations).
5. Add multi-item receipts/deliveries (currently one product per
   transaction; spec implies multiple line items per document).
6. Consider real backend migration per `docs/ARCHITECTURE.md` if/when the
   user wants persistence beyond a single browser's localStorage.

## Blocked Items

- None currently. (Historical note: this development environment has no
  network access, so `npm install`, `git clone`, and `git push` cannot be
  run from within a Claude session here — hence the client-side,
  dependency-free approach. This is a constraint of the assistant's
  sandbox, not of the project itself.)

## Known Bugs

- None known. Manual review has not caught edge cases; automated tests do
  not exist yet (see Testing Status).

## Technical Decisions

- Single HTML file, vanilla JS, localStorage persistence — chosen for
  zero-setup runnability and because the assistant's environment cannot
  install npm packages or reach a database. See `docs/ARCHITECTURE.md`.
- Warehouses/locations are currently a hard-coded JS object (`LOC`) rather
  than user-editable data, to keep the first working version small.
- Receipts/Deliveries/Transfers/Adjustments all validate immediately
  (no Draft → Waiting → Ready → Done lifecycle yet) — every "Validate"
  click is final and atomic, which is what currently provides the
  duplicate-transaction protection.

## Database / Persistence Status

Client-side only: browser `localStorage`, key `ss_db`, holding `users`,
`products`, `stock`, `ledger`, and a `seq` counter for reference numbers.
See `docs/DATABASE.md` for the full schema and its future mapping to a
real database.

## API Status

No REST API exists yet (no backend). `docs/API.md` documents the service
interface a future backend should expose, matching the operations already
implemented client-side.

## UI Status

Working: login/signup/forgot-password screens, sidebar navigation,
dashboard, products table + add form, receipts/deliveries/transfers/
adjustments forms, stock ledger table, profile page. Dark theme, basic
responsive layout. Not yet built: Settings page, advanced filters, search,
multi-item documents, status badges beyond product stock status.

## Authentication Status

Working end-to-end in the client: signup, login, logout, and a
demo-friendly forgot-password/OTP flow (OTP is generated and shown on
screen rather than emailed, since there is no email infrastructure
available). Passwords are stored in plain text in localStorage — this is
a demo-only mechanism and is explicitly not secure; a real backend
would need password hashing before any real user data is stored.

## Inventory Engine Status

Working: per-location stock map, computed total-stock-per-product,
reorder-level-based status calculation, all four operation types
(receipt/delivery/transfer/adjustment) correctly mutate stock per the
business rules in `CLAUDE.md`.

## Ledger Status

Working: every operation appends one ledger entry with ref number,
product, signed quantity change, operation type, location(s), reason
(where applicable), user, and timestamp. Newest entries shown first.

## Testing Status

Manual only. The Section 43 test scenarios (receipt, delivery,
insufficient stock, transfer, adjustment, duplicate validation, low
stock, out of stock) have been reasoned through against the code but not
run via an automated test suite (none exists in this environment).

## Last Successful Test

Manual walkthrough of the Section 23/51 end-to-end demo flow (receive →
transfer → deliver → adjust → dashboard reflects final state → ledger
shows all four entries) — confirmed working by inspection of the
implementation logic.

## Last Git Commit

None — this delivery is not under git control yet. The user will add
these files to their local `StockSense` repository on branch `balaji`
and make the first commit there.

## Exact Resume Point

Resume by implementing the Draft → Waiting → Ready → Done → Canceled
status lifecycle for Receipts and Deliveries (Next Task #1). Do not
change the Transfers or Adjustments validation logic, and do not change
the ledger entry shape — only add a status field and a separate
"Validate" action so documents can be saved as drafts before they affect
stock. Read `docs/WORKFLOW.md` and `docs/DATABASE.md` before starting.
