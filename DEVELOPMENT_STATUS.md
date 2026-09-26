# StockSense Development Status

## Last Updated

2026-09-26 (checkpoint 3)

## Current Branch

`balaji` (working tree was clean at the start of this checkpoint, on top
of checkpoint 2's delivered-but-not-yet-committed changes).

## Overall Progress

~55% of full spec (P0 core workflow complete — all four document types
now share one Draft → Waiting → Ready → Done → Canceled lifecycle; no
real backend/database yet; P1/P2 items largely outstanding).

## Current Phase

P0 core workflow — Receipt/Delivery/Transfer/Adjustment lifecycle now
implemented and consistent across all four document types.

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
- **Internal Transfers — now the same Draft → Waiting → Ready → Done →
  Canceled lifecycle as Receipts/Deliveries.** Creating a Transfer only
  ever produces a Draft (no stock effect). Submit/Mark Ready move it
  forward with no stock effect. Only Validate (Ready → Done) re-checks
  every invariant (product exists, quantity > 0, both locations exist,
  source ≠ destination, sufficient source stock) and, on success, moves
  stock from source to destination (total company stock unchanged) and
  writes exactly one `Transfer` ledger entry. Draft-stage product/
  quantity/source/destination are all editable; edits never touch stock.
  Cancel is available from Draft/Waiting/Ready and never touches stock.
- **Inventory Adjustments — same lifecycle.** Creating an Adjustment only
  ever produces a Draft. Only Validate compares the physical count
  against the current system quantity, requires a reason if they differ,
  and on success sets stock to the physical count and writes exactly one
  `Adjustment` ledger entry with the signed delta (including a `delta = 0`
  entry for a zero-difference count, matching the pre-existing ledger
  convention). Adjustments are the one document type still editable while
  `Ready` (not just `Draft`), so a Validate that failed for "reason
  required" can be corrected without discarding the document.
- Stock Ledger: full auditable table (ref, product, qty change, type,
  location, reason, user, date) for every operation above — all four
  document types now write to it only once, exactly at their Validate
  step
- Profile page (read-only name/email/role)
- Logout
- Duplicate-transaction protection: `docAction()` re-checks a document's
  current status before acting on it (e.g. `validate` only proceeds if
  status is exactly `Ready`), so clicking Validate again on an already-
  `Done` document, or any other invalid transition, is a silent no-op —
  **now true for Transfers and Adjustments too**, not just Receipts/
  Deliveries.
- Full localStorage persistence across page reloads, including
  `receipts`/`deliveries`/`transfers`/`adjustments` arrays (old saved
  data without any of them is auto-migrated to `[]` on load — see Part 5
  / Database Status below)

## Currently Working On

Nothing in progress — this is a stable checkpoint. Next session should
pick from "Next Tasks" below.

## Next Tasks

1. Add Settings page (default warehouse, warehouse/location management —
   currently warehouses/locations are hard-coded in the `LOC` constant).
2. Add Search and smart filters across Products and the Stock Ledger
   (by SKU/name/category/warehouse/location/status/document type).
3. Add editable warehouses/locations (currently fixed to two warehouses,
   four locations).
4. Add multi-item receipts/deliveries/transfers/adjustments (currently
   one product per document; spec implies multiple line items per
   document).
5. Replace the `prompt()`-based field edits (used for all four Draft-
   stage document types, and Adjustments at Ready) with inline form
   fields for a cleaner UX.
6. Consider real backend migration per `docs/ARCHITECTURE.md` if/when the
   user wants persistence beyond a single browser's localStorage.

## Blocked Items

- None currently. (Historical note: this development environment has no
  network access, so `npm install`, `git clone`, and `git push` cannot be
  run from within a Claude session here — hence the client-side,
  dependency-free approach. This is a constraint of the assistant's
  sandbox, not of the project itself.)

## Known Bugs

- None known. Manual review has not caught edge cases; a standalone
  `vm`-based Node.js test suite exists (see Testing Status) but is not a
  committed/CI-run automated suite yet.
- Minor UX limitation (not a bug): editing a Draft-stage document (any of
  the four types), or a Ready-stage Adjustment, uses browser `prompt()`
  dialogs (one per field, sequentially) rather than an inline form.
  Functionally correct, just not polished (see Next Task #5).

## Technical Decisions

- Single HTML file, vanilla JS, localStorage persistence — chosen for
  zero-setup runnability and because the assistant's environment cannot
  install npm packages or reach a database. See `docs/ARCHITECTURE.md`.
- Warehouses/locations are currently a hard-coded JS object (`LOC`) rather
  than user-editable data, to keep the first working version small.
- **All four document types (Receipt, Delivery, Transfer, Adjustment) now
  use the same Draft → Waiting → Ready → Done → Canceled lifecycle.**
  Checkpoint 3 extended Transfers/Adjustments to match the lifecycle
  Receipts/Deliveries already had, rather than leaving them as immediate-
  validate.
- Lifecycle is implemented via one shared `docAction(kind, action, id)`
  dispatcher plus one shared `docBadge()` renderer, used by all four
  document types, so they can't drift out of sync with each other. `kind`
  is `'receipt'`, `'delivery'`, `'transfer'`, or `'adjustment'`; a small
  `docList(kind)` helper (new this checkpoint) resolves it to the right
  `DB.*` array, and `renderDocPage(kind)` resolves it to the right render
  function, so `docAction()` doesn't need a long if/else at every call
  site. `docTable(kind, list)` now branches on `kind` to render each
  type's own columns (Transfer: Source/Destination; Adjustment: Physical
  Qty/Location/Reason) while the Receipt/Delivery branch is byte-for-byte
  what it was in checkpoint 2.
- No `transferAction()`/`adjustmentAction()` were introduced — Transfers
  and Adjustments are handled by extending the existing `docAction()`
  branches (`edit` and `validate` have kind-specific logic where the
  business rules genuinely differ; `cancel`/`submit`/`ready` are identical
  status-only transitions shared by all four kinds, unchanged from
  checkpoint 2).
- Duplicate-application and invalid-transition protection is implemented
  by re-checking `d.status` at the top of every branch in `docAction()`
  before mutating anything — e.g. `validate` only proceeds when
  `d.status === 'Ready'`, so it's a no-op on an already-`Done` or
  already-`Canceled` document, and `edit`/`submit`/`ready` are similarly
  guarded — now true for Transfers/Adjustments as well.
- **Adjustment is the one document type editable while `Ready`, not just
  `Draft`** — a deliberate, narrowly-scoped exception (only the `edit`
  action's guard and `docActionsHtml()`'s Ready-stage buttons differ by
  kind) so a Validate that failed because a reason was missing can be
  corrected without discarding the document. Every other status-only
  transition, and every other document type's `edit`, is unchanged.
- Transfer's Validate re-checks all invariants (product exists, quantity
  positive, both locations still exist, source ≠ destination, sufficient
  source stock) at Validate time rather than trusting the Draft-time
  input, since the product/location data could change between creation
  and validation.
- Zero-delta Adjustments still write one ledger entry with `qty: 0` —
  this preserves the exact pre-checkpoint-3 `doAdjust()` convention
  rather than inventing a new "skip the ledger entry" rule.

## Database / Persistence Status

Client-side only: browser `localStorage`, key `ss_db`, holding `users`,
`products`, `stock`, `ledger`, `receipts`, `deliveries`,
**`transfers`, `adjustments`** (new this checkpoint — `transfers` is an
array of `{id, sku, qty, from, to, status}`, `adjustments` is an array of
`{id, sku, loc, phys, reason, status}`), and a `seq` counter for
reference numbers. Old saved data missing `transfers`/`adjustments` (i.e.
any pre-checkpoint-3 save, since neither array existed before this
checkpoint) is auto-migrated to `[]` on load — the same pattern already
used for `receipts`/`deliveries` since checkpoint 2 — so existing
localStorage keeps working with no data loss. See `docs/DATABASE.md` for
the full schema, the backward-compatibility note, and the future mapping
to a real database.

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
reorder-level-based status calculation. All four operation types
(Receipt, Delivery, Transfer, Adjustment) now only mutate stock at their
Validate step (Ready → Done) — Transfers/Adjustments moved off their old
immediate-mutate-on-submit behavior this checkpoint, to match Receipts/
Deliveries. All four operation types correctly follow the business rules
in `CLAUDE.md`.

## Ledger Status

Working: every operation appends one ledger entry with ref number,
product, signed quantity change, operation type, location(s), reason
(where applicable), user, and timestamp. Newest entries shown first. All
four document types' ledger entries are now written exactly once, at
Validate — not at document creation — and reuse the document's own
reference number so a ledger entry can always be traced back to its
originating document. Zero-delta Adjustments still write one entry with
`qty: 0`, matching the pre-checkpoint-3 convention.

## Testing Status

Manual only, but this checkpoint's lifecycle logic was additionally
exercised with a standalone Node.js test harness (`test_harness.js`,
using Node's built-in `vm` module with a stubbed `document`/`localStorage`
— not a browser, and not jsdom, which isn't available in this sandbox).
The harness loads the actual `<script>` block out of `StockSense.html`
and runs it against a proxy-based fake global object so that DOM-only
globals like `main`, `rProd`, etc. resolve to inert stub elements instead
of throwing, then drives `docAction()`/`createTransfer`/`createAdjustment`
directly and asserts on `DB` state after each transition. This is more
than code-reading alone, though it is not a committed/CI-run suite. All
11 scenarios below were run and passed on the final version of
`StockSense.html`.

## Last Successful Test

Full run of `test_harness.js` against this checkpoint's `StockSense.html`,
11/11 passing:

1. Transfer full lifecycle (Draft → Waiting → Ready → Validate): stock
   moves from source to destination, total unchanged, exactly one
   `Transfer` ledger entry.
2. Duplicate transfer validation: re-validating an already-`Done`
   Transfer is a no-op (no second stock move, no second ledger entry).
3. Insufficient transfer stock: Validate with a shortfall leaves the
   Transfer in `Ready`, stock and ledger untouched.
4. Transfer cancel from Draft: status becomes `Canceled`, stock/ledger
   untouched; cancelling again is a no-op.
5. Adjustment negative discrepancy (100 → 97, reason given): stock set to
   97, one ledger entry with `qty: -3`.
6. Adjustment positive discrepancy (100 → 105, reason given): stock set
   to 105, one ledger entry with `qty: +5`.
7. Zero-difference adjustment (100 → 100): stock unchanged at 100, status
   `Done`, one ledger entry with `qty: 0` (existing convention preserved).
8. Missing adjustment reason: Validate with a discrepancy and no reason
   leaves the document in `Ready`, stock/ledger untouched; editing the
   Ready-stage document to add a reason and re-validating succeeds
   (stock → 97, one ledger entry with `qty: -3`).
9. Adjustment cancel from Draft: status becomes `Canceled`, stock/ledger
   untouched.
10. Regression: Receipt (100 KG in) and Delivery (5 KG out) full
    lifecycles, duplicate-validate no-ops, an oversized (9999 KG)
    Delivery correctly blocked at Validate, and `renderDashboard`/
    `renderProducts`/`renderLedger`/`renderTransfers`/`renderAdjustments`
    all callable without throwing — confirms checkpoint 2 behavior is
    unaffected.
11. Backward-compatible migration: loading a simulated pre-checkpoint-3
    `ss_db` blob (no `transfers`/`adjustments` keys at all) results in
    both being initialized to `[]`, while existing `users`, `products`,
    `stock`, and `ledger` data are preserved exactly.

## Last Git Commit

Reported as `bb3bda3` on `balaji` at the start of checkpoint 2 (working
tree clean at that point); checkpoint 2's changes were delivered but, per
the user's workflow, not committed from within this environment.
Checkpoint 3 continues from that same delivered-but-uncommitted state —
this checkpoint's changes have likewise not been committed. Committing
both checkpoints' changes is the user's next step.

## Exact Resume Point

Checkpoint 3 (Internal Transfers + Inventory Adjustments lifecycle) is
complete. The next session should pick from "Next Tasks" above — there is
no unfinished lifecycle work outstanding. If a future session revisits
this area, note that `docList(kind)` and `renderDocPage(kind)` (added
this checkpoint) are the two small helpers `docAction()` now uses to
resolve `kind` to the right `DB.*` array and render function; extend
those rather than adding new if/else chains if a fifth document type is
ever introduced.
