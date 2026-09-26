import { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';
import { useInventory } from '../context/InventoryContext';
import KpiCard from '../components/KpiCard';
import StatusBadge from '../components/StatusBadge';
import {
  Package,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Repeat,
  Search,
  Filter,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { products, documents, totalStock, lowStock, warehouses, ledger } = useInventory();
  
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const pending = (type) =>
    documents.filter(d => d.type === type && d.status !== 'Done' && d.status !== 'Canceled').length;

  const filteredDocs = useMemo(() => {
    return documents.filter(d => {
      if (typeFilter !== 'all' && d.type !== typeFilter) return false;
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;
      if (
        warehouseFilter !== 'all' &&
        d.warehouseId !== warehouseFilter &&
        d.sourceWarehouseId !== warehouseFilter
      )
        return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const docMatch = d.id.toLowerCase().includes(query);
        const supplierMatch = d.supplier?.toLowerCase().includes(query);
        const customerMatch = d.customer?.toLowerCase().includes(query);
        if (!docMatch && !supplierMatch && !customerMatch) return false;
      }
      return true;
    });
  }, [documents, typeFilter, statusFilter, warehouseFilter, searchQuery]);

  // Chart 1: Stock by Product SKU
  const barChartData = products.map(p => ({
    name: p.sku,
    stock: Object.values(p.stock).reduce((a, b) => a + b, 0),
    productName: p.name,
  }));

  // Chart 2: Ledger Movements timeline simulation
  const activityData = useMemo(() => {
    if (ledger.length === 0) {
      return [
        { time: '09:00', inbound: 150, outbound: 40 },
        { time: '11:00', inbound: 0, outbound: 20 },
        { time: '13:00', inbound: 80, outbound: 15 },
        { time: '15:00', inbound: 25, outbound: 50 },
        { time: '17:00', inbound: 200, outbound: 30 },
      ];
    }
    return ledger.slice(-7).map((l, index) => ({
      time: new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      inbound: l.qtyDelta > 0 ? l.qtyDelta : 0,
      outbound: l.qtyDelta < 0 ? Math.abs(l.qtyDelta) : 0,
    }));
  }, [ledger]);

  return (
    <div>
      {/* Low Stock Alert Banner */}
      {lowStock.length > 0 && (
        <div style={{
          background: 'var(--warning-light)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          color: 'var(--warning-text)',
          borderRadius: 'var(--radius-lg)',
          padding: '14px 20px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <AlertTriangle size={20} />
            <div>
              <strong style={{ fontSize: 14 }}>Stock Threshold Warning:</strong>
              <span style={{ fontSize: 13, marginLeft: 6 }}>
                {lowStock.length} product(s) (e.g. {lowStock.map(p => p.name).join(', ')}) are running low on stock!
              </span>
            </div>
          </div>
          <Link to="/products" className="btn-outline btn-sm" style={{ background: '#fff' }}>
            View Products <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        <KpiCard label="Total Stock Units" value={totalStock.toLocaleString()} icon={Package} trend="+5% this week" />
        <KpiCard
          label="Low / Out of Stock"
          value={lowStock.length}
          tone={lowStock.length > 0 ? 'warn' : 'success'}
          icon={AlertTriangle}
        />
        <KpiCard label="Pending Receipts" value={pending('Receipt')} icon={ArrowDownLeft} />
        <KpiCard label="Pending Deliveries" value={pending('Delivery')} icon={ArrowUpRight} />
        <KpiCard label="Internal Transfers" value={pending('Internal')} icon={Repeat} />
      </div>

      {/* Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24, marginBottom: 24 }}>
        <div className="panel" style={{ marginBottom: 0 }}>
          <div className="panel-header">
            <div className="panel-title">
              <Package size={18} className="text-primary" />
              Stock Availability by SKU
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Real-time inventory levels</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={barChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="name" fontSize={12} stroke="var(--text-muted)" />
              <YAxis fontSize={12} stroke="var(--text-muted)" />
              <Tooltip
                contentStyle={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', borderRadius: 8 }}
                formatter={(val, name, item) => [`${val} units`, item.payload.productName]}
              />
              <Bar dataKey="stock" fill="var(--primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="panel" style={{ marginBottom: 0 }}>
          <div className="panel-header">
            <div className="panel-title">
              <Layers size={18} className="text-primary" />
              Inbound vs Outbound Movements
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Stock ledger delta flow</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="time" fontSize={12} stroke="var(--text-muted)" />
              <YAxis fontSize={12} stroke="var(--text-muted)" />
              <Tooltip contentStyle={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', borderRadius: 8 }} />
              <Area type="monotone" dataKey="inbound" name="Goods In (+)" stroke="#10b981" fill="#10b98122" />
              <Area type="monotone" dataKey="outbound" name="Goods Out (-)" stroke="#ef4444" fill="#ef444422" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <Layers size={18} />
            Recent Document Operations
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link to="/operations/receipts" className="btn-outline btn-sm">+ Receipt</Link>
            <Link to="/operations/delivery" className="btn-outline btn-sm">+ Delivery</Link>
          </div>
        </div>

        {/* Filter & Search Controls */}
        <div className="filter-bar">
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search document ID, supplier, customer..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 38 }}
            />
          </div>

          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="all">All Document Types</option>
            <option value="Receipt">Receipts (Goods In)</option>
            <option value="Delivery">Delivery Orders</option>
            <option value="Internal">Internal Transfers</option>
            <option value="Adjustment">Stock Adjustments</option>
          </select>

          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            {['Draft', 'Waiting', 'Ready', 'Done', 'Canceled'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select value={warehouseFilter} onChange={e => setWarehouseFilter(e.target.value)}>
            <option value="all">All Warehouses</option>
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>

        {/* Table View */}
        <div className="table-wrapper">
          {filteredDocs.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              No document operations match your filters.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Doc #</th>
                  <th>Type</th>
                  <th>Entity / Details</th>
                  <th>Status</th>
                  <th>Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.map(d => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{d.id}</td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{d.type}</span>
                    </td>
                    <td>{d.supplier || d.customer || (d.reason ? `Reason: ${d.reason}` : 'Internal Transfer')}</td>
                    <td>
                      <StatusBadge status={d.status} />
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                      {new Date(d.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
