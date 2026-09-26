const express = require('express');
const db = require('../db/database');

const router = express.Router();

// GET all products with stock per location and total quantity
router.get('/', (req, res) => {
  const products = db.prepare('SELECT * FROM products ORDER BY name ASC').all();
  const stockRows = db.prepare(`
    SELECT s.product_id, s.warehouse_id, w.name as warehouse_name, s.quantity
    FROM stock s
    JOIN warehouses w ON s.warehouse_id = w.id
  `).all();

  // Group stock by product_id
  const stockMap = {};
  for (const s of stockRows) {
    if (!stockMap[s.product_id]) stockMap[s.product_id] = {};
    stockMap[s.product_id][s.warehouse_name] = s.quantity;
  }

  const result = products.map(p => {
    const locations = stockMap[p.id] || {};
    const totalQty = Object.values(locations).reduce((sum, qty) => sum + qty, 0);
    return {
      ...p,
      stock: totalQty,
      locations
    };
  });

  res.json(result);
});

// POST create new product
router.post('/', (req, res) => {
  const { name, sku, category, uom, reorder_level, initial_stock, warehouse_id } = req.body;
  if (!name || !sku || !category || !uom) {
    return res.status(400).json({ error: 'Name, SKU, category, and UoM are required' });
  }

  try {
    const insertRes = db.prepare(`
      INSERT INTO products (name, sku, category, uom, reorder_level)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, sku, category, uom, reorder_level || 10);

    const productId = insertRes.lastInsertRowid;
    const initialQty = parseInt(initial_stock || 0, 10);

    // Get default warehouse (Main Warehouse or provided warehouse_id)
    let targetWhId = warehouse_id;
    if (!targetWhId) {
      const mainWh = db.prepare("SELECT id FROM warehouses WHERE name = 'Main Warehouse'").get();
      targetWhId = mainWh ? mainWh.id : 1;
    }

    if (initialQty > 0) {
      db.prepare(`
        INSERT INTO stock (product_id, warehouse_id, quantity)
        VALUES (?, ?, ?)
      `).run(productId, targetWhId, initialQty);

      db.prepare(`
        INSERT INTO stock_ledger (product_id, warehouse_id, qty_delta, reference, type)
        VALUES (?, ?, ?, 'INITIAL', 'Initial Stock')
      `).run(productId, targetWhId, initialQty);
    }

    const created = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
    res.status(201).json(created);
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed: products.sku')) {
      return res.status(400).json({ error: 'SKU code already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT update product
router.put('/:id', (req, res) => {
  const { name, sku, category, uom, reorder_level } = req.body;
  const productId = req.params.id;

  try {
    const updateRes = db.prepare(`
      UPDATE products 
      SET name = ?, sku = ?, category = ?, uom = ?, reorder_level = ?
      WHERE id = ?
    `).run(name, sku, category, uom, reorder_level, productId);

    if (updateRes.changes === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE product
router.delete('/:id', (req, res) => {
  const productId = req.params.id;
  const delRes = db.prepare('DELETE FROM products WHERE id = ?').run(productId);
  if (delRes.changes === 0) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json({ message: 'Product deleted successfully' });
});

module.exports = router;
