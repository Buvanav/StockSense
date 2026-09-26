import { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Settings as SettingsIcon, Building2, Plus, Bell, Mail, ShieldCheck, Check } from 'lucide-react';

export default function Settings() {
  const { warehouses } = useInventory();
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [otpRequired, setOtpRequired] = useState(true);
  const [lowStockThreshold, setLowStockThreshold] = useState(20);

  return (
    <div>
      <div className="panel" style={{ marginBottom: 20, padding: '18px 24px' }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
          <SettingsIcon size={22} className="text-primary" /> Warehouse & System Configuration
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
          Manage physical locations, storage racks, email authentication rules, and reorder thresholds
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24 }}>
        {/* Warehouses Card */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <Building2 size={18} className="text-primary" /> Active Warehouses & Facilities
            </div>
            <button className="btn-outline btn-sm" onClick={() => alert('Warehouse creation modal open')}>
              <Plus size={14} /> Add Warehouse
            </button>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Facility Name</th>
                  <th>Location ID</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {warehouses.map(w => (
                  <tr key={w.id}>
                    <td style={{ fontWeight: 700 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Building2 size={16} color="var(--primary)" /> {w.name}
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{w.id}</td>
                    <td>
                      <span className="badge done">Operational</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Email & Auth Preferences Card */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <Mail size={18} className="text-primary" /> Email Auth & Alert Settings
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, background: 'var(--bg-subtle)', borderRadius: 8 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Mandatory Email OTP Code</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Send 6-digit OTP to user inbox during signup and reset</div>
              </div>
              <input
                type="checkbox"
                checked={otpRequired}
                onChange={e => setOtpRequired(e.target.checked)}
                style={{ width: 20, height: 20, cursor: 'pointer' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, background: 'var(--bg-subtle)', borderRadius: 8 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Automated Low Stock Email Notifications</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Trigger email notification when stock falls below reorder level</div>
              </div>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={e => setEmailAlerts(e.target.checked)}
                style={{ width: 20, height: 20, cursor: 'pointer' }}
              />
            </div>

            <div className="field" style={{ marginTop: 8 }}>
              <label>Default Reorder Warning Threshold (Units)</label>
              <input
                type="number"
                value={lowStockThreshold}
                onChange={e => setLowStockThreshold(Number(e.target.value))}
              />
            </div>

            <button className="btn-primary" style={{ marginTop: 8 }} onClick={() => alert('Settings saved successfully!')}>
              <Check size={16} /> Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
