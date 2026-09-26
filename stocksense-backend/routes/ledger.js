const express = require('express');
const db = require('../db/database');

const router = express.Router();

// GET Stock Move Ledger history
router.get('/', (req, res) => {
  const { product_id, warehouse_id, type, reference, limit } = req.query;

  let query = `
    SELECT l.*, 
           p.name as product_name, p.sku as product_sku, p.uom as product_uom,
           w.name as warehouse_name
    FROM stock_ledger l
    JOIN products p ON l.product_id = p.id
    JOIN warehouses w ON l.warehouse_id = w.id
    WHERE 1=1
  `;
  const params = [];

  if (product_id) {
    query += ' AND l.product_id = ?';
    params.push(product_id);
  }
  if (warehouse_id) {
    query += ' AND l.warehouse_id = ?';
    params.push(warehouse_id);
  }
  if (type) {
    query += ' AND l.type LIKE ?';
    params.push(`%${type}%`);
  }
  if (reference) {
    query += ' AND l.reference LIKE ?';
    params.push(`%${reference}%`);
  }

  query += ' ORDER BY l.id DESC';

  const maxRows = parseInt(limit || '100', 10);
  query += ` LIMIT ${maxRows}`;

  const moves = db.prepare(query).all(...params);
  res.json(moves);
});

module.exports = router;
