import { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import StatusBadge from '../components/StatusBadge';
import { ArrowUpRight, Plus, X, CheckCircle2, PackageCheck, Building2 } from 'lucide-react';

export default function Delivery() {
  const { products, warehouses, documents, createDocument, updateDocumentStatus, applyStockChange } = useInventory();
  const [showModal, setShowModal] = useState(false);
  const [customer, setCustomer] = useState('');
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || 'wh1');
  const [lines, setLines] = useState([{ productId: products[0]?.id || 'p1', qty: '5' }]);

  const deliveries = documents.filter(d => d.type === 'Delivery');

  function updateLine(i, field, value) {
    setLines(prev => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));
  }

  function addLine() {
    setLines(prev => [...prev, { productId: products[0]?.id || 'p1', qty: '5' }]);
  }

  function createDelivery(e) {
    e.preventDefault();
    if (!customer) return;
    createDocument({
      type: 'Delivery',
      customer,
      warehouseId,
      lines: lines.filter(l => Number(l.qty) > 0),
      status: 'Waiting',
    });
    setCustomer('');
    setLines([{ productId: products[0]?.id || 'p1', qty: '5' }]);
    setShowModal(false);
  }

  function advance(doc) {
    if (doc.status === 'Waiting') {
      updateDocumentStatus(doc.id, 'Ready');
    } else if (doc.status === 'Ready') {
      doc.lines.forEach(l => applyStockChange(l.productId, doc.warehouseId, -Number(l.qty), doc.id));
      updateDocumentStatus(doc.id, 'Done');
    }
  }

  return (
    <div>
      <div className="panel" style={{ marginBottom: 20, padding: '18px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ArrowUpRight size={22} className="text-primary" /> Delivery Orders (Goods Out)
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
              Pick, pack, ship goods out to customers and record outgoing inventory deductions
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
                <th>Doc #</th>
                <th>Customer Name</th>
                <th>Source Warehouse</th>
                <th>Status</th>
                <th>Items Ordered</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map(d => (
                <tr key={d.id}>
                  <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{d.id}</td>
                  <td style={{ fontWeight: 600 }}>{d.customer}</td>
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
                      return `${pName} (x${l.qty})`;
                    }).join(', ')}
                  </td>
                  <td>
                    {d.status === 'Waiting' && (
                      <button className="btn-outline btn-sm" onClick={() => advance(d)}>
                        <PackageCheck size={14} /> Mark Picked / Packed
                      </button>
                    )}
                    {d.status === 'Ready' && (
                      <button className="btn-primary btn-sm" onClick={() => advance(d)}>
                        <CheckCircle2 size={14} /> Validate & Deduct Stock
                      </button>
                    )}
                    {d.status === 'Done' && (
                      <span style={{ color: 'var(--success-text)', fontSize: 13, fontWeight: 700 }}>
                        Dispatched & Shipped
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {deliveries.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    No delivery orders scheduled yet.
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
              <div className="modal-title">Create Delivery Order</div>
              <button className="btn-ghost" style={{ padding: 4 }} onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={createDelivery}>
              <div className="row-line">
                <div>
                  <label>Customer Name / Destination</label>
                  <input
                    value={customer}
                    onChange={e => setCustomer(e.target.value)}
                    placeholder="Global Corp Logistics"
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
                Products to Ship
              </div>

              {lines.map((l, i) => (
                <div className="row-line" key={i}>
                  <div>
                    <select value={l.productId} onChange={e => updateLine(i, 'productId', e.target.value)}>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Avail: {p.stock[warehouseId] || 0} {p.uom})
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
