import { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { History, Download, Filter } from 'lucide-react';

export default function MoveHistory() {
  const { ledger } = useInventory();
  const [filterType, setFilterType] = useState('ALL');

  const filteredLedger = ledger.filter(entry => {
    if (filterType === 'ALL') return true;
    return (entry.type || '').toLowerCase().includes(filterType.toLowerCase());
  });

  function exportCsv() {
    const headers = ['ID,Reference,Type,Product,Warehouse,Qty Delta,Timestamp'];
    const rows = filteredLedger.map(e =>
      [
        e.id,
        `"${e.reference || ''}"`,
        `"${e.type || ''}"`,
        `"${e.product_name || ''}"`,
        `"${e.warehouse_name || ''}"`,
        e.qty_delta,
        `"${e.timestamp || ''}"`
      ].join(',')
    );

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `StockSense_Move_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div>
      <div className="panel" style={{ marginBottom: 20, padding: '18px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
              <History size={22} className="text-primary" /> Stock Ledger & Move History
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
              Immutable real-time audit trail of all inventory receipts, dispatches, transfers, and physical adjustments
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-outline" onClick={exportCsv}>
              <Download size={16} /> Export Audit Ledger (CSV)
            </button>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 16, padding: '12px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Filter size={16} className="text-primary" />
          <span style={{ fontSize: 13, fontWeight: 600 }}>Filter by Move Type:</span>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            style={{ maxWidth: 220, padding: '6px 12px', fontSize: 13 }}
          >
            <option value="ALL">All Ledger Movements</option>
            <option value="Receipt">Receipts (Goods In)</option>
            <option value="Delivery">Deliveries (Goods Out)</option>
            <option value="Transfer">Internal Transfers</option>
            <option value="Adjustment">Stock Adjustments</option>
          </select>
        </div>
      </div>

      <div className="panel">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Ledger ID</th>
                <th>Timestamp</th>
                <th>Document Reference</th>
                <th>Move Type</th>
                <th>Product SKU</th>
                <th>Location</th>
                <th>Quantity Delta</th>
              </tr>
            </thead>
            <tbody>
              {filteredLedger.map(e => {
                const isPositive = (e.qty_delta || 0) > 0;
                return (
                  <tr key={e.id}>
                    <td style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-muted)' }}>#{e.id}</td>
                    <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      {e.timestamp ? new Date(e.timestamp).toLocaleString() : 'Just now'}
                    </td>
                    <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{e.reference || 'SYSTEM'}</td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: 'var(--bg-card-hover)',
                          color: 'var(--text-main)',
                          fontWeight: 700,
                          fontSize: 11
                        }}
                      >
                        {e.type}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {e.product_name} <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>({e.product_sku})</span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{e.warehouse_name}</td>
                    <td
                      style={{
                        fontWeight: 800,
                        fontSize: 14,
                        color: isPositive ? 'var(--success-text)' : 'var(--danger-text)'
                      }}
                    >
                      {isPositive ? `+${e.qty_delta}` : e.qty_delta} {e.product_uom || ''}
                    </td>
                  </tr>
                );
              })}
              {filteredLedger.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    No stock movements recorded in the ledger matching your filter.
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
