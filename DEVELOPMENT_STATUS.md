# StockSense Development Status

## Last Updated

2026-09-26 (checkpoint 2)

## Current Branch

`balaji` (per the repository's own report — latest pushed commit before
this checkpoint was `bb3bda3`, working tree clean).

## Overall Progress

~45% of full spec (P0 core workflow complete, including the Receipt/
Delivery status lifecycle; no real backend/database yet; P1/P2 items
largely outstanding).

## Current Phase

P0 core workflow — Receipt/Delivery lifecycle now implemented.

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
- **Receipts — full Draft → Waiting → Ready → Done → Canceled lifecycle.**
  Creating a receipt only ever produces a Draft (no stock effect). Submit/
  Mark Ready move it forward with no stock effect. Only Validate (Ready →
  Done) increases stock and writes a ledger entry. Draft-stage quantity is
  editable; edits never touch stock. Cancel is available from any
  non-terminal state and never touches stock.
- **Deliveries — the same lifecycle**, with the insufficient-stock check
  happening at Validate: if requested quantity exceeds available stock at
  the location, the document stays in Ready (uncompleted) with a clear
  toast error, and stock is not touched.
- Internal Transfers: move stock between two locations, blocked if
  source = destination or insufficient source stock, total stock
  unchanged, create ledger entry *(unchanged this checkpoint)*
- Inventory Adjustments: reconcile system quantity to physical count,
  require a reason when there's a discrepancy, create ledger entry with
  the delta *(unchanged this checkpoint)*
- Stock Ledger: full auditable table (ref, product, qty change, type,
  location, reason, user, date) for every operation above — Receipts and
  Deliveries now write to it only once, exactly at their Validate step
- Profile page (read-only name/email/role)
- Logout
- Duplicate-transaction protection: `docAction()` re-checks a document's
  current status before acting on it (e.g. `validate` only proceeds if
  status is exactly `Ready`), so clicking Validate again on an already-
  `Done` document, or any other invalid transition, is a silent no-op.
  Transfers/Adjustments keep their pre-existing atomic-click protection.
- Full localStorage persistence across page reloads, including the new
  `receipts`/`deliveries` arrays (old saved data without them is
  auto-migrated to `[]` on load)

## Currently Working On

Nothing in progress — this is a stable checkpoint. Next session should
pick from "Next Tasks" below.

## Next Tasks

1. Add the same Draft → Waiting → Ready → Done → Canceled lifecycle to
   Internal Transfers and Adjustments for consistency (currently only
   Receipts/Deliveries have it; Transfers/Adjustments still validate
   immediately, which was intentionally left untouched this checkpoint).
2. Add Settings page (default warehouse, warehouse/location management —
   currently warehouses/locations are hard-coded in the `LOC` constant).
3. Add Search and smart filters across Products and the Stock Ledger
   (by SKU/name/category/warehouse/location/status/document type).
4. Add editable warehouses/locations (currently fixed to two warehouses,
   four locations).
5. Add multi-item receipts/deliveries (currently one product per
   document; spec implies multiple line items per document).
6. Replace the `prompt()`-based quantity edit (used for Draft-stage
   Receipts/Deliveries) with an inline form field for a cleaner UX.
7. Consider real backend migration per `docs/ARCHITECTURE.md` if/when the
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
- Minor UX limitation (not a bug): editing a Draft receipt/delivery's
  quantity uses a browser `prompt()` dialog rather than an inline form
  field. Functionally correct, just not polished (see Next Task #6).

## Technical Decisions

- Single HTML file, vanilla JS, localStorage persistence — chosen for
  zero-setup runnability and because the assistant's environment cannot
  install npm packages or reach a database. See `docs/ARCHITECTURE.md`.
- Warehouses/locations are currently a hard-coded JS object (`LOC`) rather
  than user-editable data, to keep the first working version small.
- **Receipts and Deliveries now use a Draft → Waiting → Ready → Done →
  Canceled lifecycle** (Transfers/Adjustments were deliberately left as
  immediate-validate for this checkpoint, per the request that scoped
  this change to Receipts/Deliveries only).
- Lifecycle is implemented via one shared `docAction(kind, action, id)`
  dispatcher plus one shared `docTable()`/`docBadge()` renderer, used by
  both Receipts and Deliveries, so the two document types can't drift out
  of sync with each other. `kind` is `'receipt'` or `'delivery'` and
  selects `DB.receipts` vs `DB.deliveries` plus which stock direction and
  ledger `type` to use inside the shared `validate` branch.
- Duplicate-application and invalid-transition protection is implemented
  by re-checking `d.status` at the top of every branch in `docAction()`
  before mutating anything — e.g. `validate` only proceeds when
  `d.status === 'Ready'`, so it's a no-op on an already-`Done` or
  already-`Canceled` document, and `edit`/`submit`/`ready` are similarly
  guarded to their one valid source status.

## Database / Persistence Status

Client-side only: browser `localStorage`, key `ss_db`, holding `users`,
`products`, `stock`, `ledger`, **`receipts`, `deliveries`** (new this
checkpoint — each an array of `{id, sku, loc, qty, status}`), and a `seq`
counter for reference numbers. Old saved data missing `receipts`/
`deliveries` is auto-migrated to `[]` on load, so existing localStorage
from before this checkpoint keeps working. See `docs/DATABASE.md` for the
full schema and its future mapping to a real database.

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
reorder-level-based status calculation. Receipts and Deliveries now only
mutate stock at their Validate step (Ready → Done); Transfers and
Adjustments still mutate stock immediately on submission (unchanged this
checkpoint). All four operation types correctly follow the business
rules in `CLAUDE.md`.

## Ledger Status

Working: every operation appends one ledger entry with ref number,
product, signed quantity change, operation type, location(s), reason
(where applicable), user, and timestamp. Newest entries shown first.
Receipt/Delivery ledger entries are now written exactly once, at
Validate — not at document creation — and reuse the document's own
reference number so a ledger entry can always be traced back to its
originating document.

## Testing Status

Manual only, but this checkpoint's lifecycle logic was additionally
exercised with a standalone Node.js script (DOM calls stubbed out) that
drove `createReceipt`/`docAction`/`createDelivery` directly and asserted
on `DB` state after each transition — not a committed automated test
suite, but more than code-reading alone. The Section 43 / this task's
"Testing" scenarios (draft→waiting→ready→done for both receipt and
delivery, re-validating an already-Done document, cancelling a draft,
insufficient-stock delivery) all produced the expected stock and status
values in that run.

## Last Successful Test

Node-script simulation of: create Receipt (100 KG) → Draft → Waiting →
Ready → Validate (stock +100, status Done) → re-Validate (stock
unchanged at 100, status stays Done) → separate Draft receipt Cancelled
(stock unaffected) → create Delivery (5 KG) → Waiting → Ready → Validate
(stock -5, status Done) → re-Validate (stock unchanged) → oversized
Delivery (9999 KG) submitted through to Ready → Validate correctly
rejected with an "Insufficient stock" message, document remained in
Ready, stock unchanged. All results matched expectations.

## Last Git Commit

`bb3bda3` on `balaji`, as reported by the user at the start of this
checkpoint (working tree was clean at that point). This checkpoint's
changes have not been committed yet — that's the user's next step after
downloading the updated files.

## Exact Resume Point

Resume by implementing the same Draft → Waiting → Ready → Done →
Canceled lifecycle for Internal Transfers and Adjustments (Next Task #1),
reusing the existing `docAction`/`docTable`/`docBadge` pattern built for
Receipts/Deliveries rather than inventing a second pattern. Do not change
Receipt/Delivery logic while doing this. Read `docs/WORKFLOW.md` and
`docs/DATABASE.md` first — both still describe Transfers/Adjustments as
immediate-validate and will need updating once that task is done.
