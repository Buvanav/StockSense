const express = require('express');
const db = require('../db/database');

const router = express.Router();

// Generate sequential doc numbers: WH/IN/00001, WH/OUT/00001, WH/INT/00001, WH/ADJ/00001
function generateDocNumber(type) {
  const prefixMap = {
    receipt: 'WH/IN/',
    delivery: 'WH/OUT/',
    transfer: 'WH/INT/',
    adjustment: 'WH/ADJ/'
  };
  const prefix = prefixMap[type] || 'WH/DOC/';
  
  const lastDoc = db.prepare(`
    SELECT doc_number FROM documents 
    WHERE type = ? AND doc_number LIKE ? 
    ORDER BY id DESC LIMIT 1
  `).get(type, `${prefix}%`);

  let nextNum = 1;
  if (lastDoc) {
    const numPart = lastDoc.doc_number.replace(prefix, '');
    nextNum = parseInt(numPart, 10) + 1;
  }
  return `${prefix}${nextNum.toString().padStart(5, '0')}`;
}

// GET documents (with filters: type, status, warehouse_id)
router.get('/', (req, res) => {
  const { type, status, warehouse_id } = req.query;

  let query = `
    SELECT d.*, 
           w_src.name as source_warehouse_name,
           w_dst.name as dest_warehouse_name
    FROM documents d
    LEFT JOIN warehouses w_src ON d.source_warehouse_id = w_src.id
    LEFT JOIN warehouses w_dst ON d.dest_warehouse_id = w_dst.id
    WHERE 1=1
  `;
  const params = [];

  if (type) {
    query += ' AND d.type = ?';
    params.push(type);
  }
  if (status) {
    query += ' AND d.status = ?';
    params.push(status);
  }
  if (warehouse_id) {
    query += ' AND (d.source_warehouse_id = ? OR d.dest_warehouse_id = ?)';
    params.push(warehouse_id, warehouse_id);
  }

  query += ' ORDER BY d.id DESC';

  const docs = db.prepare(query).all(...params);

  // Attach document lines (items)
  const result = docs.map(doc => {
    const lines = db.prepare(`
      SELECT dl.*, p.name as product_name, p.sku as product_sku, p.uom as product_uom
      FROM document_lines dl
      JOIN products p ON dl.product_id = p.id
      WHERE dl.document_id = ?
    `).all(doc.id);
    return { ...doc, items: lines };
  });

  res.json(result);
});

// GET single document by ID
router.get('/:id', (req, res) => {
  const doc = db.prepare(`
    SELECT d.*, 
           w_src.name as source_warehouse_name,
           w_dst.name as dest_warehouse_name
    FROM documents d
    LEFT JOIN warehouses w_src ON d.source_warehouse_id = w_src.id
    LEFT JOIN warehouses w_dst ON d.dest_warehouse_id = w_dst.id
    WHERE d.id = ?
  `).get(req.params.id);

  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const lines = db.prepare(`
    SELECT dl.*, p.name as product_name, p.sku as product_sku, p.uom as product_uom
    FROM document_lines dl
    JOIN products p ON dl.product_id = p.id
    WHERE dl.document_id = ?
  `).all(doc.id);

  res.json({ ...doc, items: lines });
});

// POST create document (Receipt, Delivery, Transfer, Adjustment)
router.post('/', (req, res) => {
  const { type, supplier, customer, source_warehouse_id, dest_warehouse_id, reason, items, status } = req.body;

  if (!type || !['receipt', 'delivery', 'transfer', 'adjustment'].includes(type)) {
    return res.status(400).json({ error: 'Valid document type required (receipt, delivery, transfer, adjustment)' });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'At least one product item is required' });
  }

  const docNumber = generateDocNumber(type);
  const docStatus = status || 'Draft';

  const createDocTx = db.transaction(() => {
    const docResult = db.prepare(`
      INSERT INTO documents (doc_number, type, status, supplier, customer, source_warehouse_id, dest_warehouse_id, reason)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(docNumber, type, docStatus, supplier || null, customer || null, source_warehouse_id || null, dest_warehouse_id || null, reason || null);

    const docId = docResult.lastInsertRowid;

    const insertLine = db.prepare(`
      INSERT INTO document_lines (document_id, product_id, quantity, counted_qty)
      VALUES (?, ?, ?, ?)
    `);

    for (const item of items) {
      insertLine.run(docId, item.product_id, item.quantity || 0, item.counted_qty !== undefined ? item.counted_qty : null);
    }

    return docId;
  });

  try {
    const docId = createDocTx();
    const createdDoc = db.prepare('SELECT * FROM documents WHERE id = ?').get(docId);
    res.status(201).json(createdDoc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST validate document (Apply Stock Changes & Write Stock Ledger)
router.post('/:id/validate', (req, res) => {
  const docId = req.params.id;

  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(docId);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  if (doc.status === 'Done') return res.status(400).json({ error: 'Document already validated and completed' });
  if (doc.status === 'Canceled') return res.status(400).json({ error: 'Cannot validate a canceled document' });

  const lines = db.prepare('SELECT * FROM document_lines WHERE document_id = ?').all(docId);

  const validateTx = db.transaction(() => {
    // Helper to get or init stock
    const getStock = (prodId, whId) => {
      const row = db.prepare('SELECT quantity FROM stock WHERE product_id = ? AND warehouse_id = ?').get(prodId, whId);
      return row ? row.quantity : 0;
    };

    const updateStock = (prodId, whId, newQty) => {
      const existing = db.prepare('SELECT id FROM stock WHERE product_id = ? AND warehouse_id = ?').get(prodId, whId);
      if (existing) {
        db.prepare('UPDATE stock SET quantity = ? WHERE id = ?').run(newQty, existing.id);
      } else {
        db.prepare('INSERT INTO stock (product_id, warehouse_id, quantity) VALUES (?, ?, ?)').run(prodId, whId, newQty);
      }
    };

    const writeLedger = (prodId, whId, delta, ref, typeLabel) => {
      db.prepare(`
        INSERT INTO stock_ledger (product_id, warehouse_id, qty_delta, document_id, reference, type)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(prodId, whId, delta, docId, ref, typeLabel);
    };

    if (doc.type === 'receipt') {
      const targetWh = doc.dest_warehouse_id || 1;
      for (const line of lines) {
        const currentQty = getStock(line.product_id, targetWh);
        const newQty = currentQty + line.quantity;
        updateStock(line.product_id, targetWh, newQty);
        writeLedger(line.product_id, targetWh, line.quantity, doc.doc_number, 'Receipt');
      }
    } else if (doc.type === 'delivery') {
      const sourceWh = doc.source_warehouse_id || 1;
      for (const line of lines) {
        const currentQty = getStock(line.product_id, sourceWh);
        const newQty = Math.max(0, currentQty - line.quantity);
        updateStock(line.product_id, sourceWh, newQty);
        writeLedger(line.product_id, sourceWh, -line.quantity, doc.doc_number, 'Delivery');
      }
    } else if (doc.type === 'transfer') {
      const sourceWh = doc.source_warehouse_id;
      const destWh = doc.dest_warehouse_id;
      if (!sourceWh || !destWh) {
        throw new Error('Source and destination warehouses required for transfer');
      }
      for (const line of lines) {
        // Decrease source
        const srcQty = getStock(line.product_id, sourceWh);
        updateStock(line.product_id, sourceWh, Math.max(0, srcQty - line.quantity));
        writeLedger(line.product_id, sourceWh, -line.quantity, doc.doc_number, 'Internal Transfer (Out)');

        // Increase dest
        const dstQty = getStock(line.product_id, destWh);
        updateStock(line.product_id, destWh, dstQty + line.quantity);
        writeLedger(line.product_id, destWh, line.quantity, doc.doc_number, 'Internal Transfer (In)');
      }
    } else if (doc.type === 'adjustment') {
      const whId = doc.source_warehouse_id || doc.dest_warehouse_id || 1;
      for (const line of lines) {
        const recordedQty = getStock(line.product_id, whId);
        const countedQty = line.counted_qty !== null ? line.counted_qty : line.quantity;
        const delta = countedQty - recordedQty;

        updateStock(line.product_id, whId, countedQty);
        writeLedger(line.product_id, whId, delta, doc.doc_number, 'Adjustment');
      }
    }

    // Mark document as Done
    db.prepare("UPDATE documents SET status = 'Done', validated_at = CURRENT_TIMESTAMP WHERE id = ?").run(docId);
  });

  try {
    validateTx();
    const updatedDoc = db.prepare('SELECT * FROM documents WHERE id = ?').get(docId);
    res.json({ message: 'Document validated successfully. Stock levels updated.', document: updatedDoc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update document status (Draft, Waiting, Ready, Canceled)
router.put('/:id/status', (req, res) => {
  const { status } = req.body;
  const docId = req.params.id;

  const validStatuses = ['Draft', 'Waiting', 'Ready', 'Done', 'Canceled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const result = db.prepare('UPDATE documents SET status = ? WHERE id = ?').run(status, docId);
  if (result.changes === 0) return res.status(404).json({ error: 'Document not found' });

  res.json({ message: `Status updated to ${status}` });
});

module.exports = router;
