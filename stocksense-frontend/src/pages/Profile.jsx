import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, ShieldCheck, Mail, KeyRound, CheckCircle2, Lock, Sparkles, Clock } from 'lucide-react';

export default function Profile() {
  const { user, updateProfile, resetPassword, generateOtp } = useAuth();
  
  const [name, setName] = useState(user?.name || '');
  const [role, setRole] = useState(user?.role || 'Inventory Manager');
  const [isSaved, setIsSaved] = useState(false);

  // Security / Change Password states
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');

  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';

  const handleUpdateProfile = (e) => {
    e.preventDefault();
    updateProfile({ name, role });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleRequestPasswordOtp = () => {
    generateOtp(user.email, 'reset');
    setPasswordMsg(`OTP verification code sent to ${user.email}`);
  };

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    const res = await resetPassword(user.email, otpCode, newPassword);
    if (res.ok) {
      setPasswordMsg('Password successfully updated!');
      setNewPassword('');
      setOtpCode('');
      setTimeout(() => setShowPasswordForm(false), 2000);
    } else {
      setPasswordMsg(res.error || 'Failed to update password');
    }
  };

  return (
    <div>
      <div className="panel" style={{ marginBottom: 20, padding: '18px 24px' }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
          <User size={22} className="text-primary" /> User Profile & Security Settings
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
          Manage your personal account credentials, email verification status, and security options
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24 }}>
        {/* Profile Card */}
        <div className="panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              fontWeight: 800,
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
            }}>
              {initials}
            </div>

            <div>
              <h3 style={{ fontSize: 18, fontWeight: 800 }}>{user?.name}</h3>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{user?.email}</div>
              <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
                <span className={`badge ${user?.isVerified ? 'done' : 'waiting'}`} style={{ fontSize: 11 }}>
                  <ShieldCheck size={12} /> {user?.isVerified ? 'Email Verified' : 'Email Pending'}
                </span>
                <span className="badge ready" style={{ fontSize: 11 }}>
                  {user?.role || 'Inventory Manager'}
                </span>
              </div>
            </div>
          </div>

          {isSaved && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: '#ecfdf5', color: '#047857', fontSize: 13, marginBottom: 16, fontWeight: 600 }}>
              ✓ Profile details updated successfully!
            </div>
          )}

          <form onSubmit={handleUpdateProfile}>
            <div className="field">
              <label>Full Display Name</label>
              <input value={name} onChange={e => setName(e.target.value)} required />
            </div>

            <div className="field">
              <label>Registered Work Email (Primary)</label>
              <input value={user?.email || ''} disabled style={{ background: 'var(--bg-subtle)', cursor: 'not-allowed' }} />
            </div>

            <div className="field">
              <label>Assigned System Role</label>
              <select value={role} onChange={e => setRole(e.target.value)}>
                <option value="Inventory Manager">Inventory Manager (Full Access)</option>
                <option value="Warehouse Staff">Warehouse Staff (Pick & Pack)</option>
              </select>
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: 8 }}>
              Update Profile Details
            </button>
          </form>
        </div>

        {/* Security & Password Card */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <Lock size={18} className="text-primary" /> Security & Credentials
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: 16, background: 'var(--bg-subtle)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <KeyRound size={16} className="text-primary" /> Multi-Factor Email OTP Password Reset
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>
                Change your account password securely by receiving a 6-digit OTP code sent directly to your registered email address.
              </p>

              {!showPasswordForm ? (
                <button
                  className="btn-outline btn-sm"
                  style={{ marginTop: 12 }}
                  onClick={() => { setShowPasswordForm(true); handleRequestPasswordOtp(); }}
                >
                  Change Password with Email OTP
                </button>
              ) : (
                <form onSubmit={handleChangePasswordSubmit} style={{ marginTop: 14 }}>
                  {passwordMsg && (
                    <div style={{ padding: '8px 12px', borderRadius: 6, background: '#eef2ff', color: '#3730a3', fontSize: 12, marginBottom: 12 }}>
                      {passwordMsg}
                    </div>
                  )}

                  <div className="field">
                    <label>Enter 6-Digit Email Code</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={e => setOtpCode(e.target.value)}
                      placeholder="123456"
                      required
                    />
                  </div>

                  <div className="field">
                    <label>New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button type="button" className="btn-outline btn-sm" onClick={() => setShowPasswordForm(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary btn-sm">
                      Update Password
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Active Sessions */}
            <div style={{ padding: 16, background: 'var(--bg-subtle)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Clock size={16} /> Active Session Overview
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Current session authenticated via local storage token on <strong>Chrome / Windows</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
