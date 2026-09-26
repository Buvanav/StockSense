import { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Package, Plus, Search, AlertTriangle, Sparkles, X, Building2 } from 'lucide-react';

export default function Products() {
  const { products, warehouses, addProduct } = useInventory();
  
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const [form, setForm] = useState({
    name: '',
    sku: '',
    category: 'Finished Goods',
    uom: 'pcs',
    initialStock: '',
    initialWarehouse: warehouses[0]?.id || 1,
  });

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set(products.map(p => p.category));
    return Array.from(set);
  }, [products]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const nameMatch = p.name.toLowerCase().includes(query);
        const skuMatch = p.sku.toLowerCase().includes(query);
        const catMatch = p.category.toLowerCase().includes(query);
        if (!nameMatch && !skuMatch && !catMatch) return false;
      }
      return true;
    });
  }, [products, selectedCategory, searchQuery]);

  const generateRandomSku = () => {
    const random = Math.floor(100 + Math.random() * 900);
    const prefix = form.name ? form.name.substring(0, 3).toUpperCase() : 'SKU';
    setForm(prev => ({ ...prev, sku: `${prefix}-${random}` }));
  };

  async function submit(e) {
    e.preventDefault();
    if (!form.name || !form.sku) return;
    try {
      await addProduct({
        name: form.name,
        sku: form.sku,
        category: form.category || 'General',
        uom: form.uom,
        initial_stock: form.initialStock ? Number(form.initialStock) : 0,
        warehouse_id: Number(form.initialWarehouse),
      });
      setForm({
        name: '',
        sku: '',
        category: 'Finished Goods',
        uom: 'pcs',
        initialStock: '',
        initialWarehouse: warehouses[0]?.id || 1,
      });
      setShowModal(false);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div>
      <div className="panel" style={{ marginBottom: 20, padding: '18px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800 }}>Product Catalog</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
              Manage master stock list, SKU codes, units of measure & warehouse allocations
            </p>
          </div>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> New Product
          </button>
        </div>
      </div>

      {/* Filter & Search Panel */}
      <div className="panel">
        <div className="filter-bar" style={{ marginBottom: 0 }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by Product Name, SKU, or Category..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 38 }}
            />
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              className={`btn-sm ${selectedCategory === 'all' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setSelectedCategory('all')}
            >
              All Categories ({products.length})
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                className={`btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table Panel */}
      <div className="panel">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Product Name</th>
                <th>SKU / Code</th>
                <th>Category</th>
                <th>UoM</th>
                {warehouses.map(w => (
                  <th key={w.id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Building2 size={12} /> {w.name}
                    </div>
                  </th>
                ))}
                <th>Total Available</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(p => {
                const total = p.stock !== undefined ? p.stock : 0;
                const isLow = total <= (p.reorder_level || 10);

                return (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 700 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: 'var(--primary-light)',
                          color: 'var(--primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Package size={16} />
                        </div>
                        {p.name}
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-muted)' }}>{p.sku}</td>
                    <td>
                      <span className="badge draft">{p.category}</span>
                    </td>
                    <td>{p.uom}</td>
                    {warehouses.map(w => {
                      const qtyInLocation = p.locations ? (p.locations[w.name] || 0) : 0;
                      return (
                        <td key={w.id} style={{ fontWeight: 600 }}>
                          {qtyInLocation}
                        </td>
                      );
                    })}
                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontWeight: 800,
                        padding: '4px 10px',
                        borderRadius: 99,
                        background: isLow ? 'var(--warning-light)' : 'var(--success-light)',
                        color: isLow ? 'var(--warning-text)' : 'var(--success-text)',
                        border: isLow ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(16,185,129,0.3)'
                      }}>
                        {isLow && <AlertTriangle size={12} />}
                        {total} {p.uom}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={5 + warehouses.length} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    No products found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Product Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Create New Product</div>
              <button className="btn-ghost" style={{ padding: 4 }} onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submit}>
              <div className="field">
                <label>Product Name</label>
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Copper Wire Coils 10m"
                  required
                />
              </div>

              <div className="row-line">
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label>SKU / Code</label>
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ fontSize: 11, padding: 2, color: 'var(--primary)' }}
                      onClick={generateRandomSku}
                    >
                      <Sparkles size={12} /> Auto Generate
                    </button>
                  </div>
                  <input
                    value={form.sku}
                    onChange={e => setForm({ ...form, sku: e.target.value })}
                    placeholder="SKU-001"
                    required
                  />
                </div>
                <div>
                  <label>Unit of Measure (UoM)</label>
                  <input
                    value={form.uom}
                    onChange={e => setForm({ ...form, uom: e.target.value })}
                    placeholder="pcs, kg, box, meters"
                    required
                  />
                </div>
              </div>

              <div className="field">
                <label>Product Category</label>
                <input
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  placeholder="Raw Material, Finished Goods, Packaging..."
                />
              </div>

              <div className="row-line">
                <div>
                  <label>Initial Opening Stock (optional)</label>
                  <input
                    type="number"
                    value={form.initialStock}
                    onChange={e => setForm({ ...form, initialStock: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label>Initial Warehouse Location</label>
                  <select
                    value={form.initialWarehouse}
                    onChange={e => setForm({ ...form, initialWarehouse: e.target.value })}
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-outline" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
