# StockSense — Data Model

## Current: localStorage Structure

Everything lives in one JSON blob under the localStorage key `ss_db`:

```js
{
  users: [
    { name, email, pass, role }          // pass is plaintext — demo only
  ],
  session: "user@email.com" | null,      // currently logged-in user's email
  products: [
    { name, sku, cat, unit, reorder }
  ],
  stock: {
    "SKU@@Location": quantity            // e.g. "STR-001@@Rack A": 70
  },
  ledger: [
    { ref, date, product, sku, qty, type, loc, reason, user, status }
  ],
  receipts: [
    { id, sku, loc, qty, status }          // status: Draft|Waiting|Ready|Done|Canceled
  ],
  deliveries: [
    { id, sku, loc, qty, status }          // same shape as receipts
  ],
  transfers: [
    { id, sku, qty, from, to, status }     // new in Checkpoint 3
  ],
  adjustments: [
    { id, sku, loc, phys, reason, status } // new in Checkpoint 3
  ],
  seq: 1                                  // counter used to generate ref numbers
}
```

Warehouses and locations are **not** stored in `DB` — they are a hard-coded
JS constant (`LOC`) with two warehouses and two locations each. This is
the main current limitation versus the full spec (Section 9), which calls
for warehouses/locations to be manageable data.

## Entity Reference (current + planned)

### User
- `name`, `email` (unique), `pass`, `role`
- *Planned:* hashed password, `phone`, `created_at`

### Product
- `name`, `sku` (unique), `cat` (category), `unit`, `reorder` (reorder level)
- *Planned:* `status` (active/inactive), `warehouse`/`location` defaults,
  `created_at`/`updated_at`, foreign key to a real `Category` table

### Warehouse
- *Not yet a data entity* — currently the two keys of the `LOC` constant
  (`"Main Warehouse"`, `"Production Warehouse"`)
- *Planned:* `id`, `name`, `address`

### Location
- *Not yet a data entity* — currently the array values of `LOC`
  (e.g. `"Rack A"`, `"Rack B"`, `"Production Rack"`, `"Finished Goods"`)
- *Planned:* `id`, `warehouse_id` (FK), `name`

### Stock
- Currently a flat map keyed by `"SKU@@Location"` → quantity
- *Planned relational shape:* `Stock(product_id FK, location_id FK, quantity)`
  with a unique constraint on `(product_id, location_id)`

### Receipt / ReceiptItem
- Currently: `DB.receipts` is an array of
  `{ id, sku, loc, qty, status }`, where `id` is also used as the ledger
  `ref` once validated, and `status` is one of
  `Draft | Waiting | Ready | Done | Canceled`. Single product per
  document (no line items yet). A ledger entry is written only when
  `status` transitions to `Done`, and it is written exactly once — the
  transition guard in `docAction()` (see `StockSense.html`) refuses to
  re-run Validate on a document that isn't currently `Ready`.
- *Planned:* `Receipt(id, ref, supplier, warehouse_id, status, created_at)`
  + `ReceiptItem(receipt_id FK, product_id FK, quantity, location_id FK)`,
  so a receipt can hold multiple line items with the same status field
  moving them all through the lifecycle together.

### Delivery / DeliveryItem
- Currently: `DB.deliveries` is an array with the same shape as
  `DB.receipts` above (`{ id, sku, loc, qty, status }`), reusing the same
  lifecycle and the same `docAction()`/`docTable()` code. The
  insufficient-stock check runs at the Validate transition; on failure
  the document simply stays `Ready` and stock is untouched.
- *Planned:* mirrors Receipt/ReceiptItem, with `customer`/`destination`
  instead of `supplier`, and a Pick → Pack step inserted before Validate

### Transfer / TransferItem
- **Checkpoint 3:** `DB.transfers` is now an array of
  `{ id, sku, qty, from, to, status }`, following the same
  `Draft | Waiting | Ready | Done | Canceled` lifecycle and the same
  `docAction()`/`docTable()` code as Receipts/Deliveries. `id` is
  generated at Draft creation (via the shared `ref('TRF')` sequence) and
  reused as the ledger `ref` once validated — same convention as
  Receipt/Delivery. Stock only moves, and the one `type: "Transfer"`
  ledger entry (`loc` recorded as `"Source → Destination"`) is only
  written, at the `Ready → Done` Validate transition; every invariant
  (product exists, quantity > 0, both locations exist, source ≠
  destination, sufficient source stock) is re-checked at that point, not
  just at creation.
- *Previously (pre-Checkpoint-3):* no persisted document at all — the
  old immediate-validate `doTransfer()` wrote directly to `DB.stock` and
  `DB.ledger` with no `DB.transfers` array in between. There is therefore
  no old transfer *document* data to migrate — see Backward Compatibility
  below.
- *Planned:* `Transfer(id, ref, from_location_id FK, to_location_id FK, status)`
  + `TransferItem(transfer_id FK, product_id FK, quantity)`

### Adjustment
- **Checkpoint 3:** `DB.adjustments` is now an array of
  `{ id, sku, loc, phys, reason, status }`, following the same lifecycle.
  `id` is generated at Draft creation and reused as the ledger `ref`.
  Stock is only set to `phys`, and the one `type: "Adjustment"` ledger
  entry (signed `qty: phys − system quantity`, plus `reason`) is only
  written at Validate. The "reason required when the delta is non-zero"
  rule is (re-)checked at Validate, not at Draft creation, and an
  Adjustment is the one document type that can still be edited while
  `Ready` (not just `Draft`), specifically so a failed "reason required"
  validation can be corrected in place. A zero-delta Adjustment still
  writes one ledger entry with `qty: 0` — this matches the pre-existing
  `doAdjust()` behavior and is not a new rule introduced in Checkpoint 3.
- *Previously (pre-Checkpoint-3):* same situation as Transfer — no
  `DB.adjustments` array existed; `doAdjust()` wrote directly to
  `DB.stock`/`DB.ledger`.
- *Planned:* `Adjustment(id, ref, location_id FK, reason, created_by, created_at)`
  + `AdjustmentItem(adjustment_id FK, product_id FK, system_qty, physical_qty)`

### LedgerEntry
- Currently: `{ ref, date, product, sku, qty, type, loc, reason, user, status }`,
  append-only array, newest first
- *Planned:* immutable `LedgerEntry` table — insert-only, never updated or
  deleted, with a foreign key to whichever source document (Receipt,
  Delivery, Transfer, Adjustment) created it, so the ledger can always be
  traced back to its originating transaction

### ReorderRule
- Currently: just the `reorder` field on `Product` (a single number)
- *Planned:* its own table if per-warehouse or per-location reorder rules
  are needed later (`ReorderRule(product_id FK, location_id FK, min_qty,
  reorder_qty)`)

## Backward Compatibility (Checkpoint 3)

`DB.transfers` and `DB.adjustments` did not exist before Checkpoint 3
(Transfers/Adjustments were immediate-validate with no persisted document
array). On load, if either array is missing from a saved `ss_db` blob, it
is initialized to `[]` — the same auto-migration pattern already used for
`DB.receipts`/`DB.deliveries` since Checkpoint 2. No existing `users`,
`products`, `stock`, `ledger`, or `seq` data is read, rewritten, or reset
by this migration; old Transfer/Adjustment *ledger entries* from before
this checkpoint (which already used the `{ ref, product, sku, qty, type,
loc, reason, user, status }` shape) are untouched and continue to display
correctly in the Stock Ledger, since the ledger schema itself did not
change.

## Notes on Migrating to a Real Database

- Replace the `"SKU@@Location"` string key with a proper `Stock` table
  keyed by foreign keys, once products/locations have real IDs.
- Add `created_at`/`updated_at` timestamps to every table for auditability
  beyond just the ledger.
- Keep the ledger table insert-only at the database level (no UPDATE/DELETE
  grants on it) to guarantee the audit trail can't be silently altered.
