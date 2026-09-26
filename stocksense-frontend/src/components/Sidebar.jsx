import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ArrowDownLeft,
  ArrowUpRight,
  Repeat,
  SlidersHorizontal,
  History,
  Settings,
  User,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const linkClass = ({ isActive }) => (isActive ? 'active' : '');

  return (
    <div className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">
          <Package size={22} />
        </div>
        <div>
          <div className="brand-name">StockSense</div>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>v1.0 • Enterprise IMS</div>
        </div>
      </div>

      <nav>
        <NavLink to="/dashboard" className={linkClass}>
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink to="/products" className={linkClass}>
          <Package size={18} />
          <span>Product Catalog</span>
        </NavLink>

        <div className="section-label">Operations</div>

        <NavLink to="/operations/receipts" className={linkClass}>
          <ArrowDownLeft size={18} />
          <span>Receipts (Goods In)</span>
        </NavLink>

        <NavLink to="/operations/delivery" className={linkClass}>
          <ArrowUpRight size={18} />
          <span>Delivery Orders</span>
        </NavLink>

        <NavLink to="/operations/transfers" className={linkClass}>
          <Repeat size={18} />
          <span>Internal Transfers</span>
        </NavLink>

        <NavLink to="/operations/adjustments" className={linkClass}>
          <SlidersHorizontal size={18} />
          <span>Stock Adjustments</span>
        </NavLink>

        <NavLink to="/operations/history" className={linkClass}>
          <History size={18} />
          <span>Stock Ledger (History)</span>
        </NavLink>

        <div className="section-label">System & Settings</div>

        <NavLink to="/settings" className={linkClass}>
          <Settings size={18} />
          <span>Warehouses & Config</span>
        </NavLink>

        <NavLink to="/profile" className={linkClass}>
          <User size={18} />
          <span>My Profile</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={14} color="#10b981" /> {user?.role || 'Inventory Manager'}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user?.email}
          </div>
        </div>

        <button
          type="button"
          className="btn-ghost"
          style={{ width: '100%', justifyContent: 'flex-start', color: '#94a3b8' }}
          onClick={logout}
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </div>
  );
}
