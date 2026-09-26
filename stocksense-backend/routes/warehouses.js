const express = require('express');
const db = require('../db/database');

const router = express.Router();

// GET all warehouses
router.get('/', (req, res) => {
  const warehouses = db.prepare('SELECT * FROM warehouses ORDER BY name ASC').all();
  res.json(warehouses);
});

// POST add warehouse
router.post('/', (req, res) => {
  const { name, code, address } = req.body;
  if (!name) return res.status(400).json({ error: 'Warehouse name is required' });

  try {
    const result = db.prepare(`
      INSERT INTO warehouses (name, code, address)
      VALUES (?, ?, ?)
    `).run(name, code || name.substring(0, 3).toUpperCase(), address || '');

    const created = db.prepare('SELECT * FROM warehouses WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed: warehouses.name')) {
      return res.status(400).json({ error: 'Warehouse name already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE warehouse
router.delete('/:id', (req, res) => {
  const id = req.params.id;
  const result = db.prepare('DELETE FROM warehouses WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Warehouse not found' });
  res.json({ message: 'Warehouse deleted' });
});

module.exports = router;
