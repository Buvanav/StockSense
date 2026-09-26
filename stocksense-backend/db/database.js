const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'stocksense.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

function initDb() {
  // 1. Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'Warehouse Staff',
      is_verified INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS otps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      used INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS warehouses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      code TEXT,
      address TEXT
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sku TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      uom TEXT NOT NULL,
      reorder_level INTEGER DEFAULT 10,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS stock (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL DEFAULT 0,
      UNIQUE(product_id, warehouse_id)
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doc_number TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Draft',
      supplier TEXT,
      customer TEXT,
      source_warehouse_id INTEGER REFERENCES warehouses(id),
      dest_warehouse_id INTEGER REFERENCES warehouses(id),
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      validated_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS document_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL,
      counted_qty INTEGER
    );

    CREATE TABLE IF NOT EXISTS stock_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id),
      warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
      qty_delta INTEGER NOT NULL,
      document_id INTEGER REFERENCES documents(id),
      reference TEXT,
      type TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migration helper for existing users table
  try {
    db.exec(`ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 0;`);
  } catch (err) {
    // Column already exists
  }

  // Seed default admin user if not existing
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('admin123', salt);
    db.prepare(`
      INSERT INTO users (name, email, password_hash, role, is_verified)
      VALUES ('Admin User', 'admin@stocksense.com', ?, 'Inventory Manager', 1)
    `).run(hash);
    console.log('Seeded default admin user: admin@stocksense.com / admin123 (Role: Inventory Manager)');

    const staffHash = bcrypt.hashSync('staff123', salt);
    db.prepare(`
      INSERT INTO users (name, email, password_hash, role, is_verified)
      VALUES ('Warehouse Operator', 'staff@stocksense.com', ?, 'Warehouse Staff', 1)
    `).run(staffHash);
    console.log('Seeded default staff user: staff@stocksense.com / staff123 (Role: Warehouse Staff)');
  }

  // Seed default warehouses if empty
  const whCount = db.prepare('SELECT COUNT(*) as count FROM warehouses').get().count;
  if (whCount === 0) {
    db.prepare("INSERT INTO warehouses (name, code, address) VALUES ('Main Warehouse', 'WH-MAIN', 'Building A, Tech Park')").run();
    db.prepare("INSERT INTO warehouses (name, code, address) VALUES ('Production Floor', 'WH-PROD', 'Building B, Floor 1')").run();
    db.prepare("INSERT INTO warehouses (name, code, address) VALUES ('Rack A', 'WH-RACKA', 'Aisle 3, Shelf A')").run();
    db.prepare("INSERT INTO warehouses (name, code, address) VALUES ('Rack B', 'WH-RACKB', 'Aisle 3, Shelf B')").run();
    db.prepare("INSERT INTO warehouses (name, code, address) VALUES ('Warehouse 2', 'WH-02', 'South District Hub')").run();
    console.log('Seeded default warehouses');
  }

  // Seed initial products if empty
  const prodCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  if (prodCount === 0) {
    const insertProduct = db.prepare(`
      INSERT INTO products (name, sku, category, uom, reorder_level)
      VALUES (?, ?, ?, ?, ?)
    `);
    const insertStock = db.prepare(`
      INSERT INTO stock (product_id, warehouse_id, quantity)
      VALUES (?, ?, ?)
    `);
    const insertLedger = db.prepare(`
      INSERT INTO stock_ledger (product_id, warehouse_id, qty_delta, reference, type)
      VALUES (?, ?, ?, 'INITIAL', 'Initial Stock')
    `);

    const initialProducts = [
      { name: 'Steel Rods (10mm)', sku: 'STL-ROD-001', category: 'Raw Materials', uom: 'kg', reorder: 50, qty: 150 },
      { name: 'Ergonomic Office Chair', sku: 'FUR-CHR-002', category: 'Furniture', uom: 'Units', reorder: 10, qty: 45 },
      { name: 'Microcontroller Unit v2', sku: 'ELE-MCU-003', category: 'Electronics', uom: 'Units', reorder: 25, qty: 8 },
      { name: 'Industrial Safety Gloves', sku: 'SAF-GLV-004', category: 'Safety Gear', uom: 'Pairs', reorder: 30, qty: 120 },
      { name: 'Hydraulic Fluid ISO 46', sku: 'LUB-OIL-005', category: 'Consumables', uom: 'Liters', reorder: 15, qty: 4 }
    ];

    const mainWh = db.prepare("SELECT id FROM warehouses WHERE name = 'Main Warehouse'").get();

    for (const p of initialProducts) {
      const res = insertProduct.run(p.name, p.sku, p.category, p.uom, p.reorder);
      const prodId = res.lastInsertRowid;
      insertStock.run(prodId, mainWh.id, p.qty);
      insertLedger.run(prodId, mainWh.id, p.qty);
    }
    console.log('Seeded initial products and stock levels');
  }

  // Seed sample receipts & delivery orders for initial hackathon dashboard demonstration
  const docCount = db.prepare('SELECT COUNT(*) as count FROM documents').get().count;
  if (docCount === 0) {
    const mainWh = db.prepare("SELECT id FROM warehouses WHERE name = 'Main Warehouse'").get();
    const prodWh = db.prepare("SELECT id FROM warehouses WHERE name = 'Production Floor'").get();
    const steelRod = db.prepare("SELECT id FROM products WHERE sku = 'STL-ROD-001'").get();
    const chair = db.prepare("SELECT id FROM products WHERE sku = 'FUR-CHR-002'").get();

    // 1. Pending Receipt
    const r1 = db.prepare(`
      INSERT INTO documents (doc_number, type, status, supplier, dest_warehouse_id)
      VALUES ('WH/IN/00001', 'receipt', 'Waiting', 'Apex Steel Supplies', ?)
    `).run(mainWh.id);
    db.prepare(`INSERT INTO document_lines (document_id, product_id, quantity) VALUES (?, ?, 100)`).run(r1.lastInsertRowid, steelRod.id);

    // 2. Completed Receipt
    const r2 = db.prepare(`
      INSERT INTO documents (doc_number, type, status, supplier, dest_warehouse_id, validated_at)
      VALUES ('WH/IN/00002', 'receipt', 'Done', 'Global Metals Corp', ?, CURRENT_TIMESTAMP)
    `).run(mainWh.id);
    db.prepare(`INSERT INTO document_lines (document_id, product_id, quantity) VALUES (?, ?, 50)`).run(r2.lastInsertRowid, steelRod.id);

    // 3. Pending Delivery
    const d1 = db.prepare(`
      INSERT INTO documents (doc_number, type, status, customer, source_warehouse_id)
      VALUES ('WH/OUT/00001', 'delivery', 'Ready', 'TechHub Solutions', ?)
    `).run(mainWh.id);
    db.prepare(`INSERT INTO document_lines (document_id, product_id, quantity) VALUES (?, ?, 10)`).run(d1.lastInsertRowid, chair.id);

    // 4. Internal Transfer (Scheduled)
    const t1 = db.prepare(`
      INSERT INTO documents (doc_number, type, status, source_warehouse_id, dest_warehouse_id, reason)
      VALUES ('WH/INT/00001', 'transfer', 'Waiting', ?, ?, 'Replenish production line')
    `).run(mainWh.id, prodWh.id);
    db.prepare(`INSERT INTO document_lines (document_id, product_id, quantity) VALUES (?, ?, 25)`).run(t1.lastInsertRowid, steelRod.id);

    console.log('Seeded initial sample documents');
  }
}

initDb();

module.exports = db;
