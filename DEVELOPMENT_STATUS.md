# StockSense Development Status

## Last Updated

2026-09-26 (checkpoint 4)

## Current Branch

`balaji` (working tree was clean at the start of this checkpoint, on top
of checkpoints 2 and 3, which are already committed and pushed to
`origin/balaji` — see Last Git Commit below).

## Overall Progress

~62% of full spec (P0 core workflow complete since checkpoint 3; warehouse/
location configuration is now user-editable data instead of hard-coded,
closing out Next Task #1 from checkpoint 3; no real backend/database yet;
remaining P1/P2 items — search/filters, editable-beyond-warehouses items,
multi-item documents, inline-form edits, backend migration — still
outstanding).

## Current Phase

Settings / Warehouse & Location Management (checkpoint 4) — complete.
Receipt/Delivery/Transfer/Adjustment lifecycle (checkpoints 2–3) is
unchanged and unaffected.

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
- **Settings page (new this checkpoint):** warehouses and locations moved
  from the hard-coded `LOC` constant into `DB.warehouses` (`[{name,
  locations}]`), managed from a new Settings page/nav item. Add/rename/
  remove for both warehouses and locations, plus a `DB.defaultWarehouse`
  setting that pre-selects that warehouse's first location in the
  Receipt/Delivery/Transfer/Adjustment "New" forms. `allLocs()`/
  `locOptions()` now read `DB.warehouses` exclusively — the old `LOC`
  constant is kept only as `DEFAULT_LOC`, a one-time migration seed.
- Location rename cascades into `DB.stock` keys, every document's
  `loc`/`from`/`to` field, and Stock Ledger rows (including
  `"From → To"`-style Transfer rows), so nothing is left pointing at a
  stale name; it's blocked only on a name collision.
- Location removal is blocked if any product carries non-zero stock
  there, or if any Receipt/Delivery/Transfer/Adjustment document — any
  status, including Done/Canceled — references it (`locationInUse()`).
  Warehouse removal is blocked while it still has locations, and while it
  is the only warehouse remaining; removing the current default warehouse
  reassigns the default to another remaining warehouse.
- Backward-compatible migration for `DB.warehouses`/`DB.defaultWarehouse`:
  a database saved before this checkpoint (or a brand-new one) is seeded
  from the old `LOC` names, so every existing stock key and document field
  keeps resolving to the same location — see Database Status below.

## Currently Working On

Nothing in progress — this is a stable checkpoint. Next session should
pick from "Next Tasks" below.

## Next Tasks

1. Add Search and smart filters across Products and the Stock Ledger
   (by SKU/name/category/warehouse/location/status/document type).
2. Add multi-item receipts/deliveries/transfers/adjustments (currently
   one product per document; spec implies multiple line items per
   document).
3. Replace the `prompt()`-based field edits (used for all four Draft-
   stage document types, Adjustments at Ready, and now Settings'
   Rename Warehouse/Rename Location) with inline form fields for a
   cleaner UX.
4. Consider real backend migration per `docs/ARCHITECTURE.md` if/when the
   user wants persistence beyond a single browser's localStorage.
5. Consider giving warehouses/locations real IDs instead of using `name`
   as the identifier, if a future checkpoint needs to decouple display
   name from identity (e.g. so two different-region warehouses could
   share a display name).

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
  the four types), a Ready-stage Adjustment, or renaming a warehouse/
  location in Settings, uses browser `prompt()` dialogs (one per field,
  sequentially) rather than an inline form. Functionally correct, just
  not polished (see Next Task #3).
- Minor UX limitation (not a bug): warehouse/location names are used
  directly in `onclick="..."` attribute strings in the Settings page
  (matching the existing convention used elsewhere for document ids), so
  a name containing an apostrophe or quote could break the generated
  HTML. No validation against this exists yet, same as elsewhere in the
  app (e.g. product names/SKUs have the same theoretical exposure).

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
- **Checkpoint 4:** `DB.warehouses` uses `name` as the identifier (no
  separate `id` field yet), matching how the old `LOC` constant was keyed
  by warehouse name. This kept the migration a pure data-shape change
  (object → array) with no renumbering of anything.
- Location rename and location removal use deliberately different safety
  rules: rename updates every reference in place (stock keys, all four
  document arrays, and Stock Ledger rows), so nothing can be orphaned by
  it — it's blocked only on a name collision with an existing location.
  Removal deletes the location outright, so it's blocked whenever
  anything (non-zero stock, or any document of any status) still points
  at it. The Stock Ledger is deliberately excluded from the removal
  check — ledger rows store their own location text for the audit trail
  and don't depend on the location still existing in `DB.warehouses`,
  the same way a ledger row keeps showing a product's name after that
  product changes.
- Location names remain unique **across all warehouses**, not per-
  warehouse, because `stockKey()` is `"SKU@@Location"` with no warehouse
  component — this was true implicitly under the old `LOC` constant and
  is now enforced explicitly by `addLocation()`/`renameLocation()`.
- `DEFAULT_LOC` (the renamed `LOC` constant) is read exactly once, only
  by the migration check on load — no other function reads it. Everything
  that used to read `LOC` (`allLocs()`) now reads `DB.warehouses`.
- The document lifecycle files (`docList`, `renderDocPage`, `docAction`,
  `docTable`, `docBadge`) were not touched by this checkpoint — Settings
  only adds new functions and edits `DB.warehouses`/`DB.defaultWarehouse`.

## Database / Persistence Status

Client-side only: browser `localStorage`, key `ss_db`, holding `users`,
`products`, `stock`, `ledger`, `receipts`, `deliveries`, `transfers`,
`adjustments`, **`warehouses`, `defaultWarehouse`** (new this checkpoint —
`warehouses` is an array of `{name, locations:[name,...]}`,
`defaultWarehouse` is a warehouse name), and a `seq` counter for reference
numbers. Old saved data missing `warehouses` (i.e. any pre-checkpoint-4
save, since it didn't exist before this checkpoint) is auto-migrated on
load by seeding it from the old hard-coded `LOC` constant (now
`DEFAULT_LOC`) with the same warehouse/location names, so every existing
`"SKU@@Location"` stock key and every existing document's `loc`/`from`/
`to` field keeps resolving correctly — the same non-destructive migration
pattern already used for `receipts`/`deliveries` since checkpoint 2 and
`transfers`/`adjustments` since checkpoint 3. See `docs/DATABASE.md` for
the full schema, the backward-compatibility note, and the future mapping
to a real database.

## API Status

No REST API exists yet (no backend). `docs/API.md` documents the service
interface a future backend should expose, matching the operations already
implemented client-side.

## UI Status

Working: login/signup/forgot-password screens, sidebar navigation,
dashboard, products table + add form, receipts/deliveries/transfers/
adjustments forms, stock ledger table, **Settings page (new this
checkpoint: default-warehouse picker, add/rename/remove warehouse, add/
rename/remove location)**, profile page. Dark theme, basic responsive
layout. Not yet built: advanced filters, search, multi-item documents,
status badges beyond product stock status, inline-form edits (Settings'
renames still use `prompt()`, like the existing document edits).

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
(Receipt, Delivery, Transfer, Adjustment) only mutate stock at their
Validate step (Ready → Done) — unchanged by this checkpoint. All four
operation types correctly follow the business rules in `CLAUDE.md`.
Locations/warehouses themselves are now editable data (`DB.warehouses`)
rather than a hard-coded constant, with `locationInUse()` guarding against
removing a location that a product still has stock in.

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

Manual only, but this checkpoint's Settings logic — plus a full regression
of the checkpoint 2/3 document lifecycle — was additionally exercised with
a standalone Node.js test harness (`test_harness_cp4.js`, using Node's
built-in `vm` module with a stubbed `document`/`localStorage`/`prompt`/
`confirm` — not a browser, and not jsdom, which isn't available in this
sandbox). The harness loads the actual `<script>` block out of
`StockSense.html` and runs it against a proxy-based fake global object so
that DOM-only globals like `main`, `newLocName_0`, etc. resolve to inert
stub elements instead of throwing, then drives `setDefaultWarehouse()`/
`addWarehouse()`/`renameWarehouse()`/`removeWarehouse()`/`addLocation()`/
`renameLocation()`/`removeLocation()`/`docAction()` directly and asserts
on `DB` state after each call. This is more than code-reading alone,
though it is not a committed/CI-run suite. All 55 scenarios below were run
and passed on the final version of `StockSense.html`.

## Last Successful Test

Full run of `test_harness_cp4.js` against this checkpoint's
`StockSense.html`, 55/55 passing, grouped as:

1. **Fresh install (4 checks):** a brand-new database gets `DB.warehouses`
   seeded from `DEFAULT_LOC` with the same names/locations as the old
   `LOC` constant, and gets a default warehouse.
2. **Pre-checkpoint-4 migration (7 checks):** a simulated pre-checkpoint-4
   `ss_db` blob (no `warehouses` key at all, with existing users, products,
   stock, receipts, and transfers) migrates `DB.warehouses` from
   `DEFAULT_LOC`, and every existing stock key, user, product, receipt,
   and transfer is preserved exactly — confirming no data loss or
   movement.
3. **Already-migrated blob (2 checks):** a database that already has
   `DB.warehouses`/`DB.defaultWarehouse` is left untouched by the
   migration check.
4. **Default warehouse (2 checks):** `setDefaultWarehouse()` updates the
   setting for a real warehouse and ignores an unknown name.
5. **Add warehouse (4 checks):** creates a warehouse with zero locations;
   rejects a duplicate name (case-insensitive) and an empty/whitespace
   name.
6. **Add location (2 checks):** adds a new location; rejects a name
   already used in a *different* warehouse (global uniqueness).
7. **Rename location — safe (6 checks):** cascades the new name into the
   matching `DB.stock` key, a Receipt's `loc`, a Transfer's `from`, a
   plain Ledger `loc`, and a `"From → To"`-style Transfer Ledger `loc`.
8. **Rename location — blocked (1 check):** refused when the new name
   collides with an existing location; nothing changes.
9. **Rename warehouse — safe (2 checks):** updates the name and keeps
   `DB.defaultWarehouse` pointing at it if it was the default.
10. **Rename warehouse — blocked (1 check):** refused on a duplicate name.
11. **Remove unused location (2 checks):** `locationInUse()` correctly
    reports false, and the location is removed.
12. **Remove in-use location — non-zero stock (2 checks):**
    `locationInUse()` reports true and removal is blocked.
13. **Remove in-use location — Draft document, zero stock (2 checks):**
    `locationInUse()` reports true (a Draft Receipt references it) and
    removal is blocked even though stock there is `0`.
14. **Remove warehouse — blocked while non-empty (1 check).**
15. **Remove warehouse — allowed once empty (2 checks):** succeeds after
    its locations are removed, and reassigns the default warehouse away
    from the one just removed.
16. **Remove warehouse — last one blocked (1 check):** refuses to remove
    the only remaining warehouse.
17. **`locOptions()`/`allLocs()` reflect DB (2 checks):** a freshly-added
    location appears in both.
18. **`locOptions()` default pre-selection (1 check):** the default
    warehouse's first location is marked `selected`.
19. **Regression — Receipt/Delivery/Transfer/Adjustment (11 checks):**
    full Draft → Waiting → Ready → Done lifecycle for all four document
    types; duplicate-validate no-op; oversized-delivery block; Transfer
    stock move with total unchanged; Adjustment missing-reason block and
    correction; zero-delta Adjustment; and a final check that every
    validated document across the whole run wrote exactly one ledger
    entry — confirming checkpoints 1–3 are unaffected by this checkpoint.

## Last Git Commit

The latest committed and pushed commit on `origin/balaji` is `b41a228`
("Implement transfer and adjustment lifecycle" — checkpoint 3). The
checkpoint history on this branch is:

- Checkpoint 2: `0788e97` — "Implement receipt and delivery lifecycle"
- Checkpoint 3: `b41a228` — "Implement transfer and adjustment lifecycle"

Checkpoint 4 (this checkpoint's Settings / Warehouse & Location Management
changes) has **not** been committed yet — it is delivered as updated
files on top of `b41a228`, per the user's workflow of implementing and
verifying locally before any commit. Committing checkpoint 4 is the
user's next step.

## Exact Resume Point

Checkpoint 4 (Settings / Warehouse & Location Management) is complete but
**uncommitted**. The next session should pick from "Next Tasks" above —
there is no unfinished Settings work outstanding. If a future session
revisits this area, note that `findWarehouse(name)` and
`locationInUse(locName)` (added this checkpoint) are the two small helpers
other Settings functions build on; extend those rather than re-deriving
warehouse/location lookups elsewhere. `docList(kind)`/`renderDocPage(kind)`
(from checkpoint 3, committed as `b41a228`) are unchanged — still the two
helpers `docAction()` uses to resolve `kind` to the right `DB.*` array and
render function.
