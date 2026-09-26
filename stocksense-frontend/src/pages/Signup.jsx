import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Package, Mail, Lock, User, ShieldCheck, ArrowRight, CheckCircle2, KeyRound } from 'lucide-react';
import EmailDrawer from '../components/EmailDrawer';

export default function Signup() {
  const [step, setStep] = useState(1); // 1: Registration Form, 2: OTP Verification
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Warehouse Staff');
  const [managerPasscode, setManagerPasscode] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  
  const { signup, verifySignupOtp } = useAuth();
  const navigate = useNavigate();

  // Password strength score 0..3
  const calculateStrength = (pass) => {
    let score = 0;
    if (pass.length >= 6) score++;
    if (/[A-Z]/.test(pass) || /[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass) && pass.length >= 8) score++;
    return score;
  };

  const strength = calculateStrength(password);
  const strengthColors = ['#e2e8f0', '#ef4444', '#f59e0b', '#10b981'];
  const strengthLabels = ['Too weak', 'Weak', 'Good', 'Strong'];

  async function handleStep1Submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await signup(name, email, password, role, managerPasscode);
      if (res.ok) {
        setStep(2);
        setInfo(`Verification security code dispatched to ${email}`);
      } else {
        setError(res.error);
      }
    } catch (err) {
      setError('Registration failed. Please check backend connection.');
    } finally {
      setLoading(false);
    }
  }

  async function handleStep2Submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await verifySignupOtp(email, otp);
      if (res.ok) {
        navigate('/dashboard');
      } else {
        setError(res.error);
      }
    } catch (err) {
      setError('Invalid or expired OTP verification code.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <EmailDrawer />
      <div className="auth-card">
        <div className="auth-header">
          <div className="logo-badge">
            <div className="brand-icon">
              <Package size={22} />
            </div>
          </div>
          <h2>{step === 1 ? 'Create StockSense Account' : 'Verify Email Address'}</h2>
          <p>{step === 1 ? 'Role-protected registration with Nodemailer email verification' : 'Enter the 6-digit code sent to your email inbox'}</p>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {info && (
          <div style={{ padding: '10px 14px', borderRadius: 8, background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', fontSize: 13, marginBottom: 16 }}>
            {info}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleStep1Submit}>
            <div className="field">
              <label>Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Buvanesh W"
                  style={{ paddingLeft: 38 }}
                  required
                />
              </div>
            </div>

            <div className="field">
              <label>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  style={{ paddingLeft: 38 }}
                  required
                />
              </div>
            </div>

            <div className="field">
              <label>Role Assignment</label>
              <select value={role} onChange={e => setRole(e.target.value)}>
                <option value="Warehouse Staff">Warehouse Staff (Picking, Shelving & Transfers)</option>
                <option value="Inventory Manager">Inventory Manager (Full Management & Validation)</option>
              </select>
            </div>

            {/* Security Passcode Field for Inventory Manager Role */}
            {role === 'Inventory Manager' && (
              <div className="field" style={{ background: 'var(--primary-light)', padding: 12, borderRadius: 10, border: '1px dashed var(--primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label style={{ color: 'var(--primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                    <ShieldCheck size={14} /> Manager Security Passcode
                  </label>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>Demo: MGR-2026-KEY</span>
                </div>
                <div style={{ position: 'relative', marginTop: 6 }}>
                  <KeyRound size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--primary)' }} />
                  <input
                    type="password"
                    value={managerPasscode}
                    onChange={e => setManagerPasscode(e.target.value)}
                    placeholder="Enter Organization Manager Passcode"
                    style={{ paddingLeft: 38, borderColor: 'var(--primary)' }}
                    required
                  />
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, marginBottom: 0 }}>
                  Role misuse protection: Manager role requires authorized passcode.
                </p>
              </div>
            )}

            <div className="field">
              <label>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  style={{ paddingLeft: 38 }}
                  required
                />
              </div>
              {password && (
                <div style={{ marginTop: 6 }}>
                  <div className="strength-bar">
                    <div
                      className="strength-fill"
                      style={{
                        width: `${(strength / 3) * 100}%`,
                        background: strengthColors[strength],
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Strength: {strengthLabels[strength]}</span>
                    <span>Min 6 chars</span>
                  </div>
                </div>
              )}
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', marginTop: 16, height: 44 }}>
              {loading ? 'Sending OTP Email...' : 'Continue & Verify Email'} <ArrowRight size={16} />
            </button>
          </form>
        ) : (
          <form onSubmit={handleStep2Submit}>
            <div className="field">
              <label>Enter 6-Digit OTP Security Code</label>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={e => setOtp(e.target.value)}
                placeholder="123456"
                style={{ textAlign: 'center', letterSpacing: 4, fontSize: 20, fontWeight: 700 }}
                required
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', marginTop: 12, height: 44 }}>
              {loading ? 'Verifying Code...' : 'Verify Email & Activate Account'} <CheckCircle2 size={16} />
            </button>

            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => setStep(1)}
              >
                Back to edit details
              </button>
            </div>
          </form>
        )}

        <div className="muted-link">
          Already registered? <Link to="/login">Log in</Link>
        </div>
      </div>
    </div>
  );
}
