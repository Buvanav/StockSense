import { Mail, X, Check, Copy, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function EmailDrawer() {
  const { emails, dismissEmail } = useAuth();
  const [copiedId, setCopiedId] = useState(null);

  if (emails.length === 0) return null;

  const activeEmail = emails[0]; // Display latest email

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedId(activeEmail.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="simulated-inbox">
      <div className="simulated-inbox-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Mail size={16} className="text-primary" />
          <span>Nodemailer Email Notification ({emails.length})</span>
        </div>
        <button className="btn-ghost" style={{ padding: 2 }} onClick={() => dismissEmail(activeEmail.id)}>
          <X size={16} />
        </button>
      </div>

      <div className="simulated-inbox-body">
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
          <strong>To:</strong> {activeEmail.to} • {activeEmail.timestamp}
        </div>
        <div style={{ fontWeight: 700, color: '#f8fafc', marginBottom: 6 }}>
          {activeEmail.subject}
        </div>
        <p style={{ color: '#cbd5e1', fontSize: 12, lineHeight: 1.4 }}>
          Use the following security verification code to activate your account:
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
          <span className="otp-code-highlight">{activeEmail.otp}</span>
          <button
            type="button"
            className="btn-outline btn-sm"
            style={{ padding: '6px 10px', fontSize: 12, background: '#1e293b', color: '#fff', border: '1px solid #475569' }}
            onClick={() => handleCopy(activeEmail.otp)}
          >
            {copiedId === activeEmail.id ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
            {copiedId === activeEmail.id ? 'Copied' : 'Copy'}
          </button>
          
          {activeEmail.previewUrl && (
            <a
              href={activeEmail.previewUrl}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 11, color: '#818cf8', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'underline' }}
            >
              <ExternalLink size={12} /> Open Nodemailer Ethereal Inbox
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
