import { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import StatusBadge from '../components/StatusBadge';
import { ArrowDownLeft, Plus, X, CheckCircle2, Trash2, Building2 } from 'lucide-react';

export default function Receipts() {
  const { products, warehouses, documents, createDocument, updateDocumentStatus, applyStockChange } = useInventory();
  const [showModal, setShowModal] = useState(false);
  const [supplier, setSupplier] = useState('');
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || 'wh1');
  const [lines, setLines] = useState([{ productId: products[0]?.id || 'p1', qty: '10' }]);

  const receipts = documents.filter(d => d.type === 'Receipt');

  function updateLine(i, field, value) {
    setLines(prev => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));
  }

  function addLine() {
    setLines(prev => [...prev, { productId: products[0]?.id || 'p1', qty: '10' }]);
  }

  function removeLine(i) {
    if (lines.length === 1) return;
    setLines(prev => prev.filter((_, idx) => idx !== i));
  }

  function createReceipt(e) {
    e.preventDefault();
    if (!supplier) return;
    createDocument({
      type: 'Receipt',
      supplier,
      warehouseId,
      lines: lines.filter(l => Number(l.qty) > 0),
    });
    setSupplier('');
    setLines([{ productId: products[0]?.id || 'p1', qty: '10' }]);
    setShowModal(false);
  }

  function validate(doc) {
    doc.lines.forEach(l => applyStockChange(l.productId, doc.warehouseId, Number(l.qty), doc.id));
    updateDocumentStatus(doc.id, 'Done');
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
                  <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{d.id}</td>
                  <td style={{ fontWeight: 600 }}>{d.supplier}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Building2 size={14} color="var(--text-muted)" />
                      {warehouses.find(w => w.id === d.warehouseId)?.name}
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={d.status} />
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {d.lines.map(l => {
                      const pName = products.find(p => p.id === l.productId)?.name;
                      return `${pName} (${l.qty})`;
                    }).join(', ')}
                  </td>
                  <td>
                    {d.status !== 'Done' ? (
                      <button className="btn-primary btn-sm" onClick={() => validate(d)}>
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

            <form onSubmit={createReceipt}>
              <div className="row-line">
                <div>
                  <label>Supplier Vendor Name</label>
                  <input
                    value={supplier}
                    onChange={e => setSupplier(e.target.value)}
                    placeholder="Acme Industrial Supplies"
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
                    <select value={l.productId} onChange={e => updateLine(i, 'productId', e.target.value)}>
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
                      value={l.qty}
                      onChange={e => updateLine(i, 'qty', e.target.value)}
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
                  Create Draft Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
