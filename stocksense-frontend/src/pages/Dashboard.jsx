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
  Layers,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Sliders,
  RefreshCw,
  LayoutGrid,
  List
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { products, documents, kpis, lowStock, warehouses, ledger, refreshAll, loading } = useInventory();
  
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter documents by warehouse selector if set
  const filteredDocsByWh = useMemo(() => {
    if (selectedWarehouseId === 'all') return documents;
    const whId = Number(selectedWarehouseId);
    return documents.filter(
      d => d.source_warehouse_id === whId || d.dest_warehouse_id === whId
    );
  }, [documents, selectedWarehouseId]);

  // Operations metrics calculation
  const receiptsList = filteredDocsByWh.filter(d => d.type === 'receipt');
  const deliveriesList = filteredDocsByWh.filter(d => d.type === 'delivery');
  const transfersList = filteredDocsByWh.filter(d => d.type === 'transfer');
  const adjustmentsList = filteredDocsByWh.filter(d => d.type === 'adjustment');

  const pendingReceipts = receiptsList.filter(d => d.status !== 'Done' && d.status !== 'Canceled').length;
  const pendingDeliveries = deliveriesList.filter(d => d.status !== 'Done' && d.status !== 'Canceled').length;
  const pendingTransfers = transfersList.filter(d => d.status !== 'Done' && d.status !== 'Canceled').length;
  const pendingAdjustments = adjustmentsList.filter(d => d.status !== 'Done' && d.status !== 'Canceled').length;

  // Pipeline status breakdown (Draft, Waiting, Ready, Done)
  const pipelineCounts = useMemo(() => {
    const counts = { Draft: 0, Waiting: 0, Ready: 0, Done: 0, Canceled: 0 };
    filteredDocsByWh.forEach(d => {
      if (counts[d.status] !== undefined) counts[d.status]++;
    });
    return counts;
  }, [filteredDocsByWh]);

  const filteredDocs = useMemo(() => {
    return filteredDocsByWh.filter(d => {
      if (typeFilter !== 'all' && d.type !== typeFilter) return false;
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const docMatch = (d.doc_number || '').toLowerCase().includes(query);
        const supplierMatch = (d.supplier || '').toLowerCase().includes(query);
        const customerMatch = (d.customer || '').toLowerCase().includes(query);
        if (!docMatch && !supplierMatch && !customerMatch) return false;
      }
      return true;
    });
  }, [filteredDocsByWh, typeFilter, statusFilter, searchQuery]);

  // Chart data: Stock by Product SKU
  const barChartData = products.map(p => ({
    name: p.sku,
    stock: p.stock !== undefined ? p.stock : 0,
    productName: p.name,
  }));

  // Chart data: Stock ledger delta timeline
  const activityData = useMemo(() => {
    if (!ledger || ledger.length === 0) {
      return [
        { time: '09:00', inbound: 150, outbound: 40 },
        { time: '11:00', inbound: 0, outbound: 20 },
        { time: '13:00', inbound: 80, outbound: 15 },
        { time: '15:00', inbound: 25, outbound: 50 },
        { time: '17:00', inbound: 200, outbound: 30 },
      ];
    }
    return ledger.slice(-7).reverse().map(l => ({
      time: l.timestamp ? new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now',
      inbound: l.qty_delta > 0 ? l.qty_delta : 0,
      outbound: l.qty_delta < 0 ? Math.abs(l.qty_delta) : 0,
    }));
  }, [ledger]);

  return (
    <div>
      {/* Top Controls & Warehouse Switcher Bar */}
      <div className="panel" style={{ marginBottom: 20, padding: '16px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
              Inventory Operations Dashboard
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
              Centralized real-time overview of incoming goods, deliveries, internal transfers & stock levels
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {/* Warehouse Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-card-hover)', padding: '6px 14px', borderRadius: 10, border: '1px solid var(--border)' }}>
              <Building2 size={16} className="text-primary" />
              <span style={{ fontSize: 13, fontWeight: 700 }}>Warehouse:</span>
              <select
                value={selectedWarehouseId}
                onChange={e => setSelectedWarehouseId(e.target.value)}
                style={{ background: 'transparent', border: 'none', fontWeight: 700, fontSize: 13, color: 'var(--primary)', cursor: 'pointer', outline: 'none' }}
              >
                <option value="all">All Warehouses & Racks</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            {/* Refresh Live Data Button */}
            <button className="btn-outline btn-sm" onClick={refreshAll} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'spin' : ''} /> {loading ? 'Syncing...' : 'Sync Live DB'}
            </button>

            {/* View Mode Toggle */}
            <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              <button
                className={`btn-ghost btn-sm ${viewMode === 'grid' ? 'text-primary' : ''}`}
                style={{ padding: '6px 12px', background: viewMode === 'grid' ? 'var(--primary-light)' : 'transparent', borderRadius: 0 }}
                onClick={() => setViewMode('grid')}
                title="Cards Grid View"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                className={`btn-ghost btn-sm ${viewMode === 'list' ? 'text-primary' : ''}`}
                style={{ padding: '6px 12px', background: viewMode === 'list' ? 'var(--primary-light)' : 'transparent', borderRadius: 0 }}
                onClick={() => setViewMode('list')}
                title="List View"
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

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
              <strong style={{ fontSize: 14 }}>Low Stock Reorder Alert:</strong>
              <span style={{ fontSize: 13, marginLeft: 6 }}>
                {lowStock.length} product(s) (e.g. {lowStock.map(p => p.name).join(', ')}) are below reorder threshold!
              </span>
            </div>
          </div>
          <Link to="/products" className="btn-outline btn-sm" style={{ background: '#fff' }}>
            Manage Products <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* Dynamic Status Stepper Bar (Draft -> Waiting -> Ready -> Done) */}
      <div className="panel" style={{ marginBottom: 24, padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>Document Workflow Status Pipeline:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="badge draft">Draft ({pipelineCounts.Draft})</span>
              <ArrowRight size={14} color="var(--border)" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="badge waiting">Waiting ({pipelineCounts.Waiting})</span>
              <ArrowRight size={14} color="var(--border)" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="badge ready">Ready ({pipelineCounts.Ready})</span>
              <ArrowRight size={14} color="var(--border)" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="badge done">Done ({pipelineCounts.Done})</span>
            </div>
          </div>
        </div>
      </div>

      {/* CORE EXCALIDRAW / ODOO OPERATIONS CARDS GRID */}
      {viewMode === 'grid' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 24 }}>
          {/* Card 1: Receipts (Incoming Goods) */}
          <div className="panel" style={{ borderTop: '4px solid #10b981', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: '#10b981', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ArrowDownLeft size={20} /> Receipts
                  </h3>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Incoming vendor goods</p>
                </div>
                <span style={{
                  fontSize: 24,
                  fontWeight: 900,
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: '#10b981',
                  padding: '4px 14px',
                  borderRadius: 12
                }}>
                  {pendingReceipts}
                </span>
              </div>

              <div style={{ fontSize: 13, marginBottom: 16 }}>
                <span style={{ fontWeight: 800 }}>{pendingReceipts} TO RECEIVE</span>
                <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
                  {receiptsList.filter(r => r.status === 'Waiting').length} Waiting • {receiptsList.filter(r => r.status === 'Ready').length} Ready to Validate
                </div>
              </div>

              {/* Sample recent receipt preview */}
              {receiptsList.length > 0 && (
                <div style={{ background: 'var(--bg-card-hover)', padding: 10, borderRadius: 8, fontSize: 12, marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, fontFamily: 'monospace' }}>{receiptsList[0].doc_number}</div>
                  <div style={{ color: 'var(--text-muted)' }}>Supplier: {receiptsList[0].supplier || 'Global Vendor'}</div>
                </div>
              )}
            </div>

            <Link to="/operations/receipts" className="btn-primary" style={{ width: '100%', justifyContent: 'center', background: '#10b981', borderColor: '#10b981' }}>
              Process Receipts →
            </Link>
          </div>

          {/* Card 2: Delivery Orders (Outgoing Goods) */}
          <div className="panel" style={{ borderTop: '4px solid #4f46e5', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ArrowUpRight size={20} /> Delivery Orders
                  </h3>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Outgoing customer shipments</p>
                </div>
                <span style={{
                  fontSize: 24,
                  fontWeight: 900,
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  padding: '4px 14px',
                  borderRadius: 12
                }}>
                  {pendingDeliveries}
                </span>
              </div>

              <div style={{ fontSize: 13, marginBottom: 16 }}>
                <span style={{ fontWeight: 800 }}>{pendingDeliveries} TO DELIVER</span>
                <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
                  {deliveriesList.filter(d => d.status === 'Ready').length} Ready to Dispatch • {deliveriesList.filter(d => d.status === 'Done').length} Dispatched
                </div>
              </div>

              {/* Sample recent delivery preview */}
              {deliveriesList.length > 0 && (
                <div style={{ background: 'var(--bg-card-hover)', padding: 10, borderRadius: 8, fontSize: 12, marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, fontFamily: 'monospace' }}>{deliveriesList[0].doc_number}</div>
                  <div style={{ color: 'var(--text-muted)' }}>Customer: {deliveriesList[0].customer || 'Tech Client'}</div>
                </div>
              )}
            </div>

            <Link to="/operations/delivery" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              Process Deliveries →
            </Link>
          </div>

          {/* Card 3: Internal Transfers */}
          <div className="panel" style={{ borderTop: '4px solid #f59e0b', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Repeat size={20} /> Internal Transfers
                  </h3>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Inter-warehouse movements</p>
                </div>
                <span style={{
                  fontSize: 24,
                  fontWeight: 900,
                  background: 'rgba(245, 158, 11, 0.1)',
                  color: '#f59e0b',
                  padding: '4px 14px',
                  borderRadius: 12
                }}>
                  {pendingTransfers}
                </span>
              </div>

              <div style={{ fontSize: 13, marginBottom: 16 }}>
                <span style={{ fontWeight: 800 }}>{pendingTransfers} TO MOVE</span>
                <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
                  Main Store → Production Rack movements
                </div>
              </div>

              {/* Sample transfer preview */}
              {transfersList.length > 0 && (
                <div style={{ background: 'var(--bg-card-hover)', padding: 10, borderRadius: 8, fontSize: 12, marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, fontFamily: 'monospace' }}>{transfersList[0].doc_number}</div>
                  <div style={{ color: 'var(--text-muted)' }}>{transfersList[0].source_warehouse_name} → {transfersList[0].dest_warehouse_name}</div>
                </div>
              )}
            </div>

            <Link to="/operations/transfers" className="btn-primary" style={{ width: '100%', justifyContent: 'center', background: '#f59e0b', borderColor: '#f59e0b' }}>
              Process Transfers →
            </Link>
          </div>

          {/* Card 4: Physical Stock Adjustments */}
          <div className="panel" style={{ borderTop: '4px solid #8b5cf6', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Sliders size={20} /> Stock Adjustments
                  </h3>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Physical audit count fixes</p>
                </div>
                <span style={{
                  fontSize: 24,
                  fontWeight: 900,
                  background: 'rgba(139, 92, 246, 0.1)',
                  color: '#8b5cf6',
                  padding: '4px 14px',
                  borderRadius: 12
                }}>
                  {pendingAdjustments}
                </span>
              </div>

              <div style={{ fontSize: 13, marginBottom: 16 }}>
                <span style={{ fontWeight: 800 }}>{pendingAdjustments} PENDING RECONCILE</span>
                <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
                  Fix mismatches between system & counted stock
                </div>
              </div>

              {/* Sample adjustment preview */}
              {adjustmentsList.length > 0 && (
                <div style={{ background: 'var(--bg-card-hover)', padding: 10, borderRadius: 8, fontSize: 12, marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, fontFamily: 'monospace' }}>{adjustmentsList[0].doc_number}</div>
                  <div style={{ color: 'var(--text-muted)' }}>Reason: {adjustmentsList[0].reason || 'Physical count'}</div>
                </div>
              )}
            </div>

            <Link to="/operations/adjustments" className="btn-primary" style={{ width: '100%', justifyContent: 'center', background: '#8b5cf6', borderColor: '#8b5cf6' }}>
              Reconcile Stock →
            </Link>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        <KpiCard label="Total Stock Units" value={(kpis.totalStockUnits || 0).toLocaleString()} icon={Package} trend="Live SQLite state" />
        <KpiCard
          label="Low / Out of Stock"
          value={kpis.lowOrOutOfStockTotal !== undefined ? kpis.lowOrOutOfStockTotal : lowStock.length}
          tone={kpis.lowOrOutOfStockTotal > 0 ? 'warn' : 'success'}
          icon={AlertTriangle}
        />
        <KpiCard label="Pending Receipts" value={pendingReceipts} icon={ArrowDownLeft} />
        <KpiCard label="Pending Deliveries" value={pendingDeliveries} icon={ArrowUpRight} />
        <KpiCard label="Internal Transfers" value={pendingTransfers} icon={Repeat} />
      </div>

      {/* Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24, marginBottom: 24 }}>
        <div className="panel" style={{ marginBottom: 0 }}>
          <div className="panel-header">
            <div className="panel-title">
              <Package size={18} className="text-primary" />
              Stock Availability by SKU
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Real-time SQLite database state</span>
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
              Inbound vs Outbound Stock Movements
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Stock ledger audit delta</span>
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

      {/* Operations Document Operations Table */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <Layers size={18} />
            Document Operations Log
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
              placeholder="Search doc #, supplier, customer..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 38 }}
            />
          </div>

          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="all">All Document Types</option>
            <option value="receipt">Receipts (Goods In)</option>
            <option value="delivery">Delivery Orders</option>
            <option value="transfer">Internal Transfers</option>
            <option value="adjustment">Stock Adjustments</option>
          </select>

          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            {['Draft', 'Waiting', 'Ready', 'Done', 'Canceled'].map(s => (
              <option key={s} value={s}>{s}</option>
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
                    <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{d.doc_number}</td>
                    <td>
                      <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{d.type}</span>
                    </td>
                    <td>{d.supplier || d.customer || (d.reason ? `Note: ${d.reason}` : 'Internal Move')}</td>
                    <td>
                      <StatusBadge status={d.status} />
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                      {d.created_at ? new Date(d.created_at).toLocaleString() : 'Just now'}
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
