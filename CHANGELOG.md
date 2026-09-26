# Changelog

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

- Not yet committed — delivered as updated files for the user to apply on
  top of the existing `balaji` branch state, per the continuation prompt.

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

- Not yet committed — delivered as updated files for the user to apply on
  top of `bb3bda3` on branch `balaji`.

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
