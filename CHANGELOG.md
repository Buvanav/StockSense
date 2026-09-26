# Changelog

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
