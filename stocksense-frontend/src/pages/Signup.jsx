import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Package, Mail, Lock, User, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';
import EmailDrawer from '../components/EmailDrawer';

export default function Signup() {
  const [step, setStep] = useState(1); // 1: Registration Form, 2: OTP Verification
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Inventory Manager');
  const [otp, setOtp] = useState('');
  
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

  const handleStep1Submit = (e) => {
    e.preventDefault();
    setError('');
    const res = signup(name, email, password, role);
    if (res.ok) {
      setStep(2);
      setInfo(`We sent a 6-digit verification OTP code to ${email}`);
    } else {
      setError(res.error);
    }
  };

  const handleStep2Submit = (e) => {
    e.preventDefault();
    setError('');
    const res = verifySignupOtp(email, otp);
    if (res.ok) {
      navigate('/dashboard');
    } else {
      setError(res.error);
    }
  };

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
          <p>{step === 1 ? 'Get started with digital inventory management' : 'Enter the code sent to your email inbox'}</p>
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
              <label>Role</label>
              <select value={role} onChange={e => setRole(e.target.value)}>
                <option value="Inventory Manager">Inventory Manager (Full Access)</option>
                <option value="Warehouse Staff">Warehouse Staff (Pick & Pack)</option>
              </select>
            </div>

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

            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: 16, height: 44 }}>
              Continue & Send Code <ArrowRight size={16} />
            </button>
          </form>
        ) : (
          <form onSubmit={handleStep2Submit}>
            <div className="field">
              <label>Enter 6-Digit OTP Code</label>
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

            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: 12, height: 44 }}>
              Verify & Complete Registration <CheckCircle2 size={16} />
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
          Already have an account? <Link to="/login">Log in</Link>
        </div>
      </div>
    </div>
  );
}
