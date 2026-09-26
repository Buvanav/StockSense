import { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import StatusBadge from '../components/StatusBadge';
import { RefreshCw, Plus, X, CheckCircle2, ArrowRight } from 'lucide-react';

export default function Transfers() {
  const { products, warehouses, documents, createDocument, validateDocument } = useInventory();
  const [showModal, setShowModal] = useState(false);
  const [srcWh, setSrcWh] = useState(warehouses[0]?.id || 1);
  const [dstWh, setDstWh] = useState(warehouses[1]?.id || 2);
  const [productId, setProductId] = useState(products[0]?.id || 1);
  const [qty, setQty] = useState('20');
  const [reason, setReason] = useState('Production replenishment');

  const transfers = documents.filter(d => d.type === 'transfer');

  async function handleCreateTransfer(e) {
    e.preventDefault();
    if (srcWh === dstWh) {
      alert('Source and destination warehouses must be different!');
      return;
    }
    try {
      await createDocument({
        type: 'transfer',
        source_warehouse_id: Number(srcWh),
        dest_warehouse_id: Number(dstWh),
        reason,
        status: 'Waiting',
        items: [{ product_id: Number(productId), quantity: Number(qty) }]
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
              <RefreshCw size={22} className="text-primary" /> Internal Stock Transfers
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
              Move stock between warehouses, production racks, or shelf locations inside the business
            </p>
          </div>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> New Internal Transfer
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Transfer Doc #</th>
                <th>Movement Path</th>
                <th>Reason / Note</th>
                <th>Status</th>
                <th>Transfer Items</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map(d => (
                <tr key={d.id}>
                  <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{d.doc_number}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                      <span>{d.source_warehouse_name}</span>
                      <ArrowRight size={14} color="var(--primary)" />
                      <span className="text-primary">{d.dest_warehouse_name}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{d.reason || 'General move'}</td>
                  <td>
                    <StatusBadge status={d.status} />
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {d.items && d.items.length > 0 ? (
                      d.items.map(l => `${l.product_name} (${l.quantity} ${l.product_uom || ''})`).join(', ')
                    ) : (
                      'No line items'
                    )}
                  </td>
                  <td>
                    {d.status !== 'Done' ? (
                      <button className="btn-primary btn-sm" onClick={() => handleValidate(d.id)}>
                        <CheckCircle2 size={14} /> Validate Transfer
                      </button>
                    ) : (
                      <span style={{ color: 'var(--success-text)', fontSize: 13, fontWeight: 700 }}>
                        Move Executed & Logged
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {transfers.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    No internal transfers scheduled yet.
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
              <div className="modal-title">Schedule Internal Transfer</div>
              <button className="btn-ghost" style={{ padding: 4 }} onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTransfer}>
              <div className="row-line">
                <div>
                  <label>From Source Location</label>
                  <select value={srcWh} onChange={e => setSrcWh(e.target.value)}>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>To Target Location</label>
                  <select value={dstWh} onChange={e => setDstWh(e.target.value)}>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="row-line" style={{ marginTop: 12 }}>
                <div>
                  <label>Select Product</label>
                  <select value={productId} onChange={e => setProductId(e.target.value)}>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ maxWidth: 120 }}>
                  <label>Quantity</label>
                  <input
                    type="number"
                    value={qty}
                    onChange={e => setQty(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <label>Transfer Purpose / Reason</label>
                <input
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="e.g. Move from Main Store to Production Rack"
                  required
                />
              </div>

              <div className="modal-actions" style={{ marginTop: 20 }}>
                <button type="button" className="btn-outline" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
