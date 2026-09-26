import { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import StatusBadge from '../components/StatusBadge';
import { ArrowUpRight, Plus, X, CheckCircle2, Trash2, Building2 } from 'lucide-react';

export default function Delivery() {
  const { products, warehouses, documents, createDocument, validateDocument } = useInventory();
  const [showModal, setShowModal] = useState(false);
  const [customer, setCustomer] = useState('');
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || 1);
  const [lines, setLines] = useState([{ product_id: products[0]?.id || 1, quantity: 5 }]);

  const deliveries = documents.filter(d => d.type === 'delivery');

  function updateLine(i, field, value) {
    setLines(prev => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));
  }

  function addLine() {
    setLines(prev => [...prev, { product_id: products[0]?.id || 1, quantity: 5 }]);
  }

  function removeLine(i) {
    if (lines.length === 1) return;
    setLines(prev => prev.filter((_, idx) => idx !== i));
  }

  async function handleCreateDelivery(e) {
    e.preventDefault();
    if (!customer) return;
    try {
      await createDocument({
        type: 'delivery',
        customer,
        source_warehouse_id: Number(warehouseId),
        status: 'Ready',
        items: lines.map(l => ({ product_id: Number(l.product_id), quantity: Number(l.quantity) }))
      });
      setCustomer('');
      setLines([{ product_id: products[0]?.id || 1, quantity: 5 }]);
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
              <ArrowUpRight size={22} className="text-primary" /> Delivery Orders (Outgoing Goods)
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
              Dispatch items from warehouse locations for customer shipments or outgoing orders
            </p>
          </div>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> New Delivery Order
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Delivery Doc #</th>
                <th>Customer / Client</th>
                <th>Source Warehouse</th>
                <th>Status</th>
                <th>Items to Deliver</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map(d => (
                <tr key={d.id}>
                  <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{d.doc_number}</td>
                  <td style={{ fontWeight: 600 }}>{d.customer || 'N/A'}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Building2 size={14} color="var(--text-muted)" />
                      {d.source_warehouse_name || 'Main Warehouse'}
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
                        <CheckCircle2 size={14} /> Validate & Deduct Stock
                      </button>
                    ) : (
                      <span style={{ color: 'var(--success-text)', fontSize: 13, fontWeight: 700 }}>
                        Validated & Dispatched
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {deliveries.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    No delivery orders created yet.
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
              <div className="modal-title">Create Outgoing Delivery Order</div>
              <button className="btn-ghost" style={{ padding: 4 }} onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateDelivery}>
              <div className="row-line">
                <div>
                  <label>Customer / Destination Name</label>
                  <input
                    value={customer}
                    onChange={e => setCustomer(e.target.value)}
                    placeholder="TechHub Solutions Ltd"
                    required
                  />
                </div>
                <div>
                  <label>Source Warehouse</label>
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
                Products to Pick & Pack
              </div>

              {lines.map((l, i) => (
                <div className="row-line" key={i}>
                  <div>
                    <select value={l.product_id} onChange={e => updateLine(i, 'product_id', e.target.value)}>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Stock: {p.stock || 0} {p.uom})
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
                  Create Delivery Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
