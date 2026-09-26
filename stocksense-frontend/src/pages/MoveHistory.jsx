import { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { History, Download, ArrowDownLeft, ArrowUpRight, Search, Building2, Filter } from 'lucide-react';

export default function MoveHistory() {
  const { ledger, products, warehouses } = useInventory();
  
  const [productFilter, setProductFilter] = useState('all');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const rows = useMemo(() => {
    return ledger
      .filter(l => {
        if (productFilter !== 'all' && l.productId !== productFilter) return false;
        if (warehouseFilter !== 'all' && l.warehouseId !== warehouseFilter) return false;
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const docMatch = l.documentRef?.toLowerCase().includes(query);
          const prodName = products.find(p => p.id === l.productId)?.name.toLowerCase();
          if (!docMatch && !prodName?.includes(query)) return false;
        }
        return true;
      })
      .slice()
      .reverse();
  }, [ledger, productFilter, warehouseFilter, searchQuery, products]);

  const handleExportCsv = () => {
    if (rows.length === 0) return;
    const headers = ['Timestamp', 'Ledger ID', 'Product SKU', 'Product Name', 'Warehouse', 'Qty Change', 'Document Ref'];
    const csvContent = [
      headers.join(','),
      ...rows.map(r => {
        const prod = products.find(p => p.id === r.productId);
        const wh = warehouses.find(w => w.id === r.warehouseId);
        return [
          `"${new Date(r.timestamp).toLocaleString()}"`,
          r.id,
          prod?.sku || '',
          `"${prod?.name || ''}"`,
          `"${wh?.name || ''}"`,
          r.qtyDelta,
          r.documentRef,
        ].join(',');
      }),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `StockSense_Ledger_Export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="panel" style={{ marginBottom: 20, padding: '18px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
              <History size={22} className="text-primary" /> Stock Ledger (Move History)
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
              Append-only audit trail of every stock increase, deduction, transfer, and physical count adjustment
            </p>
          </div>
          <button className="btn-outline" onClick={handleExportCsv} disabled={rows.length === 0}>
            <Download size={16} /> Export Ledger CSV
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="filter-bar">
          <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search document ref or product name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 38 }}
            />
          </div>

          <select value={productFilter} onChange={e => setProductFilter(e.target.value)}>
            <option value="all">All Products</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>

          <select value={warehouseFilter} onChange={e => setWarehouseFilter(e.target.value)}>
            <option value="all">All Warehouses</option>
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Product</th>
                <th>Warehouse</th>
                <th>Qty Movement</th>
                <th>Document Reference</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(l => {
                const prod = products.find(p => p.id === l.productId);
                const wh = warehouses.find(w => w.id === l.warehouseId);
                const isPositive = l.qtyDelta > 0;

                return (
                  <tr key={l.id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                      {new Date(l.timestamp).toLocaleString()}
                    </td>
                    <td style={{ fontWeight: 600 }}>{prod?.name || l.productId}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Building2 size={14} color="var(--text-muted)" /> {wh?.name || l.warehouseId}
                      </div>
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontWeight: 800,
                        padding: '4px 10px',
                        borderRadius: 99,
                        fontSize: 13,
                        background: isPositive ? 'var(--success-light)' : 'var(--danger-light)',
                        color: isPositive ? 'var(--success-text)' : 'var(--danger-text)',
                      }}>
                        {isPositive ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                        {isPositive ? `+${l.qtyDelta}` : l.qtyDelta} {prod?.uom}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>
                      {l.documentRef}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    No stock movement events recorded in the ledger yet. Perform a Receipt, Delivery, Transfer or Adjustment to log entries.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
