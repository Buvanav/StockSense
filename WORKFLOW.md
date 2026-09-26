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

## Status Model

**All four document types — Receipts, Deliveries, Internal Transfers, and
Inventory Adjustments — now follow the same lifecycle** (Checkpoint 3
extended Transfers/Adjustments to match the Receipt/Delivery lifecycle
introduced in Checkpoint 2):

```
Draft ──submit──▶ Waiting ──mark ready──▶ Ready ──validate──▶ Done
  │                   │                     │
  └──────────────────cancel─────────────────┘
                       ▼
                   Canceled
```

- **Draft:** created with the document's fields (Receipt/Delivery:
  product, location, quantity; Transfer: product, quantity, source,
  destination; Adjustment: product, location, physical quantity, reason).
  No stock effect, no ledger entry. Editable while Draft — see below for
  Adjustment's one exception.
- **Waiting:** submitted from Draft. No stock effect, no ledger entry.
  Can be marked Ready or cancelled.
- **Ready:** marked ready from Waiting. No stock effect, no ledger entry.
  Can be validated or cancelled.
- **Done:** reached only via Validate from Ready. This is the *only*
  transition that may touch stock or write a ledger entry:
  - **Receipt:** increases stock at the location; ledger `+quantity`.
  - **Delivery:** decreases stock at the location, after checking
    sufficient stock is available; if not, the document stays in Ready
    with a clear error and stock is untouched. Ledger `-quantity`.
  - **Transfer:** re-checks (at Validate time, not just at creation)
    that the product exists, quantity is positive, both locations exist,
    source ≠ destination, and source has sufficient stock; on any
    failure the document stays Ready, nothing is touched. On success,
    stock decreases at source and increases at destination by the same
    amount (total company stock unchanged) and exactly one ledger entry
    is written, `type: "Transfer"`, `loc` shown as `"Source → Destination"`.
  - **Adjustment:** compares the physical count against the current
    system quantity at the location (`delta = physical − system`); if
    `delta ≠ 0` and no reason has been recorded, the document stays
    Ready with an error and nothing is touched. On success, stock is set
    to the physical count and exactly one ledger entry is written,
    `type: "Adjustment"`, signed `qty: delta` (including a `delta = 0`
    entry — see below), with the reason.
  Done is terminal — no further actions are available.
- **Canceled:** reachable from Draft, Waiting, or Ready. Never affects
  stock or the ledger. Terminal — no further actions are available.

Every transition re-checks the document's current status before applying,
so:
- Validate is a no-op if the document isn't currently Ready (this is what
  prevents any document from ever applying its stock change twice —
  clicking Validate again on an already-Done document does nothing).
- Cancel is a no-op if the document is already Done or already Canceled.
- Edit is permitted while Draft for all four document types. **Adjustments
  are additionally editable while Ready** — this is the one deliberate
  exception, so a Validate that failed for "reason required" can be
  corrected (e.g. the reason added) without discarding the document and
  starting over. Editing never touches stock or the ledger for any
  document type, at any stage.

### Transfer-specific notes

- Source and destination must differ — checked both at creation (for
  immediate feedback) and again at Validate.
- Insufficient stock at the source location is intentionally **not**
  checked at Draft creation — only at Validate — so a Transfer can be
  drafted before its feasibility is known, matching the Delivery pattern.

### Adjustment-specific notes

- The "reason required on discrepancy" rule is enforced at Validate, not
  at Draft creation, so a discrepancy can be recorded as a Draft before
  its reason is known.
- **Zero-difference adjustments:** if the physical count equals the
  system quantity, the document still becomes Done, and stock is
  (re-)set to the same value — no reason is required. Per the existing
  project convention (unchanged from the pre-Checkpoint-3 immediate-
  validate implementation), a ledger entry is still written in this case,
  with `qty: 0`; this is not treated as inventing a new "fake stock
  movement" since no quantity actually moves.

## Settings — Warehouse & Location Management (Checkpoint 4)

Warehouses and locations moved from the hard-coded `LOC` constant into
`DB.warehouses` (a Settings page manages them), plus a `DB.defaultWarehouse`
setting. This is purely configuration data — it does not change the
Receipt/Delivery/Transfer/Adjustment lifecycle above in any way, and none
of `docList`/`renderDocPage`/`docAction`/`docTable`/`docBadge` were touched.

```
Settings
   ↓
Default Warehouse — pick which warehouse's first location is pre-selected
   when creating a new Receipt/Delivery/Transfer/Adjustment
   ↓
Add Warehouse — name required, must be unique (case-insensitive)
   ↓
Add Location (within a warehouse) — name required, must be unique across
   ALL warehouses (stock keys are "SKU@@Location", not warehouse-qualified,
   so two locations can never share a name)
   ↓
Rename Warehouse / Rename Location — allowed whenever the new name doesn't
   collide with an existing one; a location rename cascades the same
   string change into every DB.stock key and every document field
   (loc/from/to) and Stock Ledger entry that references it, so nothing is
   left pointing at a name that no longer exists
   ↓
Remove Location — blocked ("Cannot remove: this location is referenced by
   existing stock or a document.") if any product has non-zero stock there,
   or if ANY Receipt/Delivery/Transfer/Adjustment document — of any status,
   including Done/Canceled — references it. The Stock Ledger is not part of
   this check: ledger rows keep their own location text for the audit
   trail regardless of whether the location still exists in Settings.
   ↓
Remove Warehouse — blocked while it still has any locations (remove those
   first, which already enforces the check above one location at a time),
   and blocked if it is the only warehouse left. Removing the current
   default warehouse reassigns the default to another remaining warehouse.
```

Location *rename* and location *removal* deliberately use different safety
rules: renaming updates every reference in place (nothing can be
orphaned by a rename), so it is only blocked on a name collision; removal
deletes the location outright, so it is blocked whenever something still
points at it.
