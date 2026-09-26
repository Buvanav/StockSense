const express = require('express');
const db = require('../db/database');

const router = express.Router();

// GET Live Dashboard KPIs computed dynamically from Database
router.get('/kpis', (req, res) => {
  // 1. Total Products count & total items in stock
  const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get().count;

  // Sum total stock across all warehouses
  const stockSumRow = db.prepare('SELECT SUM(quantity) as total_units FROM stock').get();
  const totalStockUnits = stockSumRow.total_units || 0;

  // 2. Low Stock / Out of stock items (where sum of stock across warehouses <= reorder_level)
  const products = db.prepare('SELECT id, reorder_level FROM products').all();
  let lowStockCount = 0;
  let outOfStockCount = 0;

  for (const p of products) {
    const sumRow = db.prepare('SELECT SUM(quantity) as sum_qty FROM stock WHERE product_id = ?').get(p.id);
    const qty = sumRow.sum_qty || 0;
    if (qty === 0) {
      outOfStockCount++;
    } else if (qty <= p.reorder_level) {
      lowStockCount++;
    }
  }

  // 3. Pending Receipts (type = receipt AND status IN ('Draft', 'Waiting', 'Ready'))
  const pendingReceipts = db.prepare(`
    SELECT COUNT(*) as count FROM documents 
    WHERE type = 'receipt' AND status IN ('Draft', 'Waiting', 'Ready')
  `).get().count;

  // 4. Pending Deliveries (type = delivery AND status IN ('Draft', 'Waiting', 'Ready'))
  const pendingDeliveries = db.prepare(`
    SELECT COUNT(*) as count FROM documents 
    WHERE type = 'delivery' AND status IN ('Draft', 'Waiting', 'Ready')
  `).get().count;

  // 5. Internal Transfers Scheduled (type = transfer AND status IN ('Draft', 'Waiting', 'Ready'))
  const pendingTransfers = db.prepare(`
    SELECT COUNT(*) as count FROM documents 
    WHERE type = 'transfer' AND status IN ('Draft', 'Waiting', 'Ready')
  `).get().count;

  res.json({
    totalProducts,
    totalStockUnits,
    lowStockItems: lowStockCount,
    outOfStockItems: outOfStockCount,
    lowOrOutOfStockTotal: lowStockCount + outOfStockCount,
    pendingReceipts,
    pendingDeliveries,
    pendingTransfers
  });
});

// GET Dashboard Chart analytics (Warehouse stock distribution & doc status summary)
router.get('/charts', (req, res) => {
  // Stock per warehouse
  const warehouseStock = db.prepare(`
    SELECT w.name as warehouse, SUM(s.quantity) as stock
    FROM warehouses w
    LEFT JOIN stock s ON w.id = s.warehouse_id
    GROUP BY w.id
  `).all();

  // Document status count summary
  const docSummary = db.prepare(`
    SELECT type, status, COUNT(*) as count
    FROM documents
    GROUP BY type, status
  `).all();

  res.json({
    warehouseStock,
    docSummary
  });
});

module.exports = router;
