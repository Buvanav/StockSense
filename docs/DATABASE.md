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
- Currently: one ledger entry of `type: "Transfer"` with `loc` recorded as
  `"Source → Destination"`
- *Planned:* `Transfer(id, ref, from_location_id FK, to_location_id FK, status)`
  + `TransferItem(transfer_id FK, product_id FK, quantity)`

### Adjustment
- Currently: one ledger entry of `type: "Adjustment"` with signed `qty`
  (physical count − system count) and a `reason` string
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

## Notes on Migrating to a Real Database

- Replace the `"SKU@@Location"` string key with a proper `Stock` table
  keyed by foreign keys, once products/locations have real IDs.
- Add `created_at`/`updated_at` timestamps to every table for auditability
  beyond just the ledger.
- Keep the ledger table insert-only at the database level (no UPDATE/DELETE
  grants on it) to guarantee the audit trail can't be silently altered.
