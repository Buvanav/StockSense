import { TrendingUp } from 'lucide-react';

export default function KpiCard({ label, value, tone, icon: Icon, trend }) {
  return (
    <div className={`kpi-card ${tone || ''}`}>
      <div className="kpi-header">
        {Icon && (
          <div className="kpi-icon">
            <Icon size={20} />
          </div>
        )}
        {trend && (
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--success-text)', display: 'flex', alignItems: 'center', gap: 2 }}>
            <TrendingUp size={14} /> {trend}
          </span>
        )}
      </div>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}
