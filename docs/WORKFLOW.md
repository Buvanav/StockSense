# StockSense — Business Workflow

## Core Rule

Every stock-changing operation must (a) apply exactly once, and (b) write
exactly one Stock Ledger entry. Nothing changes stock silently.

```
Receipt
   ↓
Stock increases at the chosen location
   ↓
Ledger entry: +quantity, type "Receipt"

Internal Transfer
   ↓
Stock decreases at source location, increases at destination location
   ↓
Total company stock unchanged
   ↓
Ledger entry: quantity moved, type "Transfer", location shown as "From → To"

Delivery
   ↓
Stock decreases at the chosen location
   ↓
Blocked if requested quantity > available quantity at that location
   ↓
Ledger entry: -quantity, type "Delivery"

Adjustment
   ↓
Physical count compared against system quantity at a location
   ↓
Stock is set to the physical count
   ↓
Reason required whenever there is a discrepancy
   ↓
Ledger entry: signed delta (physical − system), type "Adjustment", with reason

All four operations
   ↓
Stock Ledger (append-only, newest first)
   ↓
Dashboard KPIs recomputed live from current state
```

## End-to-End Demo Flow (Section 23 / 51 of the original spec)

1. **Receive** 100 KG of Steel Rod into Main Warehouse.
   → Steel Rod total stock: 100 KG. Ledger: `REC-00x +100`.
2. **Transfer** 30 KG from Main Warehouse (Rack A) to Production Warehouse
   (Production Rack).
   → Main Warehouse: 70 KG, Production Rack: 30 KG. Total: still 100 KG.
   Ledger: `TRF-00x 30, Rack A → Production Rack`.
3. **Deliver** 20 KG from Production Rack to a customer.
   → Production Rack: 10 KG. Total: 80 KG. Ledger: `DEL-00x -20`.
4. **Adjust** for 3 KG damaged material found during a physical count.
   → Total: 77 KG. Ledger: `ADJ-00x -3, reason: Damaged material`.
5. Open the **Stock Ledger** — all four entries are visible, newest first,
   each traceable to its reference number, location, and user.
6. The **Dashboard** reflects the final 77 KG total and any resulting
   low-stock/out-of-stock status without any manual refresh logic — it is
   always computed from current state on render.

## Validation Rules Enforced at Each Step

- **Receipt:** product required, quantity > 0.
- **Delivery:** product required, quantity > 0, quantity ≤ available stock
  at the chosen location (else: `"Insufficient stock. Available: X,
  Requested: Y"`).
- **Transfer:** product required, quantity > 0, source ≠ destination (else:
  `"Source and destination locations must be different."`), quantity ≤
  available stock at source.
- **Adjustment:** physical quantity required; reason required whenever the
  physical count differs from the system count.

## Status Model (current vs. planned)

**Current:** every operation validates immediately — there is no Draft
stage yet. This is what currently prevents double-application (there is
no "already validated" document sitting around to re-click).

**Planned** (see `docs/API.md` / Next Tasks in `DEVELOPMENT_STATUS.md`):
Receipts and Deliveries should gain a Draft → Waiting → Ready → Done →
Canceled lifecycle, with only the transition into "Done" affecting stock,
guarded so it can only happen once per document.
