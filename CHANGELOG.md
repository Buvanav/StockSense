# Changelog

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
