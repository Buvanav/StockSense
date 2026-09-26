# StockSense — Inventory Management System (IMS)

A modular Inventory Management System that replaces manual registers,
Excel sheets, and scattered tracking with a centralized, real-time
web app for managing stock across warehouses and locations.

---

## Table of Contents

- [Overview](#overview)
- [Target Users](#target-users)
- [Core Features](#core-features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Team & Work Split](#team--work-split)
- [Roadmap](#roadmap)

---

## Overview

StockSense digitizes end-to-end stock operations:

- Receiving goods from vendors (**Receipts**)
- Shipping goods to customers (**Delivery Orders**)
- Moving stock between warehouses/locations (**Internal Transfers**)
- Reconciling physical counts vs. system records (**Stock Adjustments**)

Every stock-changing action is written to a single, append-only
**Stock Ledger**, so the dashboard, product stock levels, and move
history are always derived from one consistent source of truth.

## Target Users

| Role | What they do |
|---|---|
| **Inventory Managers** | Manage incoming & outgoing stock, review dashboards, set reorder rules |
| **Warehouse Staff** | Perform transfers, picking, shelving, and physical stock counts |

## Core Features

**Authentication**
- Sign up / log in
- OTP-based password reset
- Redirect to Inventory Dashboard on login

**Dashboard**
- KPIs: Total Products in Stock, Low/Out of Stock Items, Pending Receipts,
  Pending Deliveries, Internal Transfers Scheduled
- Dynamic filters: document type, status (Draft/Waiting/Ready/Done/Canceled),
  warehouse or location, product category

**Products**
- Create/update products (name, SKU/code, category, unit of measure,
  optional initial stock)
- Stock availability per location
- Product categories & reordering rules

**Operations**
- **Receipts** — add supplier & products, input quantities, validate → stock increases
- **Delivery Orders** — pick → pack → validate → stock decreases
- **Internal Transfers** — move stock between warehouses/racks; net stock
  unchanged, location updated
- **Stock Adjustments** — enter counted quantity, system computes and
  logs the delta against recorded stock
- **Move History** — full stock ledger, filterable

**Settings**
- Warehouse & location management

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React (Vite) + React Router + Context API + Recharts |
| Backend | Node.js + Express |
| Database | PostgreSQL + Prisma ORM |
| Auth | JWT + bcrypt, email OTP via Nodemailer |
| Realtime (optional) | Socket.io or polling for live dashboard updates |
| Hosting | Frontend → Vercel · Backend → Render/Railway · DB → Supabase or Neon |

## Architecture

```
Client (React SPA)
        │
        ▼
API Gateway (Express)
   ├── Auth Service          (signup, login, OTP reset)
   ├── Product Service       (CRUD, categories, reorder rules)
   ├── Operations Service    (Receipts, Delivery, Transfers, Adjustments)
   ├── Ledger Service        (single source of truth — applyStockChange)
   ├── Dashboard Service     (aggregates KPIs from Ledger + Documents)
   └── Warehouse/Settings    (warehouses, locations, racks)
        │
        ▼
PostgreSQL
   ├── Users
   ├── Products
   ├── Warehouses / Locations
   ├── Documents        (receipts, deliveries, transfers, adjustments)
   └── StockLedger      (append-only: product, location, qty delta, doc ref, timestamp)
```

**Rule:** stock is only ever changed through the Ledger Service's
`applyStockChange(productId, locationId, qtyDelta, documentRef)`. No
other module writes to stock quantities directly — this is what keeps
the Dashboard, Products, and Move History views consistent.

## Project Structure

```
stocksense/
├── frontend/                # React + Vite app
│   ├── src/
│   │   ├── context/          # AuthContext, InventoryContext
│   │   ├── layouts/          # MainLayout (sidebar + topbar)
│   │   ├── components/       # Sidebar, Topbar, KpiCard, StatusBadge
│   │   └── pages/             # Login, Dashboard, Products, Receipts,
│   │                           Delivery, Transfers, Adjustments,
│   │                           MoveHistory, Settings, Profile
│   └── package.json
├── backend/                 # Node/Express API (Auth, Product, Ledger,
│                              Operations, Dashboard, Warehouse services)
└── README.md
```

## Getting Started

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Runs at `http://localhost:5173`.

### Backend
```bash
cd backend
npm install
npx prisma migrate dev
npm run dev
```
Runs at `http://localhost:5000` (adjust to your setup).

## Environment Variables

Create a `.env` in `backend/`:

```
DATABASE_URL=postgresql://user:password@localhost:5432/stocksense
JWT_SECRET=your_jwt_secret
SMTP_HOST=smtp.example.com
SMTP_USER=your_email@example.com
SMTP_PASS=your_email_password
```

## Team & Work Split

Two-person split along the Ledger boundary, so each person owns
separate folders/collections and merge conflicts stay minimal:

| | **Member A — Core & Catalog** | **Member B — Operations** |
|---|---|---|
| Owns | Auth, Dashboard, Products, Warehouse Settings, **Ledger Service** | Receipts, Delivery, Transfers, Adjustments, Move History |
| Rule | Exposes `applyStockChange()` — the only way stock changes | Only ever *calls* `applyStockChange()`, never edits Ledger internals |

## Roadmap

- [ ] Real backend wired to the frontend scaffold
- [ ] Role-based access (Inventory Manager vs Warehouse Staff)
- [ ] Barcode/SKU scanning for picking & counting
- [ ] Low-stock email/push alerts
- [ ] Multi-warehouse reporting & export (CSV/PDF)
