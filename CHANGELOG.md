# Changelog

## [2026-09-26] — checkpoint 4

### Added

- Settings page and sidebar nav item, listing every warehouse and its
  locations.
- `DB.warehouses` array: `{ name, locations: [name, ...] }`, replacing the
  hard-coded `LOC` constant (now `DEFAULT_LOC`, used only as a one-time
  migration seed — see Changed/Fixed below).
- `DB.defaultWarehouse`: a warehouse name, editable from Settings; its
  first location is pre-selected in the Receipt/Delivery/Transfer/
  Adjustment "New" forms.
- Add Warehouse, Add Location, Rename Warehouse, Rename Location, Remove
  Warehouse, Remove Location actions, all on the Settings page.
- `findWarehouse(name)` and `locationInUse(locName)` helpers.

### Changed

- `allLocs()` now reads `DB.warehouses` instead of the old `LOC` constant.
- `locOptions()` now marks the default warehouse's first location as
  `selected`; the option list's order is unchanged.
- Renaming a location cascades the new name into every `DB.stock` key,
  every document's `loc`/`from`/`to` field, and every Stock Ledger row
  that references it (including `"From → To"`-style Transfer ledger
  rows), so nothing is left pointing at a name that no longer exists.

### Safety rules added

- A warehouse name must be unique (case-insensitive); a location name
  must be unique across **all** warehouses, not just within one.
- Renaming a warehouse or location is blocked only on a name collision.
- Removing a location is blocked if any product has non-zero stock there,
  or if any Receipt/Delivery/Transfer/Adjustment document — any status,
  including Done/Canceled — references it. The Stock Ledger is
  intentionally not part of this check.
- Removing a warehouse is blocked while it still has any locations, and
  while it is the only warehouse remaining. Removing the current default
  warehouse reassigns the default to another remaining warehouse.

### Fixed

- N/A — no bugs found in Checkpoints 1–3 during this checkpoint's
  inspection.

### Tested

- 55/55 scenarios passed in a standalone Node `vm`-based harness
  (`test_harness_cp4.js`), covering: fresh-install warehouse seeding;
  backward-compatible migration of a pre-checkpoint-4 `ss_db` blob
  (existing stock keys, users, products, receipts, transfers all
  preserved); an already-migrated blob being left untouched; default
  warehouse get/set; add/rename/remove for both warehouses and locations,
  including every safety rule above; `allLocs()`/`locOptions()` reading
  live `DB.warehouses`; and a full Receipt/Delivery/Transfer/Adjustment
  regression pass (including duplicate-validate no-ops, insufficient
  stock, missing adjustment reason, and zero-delta adjustment) confirming
  Checkpoints 1–3 are unaffected.
  (see `DEVELOPMENT_STATUS.md` → Testing Status for the full run).

### Git Commit

- Not yet committed — delivered as updated files for the user to apply on
  top of `b41a228` (checkpoint 3) on branch `balaji`, per the user's
  workflow (commit only when explicitly requested).

## [2026-09-26] — checkpoint 3

### Added

- Draft → Waiting → Ready → Done → Canceled status lifecycle extended to
  Internal Transfers and Inventory Adjustments, replacing their previous
  immediate-validate behavior — matching the lifecycle Receipts/Deliveries
  already had since checkpoint 2.
- `DB.transfers` array: `{ id, sku, qty, from, to, status }`.
- `DB.adjustments` array: `{ id, sku, loc, phys, reason, status }`.
- Shared `docAction()`/`docTable()`/`docBadge()` dispatcher extended to
  also handle `kind: 'transfer'` and `kind: 'adjustment'`, instead of
  introducing separate `transferAction()`/`adjustmentAction()` functions.
- `docTable()` now renders kind-specific columns: Transfers show
  Source/Destination instead of a single Location; Adjustments show
  Physical Qty/Location/Reason instead of a single Qty.
- Edit action for Draft-stage Transfers (product, quantity, source,
  destination) and Draft-stage Adjustments (product, location, physical
  quantity, reason).
- Adjustments can also be edited while `Ready` (the one exception to
  "edit only in Draft"), so a Validate that failed for "reason required"
  can be corrected without discarding the document.
- Cancel action for Transfers/Adjustments, available from Draft/Waiting/
  Ready, with no stock or ledger effect — same as Receipts/Deliveries.

### Changed

- Transfers/Adjustments no longer write stock or a ledger entry at
  creation — only at the Validate transition (Ready → Done).
- Transfer validation (product exists, quantity > 0, both locations
  exist, source ≠ destination, sufficient source stock) now happens at
  Validate, not just at creation; a failed validation leaves the document
  in Ready with a toast error and stock/ledger untouched.
- Adjustment's "reason required on discrepancy" check now happens at
  Validate, not at Draft creation.

### Fixed

- N/A this checkpoint.

### Backward compatibility

- `DB.transfers`/`DB.adjustments` did not exist before this checkpoint
  (the old immediate-validate implementation had no persisted document
  array for either). Both are now initialized to `[]` on load if missing,
  the same non-destructive pattern already used for `DB.receipts`/
  `DB.deliveries`. No existing `users`, `products`, `stock`, `ledger`, or
  `seq` data was touched, reset, or restructured.

### Tested

- Standalone Node.js simulation (`vm`-based, DOM stubbed) of the full
  Transfer and Adjustment lifecycles: draft→waiting→ready→done, duplicate
  validation, insufficient-stock transfer, cancel-from-draft, positive/
  negative/zero-delta adjustments, missing-reason-then-corrected, and a
  regression pass confirming Receipt/Delivery lifecycles, dashboard,
  ledger, and old-localStorage migration are unaffected. See
  `DEVELOPMENT_STATUS.md` → Testing Status for the full scenario list and
  results.

### Git Commit

- Committed and pushed to `origin/balaji` as `b41a228` — "Implement
  transfer and adjustment lifecycle".

## [2026-09-26] — checkpoint 2

### Added

- Draft → Waiting → Ready → Done → Canceled status lifecycle for
  Receipts and Deliveries, replacing the previous immediate-validate
  behavior.
- Shared `docAction(kind, action, id)` dispatcher and `docTable()`/
  `docBadge()` renderers used by both Receipts and Deliveries.
- `DB.receipts` and `DB.deliveries` arrays in the persisted state
  (auto-migrated to `[]` for any existing saved data that predates them).
- Edit action for Draft-stage receipts/deliveries (quantity only).
- Cancel action, available from Draft/Waiting/Ready, with no stock effect.

### Changed

- Receipts/Deliveries no longer write stock or a ledger entry at
  creation — only at the Validate transition (Ready → Done).
- Insufficient-stock check on deliveries now happens at Validate; a
  failed validation leaves the document in Ready and shows a toast error
  instead of blocking creation entirely.

### Fixed

- N/A this checkpoint.

### Tested

- Standalone Node.js simulation of the full Receipt and Delivery
  lifecycles, including double-validation and insufficient-stock cases
  (see `DEVELOPMENT_STATUS.md` → Testing Status for the full run).

### Git Commit

- Committed and pushed to `origin/balaji` as `0788e97` — "Implement
  receipt and delivery lifecycle".

## [2026-09-26]

### Added

- Initial working StockSense client-side application (`StockSense.html`):
  sign up, login, demo OTP forgot-password flow, dashboard with dynamic
  KPIs, product management, per-location stock model across two
  warehouses / four locations, receipts, deliveries, internal transfers,
  inventory adjustments, stock ledger, profile, logout.
- Insufficient-stock validation on deliveries and transfers.
- Duplicate-transaction protection (atomic validate actions).
- Project documentation: `CLAUDE.md`, `DEVELOPMENT_STATUS.md`, this
  `CHANGELOG.md`, and `docs/ARCHITECTURE.md`, `docs/DATABASE.md`,
  `docs/API.md`, `docs/WORKFLOW.md`.

### Changed

- N/A (first recorded checkpoint).

### Fixed

- N/A (first recorded checkpoint).

### Tested

- Manual walkthrough of the full receive → transfer → deliver → adjust
  demo flow; dashboard KPIs and Stock Ledger confirmed to update
  correctly at each step.

### Git Commit

- Not yet committed — files delivered for the user to add to their local
  `StockSense` repository.
