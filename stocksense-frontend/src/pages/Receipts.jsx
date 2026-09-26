import { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import StatusBadge from '../components/StatusBadge';
import { ArrowDownLeft, Plus, X, CheckCircle2, Trash2, Building2 } from 'lucide-react';

export default function Receipts() {
  const { products, warehouses, documents, createDocument, validateDocument } = useInventory();
  const [showModal, setShowModal] = useState(false);
  const [supplier, setSupplier] = useState('');
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || 1);
  const [lines, setLines] = useState([{ product_id: products[0]?.id || 1, quantity: 10 }]);

  const receipts = documents.filter(d => d.type === 'receipt');

  function updateLine(i, field, value) {
    setLines(prev => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));
  }

  function addLine() {
    setLines(prev => [...prev, { product_id: products[0]?.id || 1, quantity: 10 }]);
  }

  function removeLine(i) {
    if (lines.length === 1) return;
    setLines(prev => prev.filter((_, idx) => idx !== i));
  }

  async function handleCreateReceipt(e) {
    e.preventDefault();
    if (!supplier) return;
    try {
      await createDocument({
        type: 'receipt',
        supplier,
        dest_warehouse_id: Number(warehouseId),
        status: 'Waiting',
        items: lines.map(l => ({ product_id: Number(l.product_id), quantity: Number(l.quantity) }))
      });
      setSupplier('');
      setLines([{ product_id: products[0]?.id || 1, quantity: 10 }]);
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
              <ArrowDownLeft size={22} className="text-primary" /> Stock Receipts (Goods In)
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
              Receive incoming stock shipments from vendors into warehouse locations
            </p>
          </div>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> New Receipt
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Receipt Doc #</th>
                <th>Supplier / Vendor</th>
                <th>Receiving Warehouse</th>
                <th>Status</th>
                <th>Line Items</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map(d => (
                <tr key={d.id}>
                  <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{d.doc_number}</td>
                  <td style={{ fontWeight: 600 }}>{d.supplier || 'N/A'}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Building2 size={14} color="var(--text-muted)" />
                      {d.dest_warehouse_name || 'Main Warehouse'}
                    </div>
                  </td>
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
                        <CheckCircle2 size={14} /> Validate & Add Stock
                      </button>
                    ) : (
                      <span style={{ color: 'var(--success-text)', fontSize: 13, fontWeight: 700 }}>
                        Validated & Logged
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {receipts.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    No receipt orders created yet.
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
              <div className="modal-title">Create Goods Receipt</div>
              <button className="btn-ghost" style={{ padding: 4 }} onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateReceipt}>
              <div className="row-line">
                <div>
                  <label>Supplier Vendor Name</label>
                  <input
                    value={supplier}
                    onChange={e => setSupplier(e.target.value)}
                    placeholder="Apex Steel Supplies"
                    required
                  />
                </div>
                <div>
                  <label>Target Warehouse</label>
                  <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginTop: 14, marginBottom: 8, fontWeight: 700, fontSize: 13, color: 'var(--text-muted)' }}>
                Received Line Items
              </div>

              {lines.map((l, i) => (
                <div className="row-line" key={i}>
                  <div>
                    <select value={l.product_id} onChange={e => updateLine(i, 'product_id', e.target.value)}>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ maxWidth: 120 }}>
                    <input
                      type="number"
                      placeholder="Qty"
                      value={l.quantity}
                      onChange={e => updateLine(i, 'quantity', e.target.value)}
                      required
                    />
                  </div>
                  {lines.length > 1 && (
                    <button type="button" className="btn-ghost" onClick={() => removeLine(i)} style={{ color: 'var(--danger-text)' }}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                className="btn-outline btn-sm"
                onClick={addLine}
                style={{ marginBottom: 16 }}
              >
                + Add Another Product Line
              </button>

              <div className="modal-actions">
                <button type="button" className="btn-outline" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Receipt Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
