import { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { SlidersHorizontal, Plus, X, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function Adjustments() {
  const { products, warehouses, documents, createDocument, applyStockChange } = useInventory();
  const [showModal, setShowModal] = useState(false);
  const [productId, setProductId] = useState(products[0]?.id || 'p1');
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || 'wh1');
  const [countedQty, setCountedQty] = useState('');
  const [reason, setReason] = useState('');

  const adjustments = documents.filter(d => d.type === 'Adjustment');
  const selectedProduct = products.find(p => p.id === productId);
  const recordedCurrent = selectedProduct?.stock[warehouseId] || 0;
  const calculatedDelta = countedQty !== '' ? Number(countedQty) - recordedCurrent : 0;

  function submit(e) {
    e.preventDefault();
    if (countedQty === '') return;
    const delta = calculatedDelta;

    const docId = createDocument({
      type: 'Adjustment',
      productId,
      warehouseId,
      recorded: recordedCurrent,
      counted: Number(countedQty),
      delta,
      reason: reason || 'Physical Count Audit',
      status: 'Done',
    });
    applyStockChange(productId, warehouseId, delta, docId);
    setCountedQty('');
    setReason('');
    setShowModal(false);
  }

  return (
    <div>
      <div className="panel" style={{ marginBottom: 20, padding: '18px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
              <SlidersHorizontal size={22} className="text-primary" /> Physical Stock Adjustments
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
              Reconcile discrepancy between physical warehouse counts and system database balance
            </p>
          </div>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> New Adjustment Audit
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Audit Doc #</th>
                <th>Product</th>
                <th>Warehouse</th>
                <th>System Record</th>
                <th>Physical Count</th>
                <th>Computed Delta</th>
                <th>Reason / Notes</th>
              </tr>
            </thead>
            <tbody>
              {adjustments.map(d => {
                const prod = products.find(p => p.id === d.productId);
                const wh = warehouses.find(w => w.id === d.warehouseId);

                return (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{d.id}</td>
                    <td style={{ fontWeight: 600 }}>{prod?.name || 'Item'}</td>
                    <td>{wh?.name}</td>
                    <td>{d.recorded} {prod?.uom}</td>
                    <td style={{ fontWeight: 700 }}>{d.counted} {prod?.uom}</td>
                    <td>
                      <span style={{
                        fontWeight: 800,
                        padding: '4px 10px',
                        borderRadius: 99,
                        fontSize: 13,
                        background: d.delta < 0 ? 'var(--danger-light)' : 'var(--success-light)',
                        color: d.delta < 0 ? 'var(--danger-text)' : 'var(--success-text)',
                      }}>
                        {d.delta > 0 ? `+${d.delta}` : d.delta} {prod?.uom}
                      </span>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{d.reason}</td>
                  </tr>
                );
              })}
              {adjustments.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    No stock adjustments logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">New Stock Adjustment Audit</div>
              <button className="btn-ghost" style={{ padding: 4 }} onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submit}>
              <div className="row-line">
                <div>
                  <label>Product</label>
                  <select value={productId} onChange={e => setProductId(e.target.value)}>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Warehouse</label>
                  <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ background: 'var(--bg-subtle)', padding: 12, borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
                <div>System Recorded Balance: <strong>{recordedCurrent} {selectedProduct?.uom}</strong></div>
              </div>

              <div className="field">
                <label>Physical Counted Quantity</label>
                <input
                  type="number"
                  value={countedQty}
                  onChange={e => setCountedQty(e.target.value)}
                  placeholder={`Recorded: ${recordedCurrent}`}
                  required
                />
              </div>

              {countedQty !== '' && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  marginBottom: 14,
                  fontSize: 13,
                  fontWeight: 700,
                  background: calculatedDelta < 0 ? 'var(--danger-light)' : 'var(--success-light)',
                  color: calculatedDelta < 0 ? 'var(--danger-text)' : 'var(--success-text)'
                }}>
                  Net Adjustment Delta: {calculatedDelta > 0 ? `+${calculatedDelta}` : calculatedDelta} {selectedProduct?.uom}
                </div>
              )}

              <div className="field">
                <label>Reason / Audit Note</label>
                <input
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="e.g. Physical inventory count discrepancy, damaged item, expired batch"
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-outline" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Apply Adjustment & Log Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
