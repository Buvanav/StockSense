# StockSense — Inventory Management System (IMS)

A modular, real-time Inventory Management System designed to replace manual registers and scattered spreadsheets with a centralized, role-based platform for tracking stock across warehouses and locations.

---

## Table of Contents

- [Overview](#overview)
- [Target Users & Role Access](#target-users--role-access)
- [Core Features & Recent Updates](#core-features--recent-updates)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Team & Work Split](#team--work-split)
- [Future Roadmap](#future-roadmap)

---

## Overview

StockSense digitizes end-to-end inventory operations:

- Receiving goods from vendors (**Receipts**)
- Shipping goods to customers (**Delivery Orders**)
- Moving stock between warehouses and racks (**Internal Transfers**)
- Reconciling physical counts vs. system records (**Stock Adjustments**)

Every stock-changing action is written to a single, append-only **Stock Ledger**, keeping dashboard KPIs, product counts, and move histories synchronized from a single source of truth.

---

## Target Users & Role Access

| Role | Access Level | Permissions |
|---|---|---|
| **Inventory Managers** | Admin / Manager | Complete operational access, catalog management, reorder rules, and manager passcode signup verification (`MGR-2026-KEY`). |
| **Warehouse Staff** | Operational Staff | Perform transfers, stock picking, shelving, and physical stock count adjustments. |

---

## Core Features & Recent Updates

### 🔐 Authentication & Security (Completed)
- **Role-Based Auth:** Distinct sign-up flows for **Inventory Manager** & **Warehouse Staff**.
- **Manager Security:** Signup as Manager requires a secret passcode verification.
- **Real Backend Authentication:** JWT token auth, bcrypt password hashing, and SQLite user repository.
- **OTP Password Reset:** Email OTP validation flow for forgotten passwords.
- **Quick Demo Sign-In:** One-click pre-fills for quick role testing (`admin@stocksense.com` & `staff@stocksense.com`).

### 📊 Inventory Dashboard (Completed)
- **Real-Time KPIs:** Total products in stock, low/out-of-stock count, pending receipts, pending deliveries, scheduled transfers.
- **Filtering & Analytics:** Dynamic charts with Recharts, category breakdown, document status filters.

### 📦 Product & Operations Management (Completed)
- **Products:** Stock availability per location, SKU management, category tags, unit of measure.
- **Operations:** Receipts (stock increases), Delivery Orders (stock decreases), Internal Transfers (location updates), Stock Adjustments (reconciliation).
- **Move History:** Centralized stock ledger with filterable log entries.

### 🎨 UI/UX & SEO Polish (Completed)
- Clean dark/light theme, modern card designs, responsive topbar & sidebar navigation, animated micro-interactions.
- Verified SEO meta tags, OpenGraph attributes, and custom favicon.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React (Vite) · React Router DOM · Context API · Recharts · Lucide Icons |
| **Backend** | Node.js · Express |
| **Database** | SQLite (Dev) / PostgreSQL (Production) |
| **Auth** | JWT · bcrypt · OTP validation |
| **Dev Tools** | Vite · Nodemailer |

---

## Architecture

```
Client (React SPA - Port 5173)
        │
        ▼
API Backend (Express - Port 3001)
   ├── Auth Controller       (Login, Signup, Passcode, OTP Reset)
   ├── Product Controller    (Catalog CRUD, Categories)
   ├── Operations Controller (Receipts, Deliveries, Transfers, Adjustments)
   └── Ledger Service        (Single source of truth — applyStockChange)
        │
        ▼
SQLite Database / PostgreSQL
   ├── Users                 (role, passcode_verified, password_hash)
   ├── Products              (sku, name, category, stock_qty)
   ├── Locations             (warehouse, rack)
   └── StockLedger           (append-only move log)
```

---

## Project Structure

```
stocksense-frontend/
├── stocksense-frontend/        # React + Vite Client
│   ├── src/
│   │   ├── context/            # AuthContext, InventoryContext
│   │   ├── components/         # Sidebar, Topbar, KpiCard, StatusBadge
│   │   └── pages/               # Login, Dashboard, Products, Receipts,
│   │                             Delivery, Transfers, Adjustments, Profile
│   ├── index.html              # SEO Meta tags & Favicon
│   └── package.json
├── stocksense-backend/         # Express API
│   ├── server.js               # Auth, Products & Ledger Endpoints
│   ├── database.sqlite         # SQLite database file
│   └── package.json
└── README.md
```

---

## Getting Started

### 1. Start the Backend Server
```bash
cd stocksense-backend
npm install
node server.js
```
Runs at `http://localhost:3001`.

### 2. Start the Frontend Client
```bash
cd stocksense-frontend
npm install
npm run dev
```
Runs at `http://localhost:5173`.

---

## Environment Variables

Create a `.env` file in `stocksense-backend/`:

```env
PORT=3001
JWT_SECRET=your_jwt_secret_key
MANAGER_PASSCODE=MGR-2026-KEY
```

---

## Future Roadmap

- [ ] **PostgreSQL & Prisma Migration:** Production database deployment (Supabase/Neon).
- [ ] **Barcode / QR Code Scanning:** Mobile barcode scanner integration for quick warehouse stock taking.
- [ ] **Automated Low-Stock Email Alerts:** Automatic notification triggers when inventory falls below thresholds.
- [ ] **Multi-Warehouse Export:** PDF & CSV export capabilities for inventory audits and movement history.
- [ ] **Real-Time WebSockets:** Socket.io synchronization for multi-user inventory updates.

