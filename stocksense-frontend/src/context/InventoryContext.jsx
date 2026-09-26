import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const InventoryContext = createContext(null);
const API_URL = 'http://localhost:3001/api';

export function InventoryProvider({ children }) {
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [kpis, setKpis] = useState({
    totalProducts: 0,
    totalStockUnits: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    pendingReceipts: 0,
    pendingDeliveries: 0,
    pendingTransfers: 0
  });
  const [loading, setLoading] = useState(true);

  // Fetch all backend data from SQLite
  const refreshAll = useCallback(async () => {
    try {
      setLoading(true);
      const [whRes, prodRes, docRes, ledRes, kpiRes] = await Promise.all([
        fetch(`${API_URL}/warehouses`),
        fetch(`${API_URL}/products`),
        fetch(`${API_URL}/documents`),
        fetch(`${API_URL}/ledger`),
        fetch(`${API_URL}/dashboard/kpis`)
      ]);

      if (whRes.ok) setWarehouses(await whRes.json());
      if (prodRes.ok) setProducts(await prodRes.json());
      if (docRes.ok) setDocuments(await docRes.json());
      if (ledRes.ok) setLedger(await ledRes.json());
      if (kpiRes.ok) setKpis(await kpiRes.json());
    } catch (err) {
      console.error('Error fetching inventory data from backend:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Create Product on backend
  async function addProduct(productData) {
    try {
      const res = await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add product');
      await refreshAll();
      return data;
    } catch (err) {
      alert(err.message);
      throw err;
    }
  }

  // Create Warehouse on backend
  async function addWarehouse(whData) {
    try {
      const res = await fetch(`${API_URL}/warehouses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(whData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create warehouse');
      await refreshAll();
      return data;
    } catch (err) {
      alert(err.message);
      throw err;
    }
  }

  // Create Document (Receipt, Delivery, Transfer, Adjustment)
  async function createDocument(docData) {
    try {
      const res = await fetch(`${API_URL}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(docData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create document');
      await refreshAll();
      return data;
    } catch (err) {
      alert(err.message);
      throw err;
    }
  }

  // Validate Document -> Strong Backend Stock Update + Ledger Logging
  async function validateDocument(docId) {
    try {
      const res = await fetch(`${API_URL}/documents/${docId}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to validate document');
      await refreshAll();
      return data;
    } catch (err) {
      alert(err.message);
      throw err;
    }
  }

  // Update Document status (Draft, Waiting, Ready, Canceled)
  async function updateDocumentStatus(docId, status) {
    try {
      const res = await fetch(`${API_URL}/documents/${docId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');
      await refreshAll();
      return data;
    } catch (err) {
      alert(err.message);
      throw err;
    }
  }

  const totalStock = kpis.totalStockUnits || products.reduce((sum, p) => sum + (p.stock || 0), 0);
  const lowStock = products.filter(p => (p.stock || 0) <= (p.reorder_level || 10));

  const value = {
    warehouses,
    products,
    documents,
    ledger,
    kpis,
    loading,
    totalStock,
    lowStock,
    refreshAll,
    addProduct,
    addWarehouse,
    createDocument,
    validateDocument,
    updateDocumentStatus,
  };

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error('useInventory must be used inside InventoryProvider');
  return ctx;
}
