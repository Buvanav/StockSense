# StockSense — Architecture

## Current Architecture (client-side, single file)

```
StockSense.html
├── <style>   — dark-themed CSS, no framework
├── <body>    — login/signup/forgot-password screens + app shell
│              (sidebar nav + main content area)
└── <script>  — all application logic:
    ├── State: single DB object { users, session, products, stock, ledger, seq }
    │          persisted to localStorage under key "ss_db"
    ├── Auth functions: doSignup, doLogin, sendOtp, verifyOtp, resetPass, logout
    ├── Stock helpers: getStock/setStock (keyed by "SKU@@Location"),
    │                  totalStock (sums a SKU across all locations),
    │                  addLedger (appends one audit entry)
    ├── Business-rule functions: doReceipt, doDelivery, doTransfer, doAdjust
    │                            (each validates, mutates stock, writes ledger)
    └── Render functions: renderDashboard, renderProducts, renderReceipts,
                          renderDeliveries, renderTransfers, renderAdjustments,
                          renderLedger, renderProfile
```

Everything runs in the browser. There is no server, no build step, and no
network call anywhere in the app. Opening the HTML file is the entire
deployment process.

This was chosen deliberately: the assistant's development environment has
no network access, so it cannot `npm install` a framework, run a dev
server, or push to a real backend/database. A dependency-free single file
was the only architecture guaranteed to actually run.

## Why State Is Modeled the Way It Is

- **Per-location stock**, not a single global number per product
  (`DB.stock["SKU@@Location"] = quantity`), so the multi-warehouse
  requirement holds even in this simple version.
- **One ledger array**, append-only, newest-first, so every operation
  type writes to the same audit trail with a consistent shape.
- **Atomic validate actions** (no separate "apply" step after the button
  click) is what currently prevents a transaction from being applied
  twice — there is no draft state yet that could be re-opened and
  re-validated.

## Planned Migration Path to a Real Backend

The client-side version is intentionally structured so each render
function's helper calls (`getStock`, `setStock`, `addLedger`,
`totalStock`) can be swapped for calls to a service layer without
changing the UI logic much:

```
Frontend (HTML/CSS/JS, or later a framework)
   ↓
Service Layer (thin functions: getProducts(), createReceipt(), etc.
                — currently these ARE the direct localStorage helpers)
   ↓
REST API (see docs/API.md for the target endpoint shapes)
   ↓
Node/Express (or similar) — validates requests, enforces business rules
   server-side (never trust client-side validation alone once there is
   a real backend)
   ↓
Database (see docs/DATABASE.md for the target relational schema)
```

### Migration steps when the user is ready for a backend

1. Stand up the backend (Node/Express or similar) with the endpoints in
   `docs/API.md`, backed by the schema in `docs/DATABASE.md`.
2. Move password storage from plaintext (current demo-only approach) to
   hashed (e.g. bcrypt) on the server.
3. Replace the direct `localStorage` reads in the render functions with
   `fetch()` calls to the new API, keeping the same function names/shapes
   so the UI code changes minimally.
4. Re-implement the "duplicate transaction" protection server-side (e.g.
   idempotency keys, or a real Draft → Done status transition guarded by
   a database check) rather than relying on the client only clicking
   once.
5. Keep the ledger as an append-only, immutable table server-side —
   never update or delete ledger rows, only insert.
