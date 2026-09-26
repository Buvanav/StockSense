import { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import StatusBadge from '../components/StatusBadge';
import { Repeat, Plus, X, ArrowRight, CheckCircle2, Building2 } from 'lucide-react';

export default function Transfers() {
  const { products, warehouses, documents, createDocument, updateDocumentStatus, applyStockChange } = useInventory();
  const [showModal, setShowModal] = useState(false);
  const [sourceWarehouseId, setSourceWarehouseId] = useState(warehouses[0]?.id || 'wh1');
  const [destWarehouseId, setDestWarehouseId] = useState(warehouses[1]?.id || 'wh2');
  const [productId, setProductId] = useState(products[0]?.id || 'p1');
  const [qty, setQty] = useState('10');

  const transfers = documents.filter(d => d.type === 'Internal');

  function createTransfer(e) {
    e.preventDefault();
    if (!qty || sourceWarehouseId === destWarehouseId) return;
    createDocument({
      type: 'Internal',
      sourceWarehouseId,
      destWarehouseId,
      productId,
      qty: Number(qty),
      status: 'Ready',
    });
    setQty('10');
    setShowModal(false);
  }

  function validate(doc) {
    applyStockChange(doc.productId, doc.sourceWarehouseId, -Number(doc.qty), doc.id);
    applyStockChange(doc.productId, doc.destWarehouseId, Number(doc.qty), doc.id);
    updateDocumentStatus(doc.id, 'Done');
  }

  return (
    <div>
      <div className="panel" style={{ marginBottom: 20, padding: '18px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Repeat size={22} className="text-primary" /> Internal Stock Transfers
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
              Relocate inventory items between warehouses, racks or production floors without altering net balance
            </p>
          </div>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> New Transfer
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Doc #</th>
                <th>Product</th>
                <th>From (Origin)</th>
                <th>To (Destination)</th>
                <th>Quantity</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map(d => {
                const prod = products.find(p => p.id === d.productId);
                const fromWh = warehouses.find(w => w.id === d.sourceWarehouseId);
                const toWh = warehouses.find(w => w.id === d.destWarehouseId);

                return (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{d.id}</td>
                    <td style={{ fontWeight: 600 }}>{prod?.name || 'Item'}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Building2 size={14} color="var(--text-muted)" /> {fromWh?.name}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--primary)' }}>
                        <ArrowRight size={14} /> {toWh?.name}
                      </div>
                    </td>
                    <td style={{ fontWeight: 800 }}>{d.qty} {prod?.uom}</td>
                    <td>
                      <StatusBadge status={d.status} />
                    </td>
                    <td>
                      {d.status !== 'Done' ? (
                        <button className="btn-primary btn-sm" onClick={() => validate(d)}>
                          <CheckCircle2 size={14} /> Complete Transfer
                        </button>
                      ) : (
                        <span style={{ color: 'var(--success-text)', fontSize: 13, fontWeight: 700 }}>
                          Transferred & Reconciled
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {transfers.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    No internal transfers logged yet.
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
              <div className="modal-title">New Internal Transfer</div>
              <button className="btn-ghost" style={{ padding: 4 }} onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={createTransfer}>
              <div className="field">
                <label>Select Product</label>
                <select value={productId} onChange={e => setProductId(e.target.value)}>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div className="row-line">
                <div>
                  <label>From Source Warehouse</label>
                  <select value={sourceWarehouseId} onChange={e => setSourceWarehouseId(e.target.value)}>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>To Destination Warehouse</label>
                  <select value={destWarehouseId} onChange={e => setDestWarehouseId(e.target.value)}>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {sourceWarehouseId === destWarehouseId && (
                <div style={{ fontSize: 12, color: 'var(--danger-text)', marginBottom: 12 }}>
                  Source and Destination warehouses must be different!
                </div>
              )}

              <div className="field">
                <label>Quantity to Transfer</label>
                <input
                  type="number"
                  value={qty}
                  onChange={e => setQty(e.target.value)}
                  placeholder="10"
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-outline" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={sourceWarehouseId === destWarehouseId}>
                  Schedule Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
