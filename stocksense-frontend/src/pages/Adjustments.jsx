import { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import StatusBadge from '../components/StatusBadge';
import { Sliders, Plus, X, CheckCircle2 } from 'lucide-react';

export default function Adjustments() {
  const { products, warehouses, documents, createDocument, validateDocument } = useInventory();
  const [showModal, setShowModal] = useState(false);
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || 1);
  const [productId, setProductId] = useState(products[0]?.id || 1);
  const [countedQty, setCountedQty] = useState('15');
  const [reason, setReason] = useState('Physical count audit');

  const adjustments = documents.filter(d => d.type === 'adjustment');

  const selectedProduct = products.find(p => p.id === Number(productId)) || products[0];
  const currentStock = selectedProduct ? (selectedProduct.stock || 0) : 0;

  async function handleCreateAdjustment(e) {
    e.preventDefault();
    try {
      await createDocument({
        type: 'adjustment',
        source_warehouse_id: Number(warehouseId),
        reason,
        status: 'Waiting',
        items: [
          {
            product_id: Number(productId),
            quantity: currentStock,
            counted_qty: Number(countedQty)
          }
        ]
      });
      setShowModal(false);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleValidate(docId) {
    try {
      await validateDocument(docId);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div>
      <div className="panel" style={{ marginBottom: 20, padding: '18px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sliders size={22} className="text-primary" /> Physical Stock Adjustments
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
              Reconcile physical inventory counts against system records (damaged goods, lost stock, cycle counts)
            </p>
          </div>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> New Stock Adjustment
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Adjustment Doc #</th>
                <th>Target Location</th>
                <th>Reason / Audit Note</th>
                <th>Status</th>
                <th>Product & Count Difference</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {adjustments.map(d => (
                <tr key={d.id}>
                  <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{d.doc_number}</td>
                  <td style={{ fontWeight: 600 }}>{d.source_warehouse_name || 'Main Warehouse'}</td>
                  <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{d.reason || 'Inventory count reconciliation'}</td>
                  <td>
                    <StatusBadge status={d.status} />
                  </td>
                  <td style={{ fontSize: 13 }}>
                    {d.items && d.items.length > 0 ? (
                      d.items.map(l => (
                        <span key={l.id}>
                          <strong>{l.product_name}</strong> (Physical Count: {l.counted_qty ?? l.quantity})
                        </span>
                      ))
                    ) : (
                      'No line items'
                    )}
                  </td>
                  <td>
                    {d.status !== 'Done' ? (
                      <button className="btn-primary btn-sm" onClick={() => handleValidate(d.id)}>
                        <CheckCircle2 size={14} /> Validate & Reconcile
                      </button>
                    ) : (
                      <span style={{ color: 'var(--success-text)', fontSize: 13, fontWeight: 700 }}>
                        Reconciled & Logged
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {adjustments.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    No stock adjustments performed yet.
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
              <div className="modal-title">Record Stock Adjustment</div>
              <button className="btn-ghost" style={{ padding: 4 }} onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAdjustment}>
              <div className="row-line">
                <div>
                  <label>Audit Warehouse Location</label>
                  <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Product Item</label>
                  <select value={productId} onChange={e => setProductId(e.target.value)}>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="row-line" style={{ marginTop: 12 }}>
                <div>
                  <label>System Recorded Quantity</label>
                  <input value={`${currentStock} ${selectedProduct?.uom || ''}`} disabled style={{ background: 'var(--bg-card-hover)' }} />
                </div>
                <div>
                  <label>Actual Physical Counted Qty</label>
                  <input
                    type="number"
                    value={countedQty}
                    onChange={e => setCountedQty(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <label>Adjustment Reason (e.g. 3 kg steel damaged)</label>
                <input
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Damaged stock / shrinkage / physical count audit"
                  required
                />
              </div>

              <div className="modal-actions" style={{ marginTop: 20 }}>
                <button type="button" className="btn-outline" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Adjustment Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
