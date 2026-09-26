# StockSense — Target API (future backend)

No backend exists yet — everything today runs against `localStorage`
directly from the render/action functions in `StockSense.html`. This
document specifies the REST interface a future Node/Express (or similar)
backend should expose, matching the operations already implemented
client-side so the migration is a like-for-like swap.

All endpoints (except auth) require an authenticated session
(e.g. a bearer token issued at login).

## Auth

```
POST /auth/signup
  body: { name, email, password, confirmPassword }
  → 201 { user: { id, name, email, role } }
  errors: 400 validation, 409 email already registered

POST /auth/login
  body: { email, password }
  → 200 { token, user: { id, name, email, role } }
  errors: 401 invalid credentials

POST /auth/forgot-password
  body: { email }
  → 200 { message: "OTP sent" }   // sends OTP via real email/SMS in production
  errors: 404 no account with that email

POST /auth/verify-otp
  body: { email, otp }
  → 200 { resetToken }
  errors: 400 incorrect or expired OTP

POST /auth/reset-password
  body: { resetToken, newPassword }
  → 200 { message: "Password reset" }
  errors: 400 invalid/expired token, weak password
```

## Products

```
GET    /products                     → list, supports ?search=&category=&warehouse=&status=
POST   /products                     body: { name, sku, category, unit, reorderLevel }
                                      errors: 409 SKU already exists
PUT    /products/:id                 body: partial product fields
DELETE /products/:id                 (soft delete — see Business Rule 9 in CLAUDE.md)
```

## Warehouses & Locations

```
GET    /warehouses
POST   /warehouses                   body: { name }
GET    /warehouses/:id/locations
POST   /warehouses/:id/locations     body: { name }
```

## Inventory

```
GET /inventory                       → per-product, per-location stock levels
                                      supports ?product=&warehouse=&location=&status=
GET /inventory/:productId            → stock breakdown by location for one product
```

## Receipts

```
GET  /receipts                       supports ?status=&warehouse=
POST /receipts                       body: { supplier, warehouseId, items: [{productId, quantity, locationId}] }
                                      → creates in status "Draft"
PUT  /receipts/:id                   update draft (supplier/items) — only while status = Draft
POST /receipts/:id/validate          → transitions to "Done", increases stock,
                                        writes one LedgerEntry per item
                                      errors: 409 already validated (idempotent — no double-apply)
POST /receipts/:id/cancel            → transitions to "Canceled", no stock effect
```

## Deliveries

```
GET  /deliveries                     supports ?status=&warehouse=
POST /deliveries                     body: { customer, warehouseId, items: [{productId, quantity, locationId}] }
POST /deliveries/:id/pick            → status "Waiting" → picking in progress
POST /deliveries/:id/pack            → status → "Ready"
POST /deliveries/:id/validate        → status → "Done", decreases stock, writes ledger entries
                                      errors: 400 insufficient stock (per item),
                                              409 already validated
POST /deliveries/:id/cancel
```

## Transfers

```
GET  /transfers
POST /transfers                      body: { fromLocationId, toLocationId, items: [{productId, quantity}] }
                                      errors: 400 source and destination must differ
POST /transfers/:id/validate         → moves stock, writes one ledger entry per item,
                                        total company stock unchanged
                                      errors: 400 insufficient stock at source,
                                              409 already validated
```

## Adjustments

```
GET  /adjustments
POST /adjustments                    body: { locationId, reason, items: [{productId, physicalQuantity}] }
POST /adjustments/:id/validate       → sets stock to physical count, writes ledger
                                        entry with signed delta
                                      errors: 400 reason required when delta != 0
```

## Ledger

```
GET /ledger                          supports ?product=&type=&warehouse=&location=&from=&to=
                                      → immutable, insert-only audit trail;
                                        no PUT/DELETE endpoint exists or should exist
```

## Dashboard

```
GET /dashboard/kpis                  → { totalUnitsInStock, productCount, lowStockCount,
                                          outOfStockCount, pendingReceipts, pendingDeliveries,
                                          scheduledTransfers }
GET /dashboard/recent-activity       → most recent ledger entries (same shape as GET /ledger)
```

## Consistent Response Shape

All endpoints should return errors as:

```json
{ "error": { "message": "Insufficient stock. Available: 10, Requested: 20" } }
```

so the frontend's existing error-display pattern (a single `.err` message
per form) continues to work unchanged when swapped onto real HTTP calls.
