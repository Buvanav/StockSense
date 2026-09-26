# StockSense — Enterprise Inventory Management System (IMS)

[![Hackathon Ready](https://img.shields.io/badge/Hackathon-Production--Ready-indigo.svg)](https://github.com/Buvanav/StockSense)
[![Stack](https://img.shields.io/badge/Stack-React_|_Node.js_|_Express_|_SQLite-blue.svg)](https://github.com/Buvanav/StockSense)

StockSense is a modular, full-stack Inventory Management System designed to digitize and streamline stock operations. Built to replace manual ledgers and static Excel sheets with an automated, real-time database system and interactive visual dashboard.

---

## 🚀 Key Features

1. **Real-time Operations Dashboard (Excalidraw / Odoo Style)**
   - **Receipts Card (Goods In)**: Direct vendor receiving counter and one-click validation.
   - **Delivery Orders Card (Goods Out)**: Pick, pack & dispatch tracking with instant stock deduction.
   - **Internal Transfers Card**: Inter-warehouse & shelf-to-shelf movements logged in an append-only ledger.
   - **Stock Adjustments Card**: Physical audit count reconciliation.
   - **Warehouse Selector**: Switch active view between All Warehouses, Main Store, Production Floor, Rack A/B.
   - **Workflow Status Pipeline**: Stepper indicator tracking `Draft` $\rightarrow$ `Waiting` $\rightarrow$ `Ready` $\rightarrow$ `Done`.

2. **Full-Stack REST Backend & SQLite Relational Database**
   - **Separate Backend Folder**: `stocksense-backend/` powered by Express.js & `better-sqlite3`.
   - **Atomic Stock Engine**: `POST /api/documents/:id/validate` updates warehouse inventory levels inside database transactions and generates immutable ledger audit rows.
   - **Email OTP Authentication**: JWT auth with 6-digit verification codes.

3. **Core Modules**
   - **Product Catalog**: SKU generator, category tagging, unit of measure (UoM), and reorder threshold alerts.
   - **Stock Ledger (Move History)**: Full historical audit trail with CSV export support.

---

## 🛠 Project Structure

```text
stocksense/
├── stocksense-backend/           # Node.js + Express REST API Server
│   ├── db/
│   │   └── database.js           # SQLite Schema setup & auto-seeding
│   ├── middleware/
│   │   └── auth.js               # JWT verification middleware
│   ├── routes/
│   │   ├── auth.js               # Signup, Login, OTP request & verify
│   │   ├── products.js           # Product catalog CRUD
│   │   ├── warehouses.js         # Multi-warehouse location CRUD
│   │   ├── documents.js          # Receipts, Deliveries, Transfers, Adjustments & Validation
│   │   ├── ledger.js             # Stock move history audit log
│   │   └── dashboard.js          # Dynamic KPI aggregation
│   ├── .env.example
│   └── server.js                 # Express entry point (Port 3001)
│
└── stocksense-frontend/          # Vite + React Frontend UI
    ├── src/
    │   ├── components/           # Topbar, Sidebar, KpiCard, StatusBadge, EmailDrawer
    │   ├── context/              # AuthContext & InventoryContext (wired to API)
    │   ├── layouts/              # MainLayout shell
    │   └── pages/                # Dashboard, Products, Receipts, Delivery, Transfers, Adjustments, History
    └── package.json
```

---

## ⚡ How to Run Locally

### 1. Start the Backend API Server
```bash
cd stocksense-backend
npm install
npm run dev
# Server starts on http://localhost:3001
```

### 2. Start the Frontend React App
```bash
cd stocksense-frontend
npm install
npm run dev
# App opens on http://localhost:5173
```

---

## 🔑 Demo Credentials

- **Admin User**: `admin@stocksense.com` / `admin123`
- **OTP Verification**: Any request auto-generates a 6-digit code displayed directly in the topbar notification drawer for instant demo testing!
