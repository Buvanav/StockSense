import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import EmailDrawer from '../components/EmailDrawer';

const titles = {
  '/dashboard': 'Inventory Overview',
  '/products': 'Product Catalog & Stock Levels',
  '/operations/receipts': 'Stock Receipts (Goods In)',
  '/operations/delivery': 'Delivery Orders (Goods Out)',
  '/operations/transfers': 'Internal Transfers',
  '/operations/adjustments': 'Physical Stock Adjustments',
  '/operations/history': 'Stock Movement Ledger',
  '/settings': 'Warehouse & Location Settings',
  '/profile': 'User Profile & Security',
};

export default function MainLayout() {
  const { pathname } = useLocation();

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <Topbar title={titles[pathname] || 'StockSense IMS'} />
        <div className="content">
          <Outlet />
        </div>
      </div>
      <EmailDrawer />
    </div>
  );
}
