import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Package, Lock, Mail, ArrowRight, Eye, EyeOff, ShieldCheck, KeyRound, Check } from 'lucide-react';
import EmailDrawer from '../components/EmailDrawer';

export default function Login() {
  const [tab, setTab] = useState('password'); // 'password' | 'otp'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // OTP state
  const [otpStep, setOtpStep] = useState(1); // 1: request, 2: verify
  const [otpInput, setOtpInput] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const { login, loginWithOtp, generateOtp } = useAuth();
  const navigate = useNavigate();

  // Demo auto-fill helper
  const handleQuickDemo = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    setError('');
    const res = login(email, password);
    if (res.ok) {
      navigate('/dashboard');
    } else {
      setError(res.error);
    }
  };

  const handleSendOtp = (e) => {
    e.preventDefault();
    setError('');
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    generateOtp(email, 'login');
    setOtpStep(2);
    setInfo(`6-digit code sent to ${email}`);
    startResendTimer();
  };

  const startResendTimer = () => {
    setResendTimer(60);
    const interval = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleVerifyOtpSubmit = (e) => {
    e.preventDefault();
    setError('');
    const res = loginWithOtp(email, otpInput);
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
          <h2>StockSense IMS</h2>
          <p>Inventory & Logistics Management System</p>
        </div>

        {/* Tab Switcher */}
        <div className="tab-group">
          <div
            className={`tab-item ${tab === 'password' ? 'active' : ''}`}
            onClick={() => { setTab('password'); setError(''); setInfo(''); }}
          >
            Password Sign In
          </div>
          <div
            className={`tab-item ${tab === 'otp' ? 'active' : ''}`}
            onClick={() => { setTab('otp'); setError(''); setInfo(''); }}
          >
            Email OTP Sign In
          </div>
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

        {tab === 'password' ? (
          <form onSubmit={handlePasswordSubmit}>
            <div className="field">
              <label>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@stocksense.com"
                  style={{ paddingLeft: 38 }}
                  required
                />
              </div>
            </div>

            <div className="field">
              <label>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ paddingLeft: 38, paddingRight: 38 }}
                  required
                />
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ position: 'absolute', right: 6, top: 6, padding: 6 }}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: 12, height: 44 }}>
              Sign In <ArrowRight size={16} />
            </button>
          </form>
        ) : (
          <div>
            {otpStep === 1 ? (
              <form onSubmit={handleSendOtp}>
                <div className="field">
                  <label>Work Email</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="admin@stocksense.com"
                      style={{ paddingLeft: 38 }}
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: 12, height: 44 }}>
                  Send Verification Code <KeyRound size={16} />
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtpSubmit}>
                <div className="field">
                  <label>Enter 6-Digit Email Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpInput}
                    onChange={e => setOtpInput(e.target.value)}
                    placeholder="Enter OTP (e.g. 123456)"
                    style={{ textAlign: 'center', letterSpacing: 4, fontSize: 18, fontWeight: 700 }}
                    required
                  />
                </div>
                <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: 12, height: 44 }}>
                  Verify & Sign In <ShieldCheck size={16} />
                </button>
                <div style={{ textAlign: 'center', marginTop: 14 }}>
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    disabled={resendTimer > 0}
                    onClick={() => generateOtp(email, 'login')}
                  >
                    {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend OTP Code'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>
            Quick Demo Accounts:
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn-outline btn-sm"
              style={{ flex: 1, fontSize: 12 }}
              onClick={() => handleQuickDemo('admin@stocksense.com', 'password123')}
            >
              <Check size={12} /> Inventory Manager
            </button>
            <button
              type="button"
              className="btn-outline btn-sm"
              style={{ flex: 1, fontSize: 12 }}
              onClick={() => handleQuickDemo('sarah@stocksense.com', 'password123')}
            >
              <Check size={12} /> Warehouse Staff
            </button>
          </div>
        </div>

        <div className="muted-link" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
          <Link to="/forgot-password" style={{ color: 'var(--primary)', fontWeight: 600 }}>Forgot password?</Link>
          <Link to="/signup" style={{ color: 'var(--primary)', fontWeight: 600 }}>Create an account</Link>
        </div>
      </div>
    </div>
  );
}
