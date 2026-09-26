import { createContext, useContext, useState, useMemo } from 'react';

const InventoryContext = createContext(null);

// ---- Seed / mock data (replace with real API calls once backend is ready) ----
const seedWarehouses = [
  { id: 'wh1', name: 'Main Warehouse' },
  { id: 'wh2', name: 'Production Floor' },
  { id: 'wh3', name: 'Warehouse 2' },
];

const seedProducts = [
  { id: 'p1', name: 'Steel Rods', sku: 'STL-001', category: 'Raw Material', uom: 'kg', stock: { wh1: 150, wh2: 0, wh3: 0 } },
  { id: 'p2', name: 'Chairs', sku: 'CHR-010', category: 'Finished Goods', uom: 'pcs', stock: { wh1: 40, wh2: 0, wh3: 12 } },
  { id: 'p3', name: 'Steel Frames', sku: 'FRM-004', category: 'Finished Goods', uom: 'pcs', stock: { wh1: 25, wh2: 5, wh3: 0 } },
];

let idCounter = 1000;
const nextId = (prefix) => `${prefix}${idCounter++}`;

export function InventoryProvider({ children }) {
  const [warehouses] = useState(seedWarehouses);
  const [products, setProducts] = useState(seedProducts);
  const [documents, setDocuments] = useState([]); // receipts, deliveries, transfers, adjustments
  const [ledger, setLedger] = useState([]); // append-only log

  // The ONE function that ever changes stock — every operation module calls this.
  function applyStockChange(productId, warehouseId, qtyDelta, documentRef) {
    setProducts(prev =>
      prev.map(p =>
        p.id === productId
          ? { ...p, stock: { ...p.stock, [warehouseId]: (p.stock[warehouseId] || 0) + qtyDelta } }
          : p
      )
    );
    setLedger(prev => [
      ...prev,
      { id: nextId('led'), productId, warehouseId, qtyDelta, documentRef, timestamp: new Date().toISOString() },
    ]);
  }

  function createDocument(doc) {
    const newDoc = { id: nextId('doc'), status: 'Draft', createdAt: new Date().toISOString(), ...doc };
    setDocuments(prev => [newDoc, ...prev]);
    return newDoc.id;
  }

  function updateDocumentStatus(docId, status) {
    setDocuments(prev => prev.map(d => (d.id === docId ? { ...d, status } : d)));
  }

  function addProduct(product) {
    setProducts(prev => [
      ...prev,
      {
        id: nextId('p'),
        stock: { wh1: 0, wh2: 0, wh3: 0, ...(product.initialStock ? { [product.initialWarehouse]: product.initialStock } : {}) },
        ...product,
      },
    ]);
  }

  const totalStock = useMemo(
    () => products.reduce((sum, p) => sum + Object.values(p.stock).reduce((a, b) => a + b, 0), 0),
    [products]
  );

  const lowStock = useMemo(
    () => products.filter(p => Object.values(p.stock).reduce((a, b) => a + b, 0) <= 20),
    [products]
  );

  const value = {
    warehouses,
    products,
    documents,
    ledger,
    totalStock,
    lowStock,
    applyStockChange,
    createDocument,
    updateDocumentStatus,
    addProduct,
  };

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error('useInventory must be used inside InventoryProvider');
  return ctx;
}
