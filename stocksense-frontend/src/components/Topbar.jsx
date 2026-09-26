import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sun, Moon, Bell, LogOut, User, ShieldCheck } from 'lucide-react';

export default function Topbar({ title }) {
  const { user, logout, darkMode, toggleDarkMode, emails } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';

  return (
    <div className="topbar">
      <div className="topbar-title-group">
        <h1>{title}</h1>
      </div>

      <div className="topbar-actions">
        {/* Dark Mode Toggle */}
        <button
          className="btn-outline btn-sm"
          style={{ width: 36, height: 36, padding: 0 }}
          onClick={toggleDarkMode}
          title="Toggle Dark / Light Theme"
        >
          {darkMode ? <Sun size={18} color="#f59e0b" /> : <Moon size={18} />}
        </button>

        {/* Email Inbox Bell Indicator */}
        <div style={{ position: 'relative' }}>
          <button className="btn-outline btn-sm" style={{ width: 36, height: 36, padding: 0 }} title="Simulated Email Inbox">
            <Bell size={18} />
          </button>
          {emails.length > 0 && (
            <span style={{
              position: 'absolute',
              top: -2,
              right: -2,
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: '#ef4444',
              color: '#fff',
              fontSize: 10,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {emails.length}
            </span>
          )}
        </div>

        {/* User Pill */}
        <Link to="/profile" className="user-badge">
          <div className="user-avatar">{initials}</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2 }}>
              {user?.name || user?.email}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {user?.role || 'User'}
            </span>
          </div>
        </Link>

        {/* Logout Button */}
        <button className="btn-outline btn-sm" onClick={handleLogout} style={{ gap: 6 }}>
          <LogOut size={14} /> Exit
        </button>
      </div>
    </div>
  );
}
