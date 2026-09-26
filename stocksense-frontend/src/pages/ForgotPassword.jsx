import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Package, Mail, KeyRound, Lock, ArrowRight, CheckCircle2, ShieldAlert } from 'lucide-react';
import EmailDrawer from '../components/EmailDrawer';

export default function ForgotPassword() {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  
  const { requestPasswordResetOtp, resetPassword, generateOtp } = useAuth();
  const navigate = useNavigate();

  const handleRequestOtp = (e) => {
    e.preventDefault();
    setError('');
    const res = requestPasswordResetOtp(email);
    if (res.ok) {
      setStep(2);
      setInfo(`Password reset OTP code sent to ${email}`);
    } else {
      setError(res.error);
    }
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    setError('');
    if (!otp) {
      setError('Please enter the verification code');
      return;
    }
    // Advance to step 3 (actual OTP verification happens when submitting final reset or inline)
    setInfo('Code entered. Please set your new password.');
    setStep(3);
  };

  const handleResetPassword = (e) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const res = resetPassword(email, otp, newPassword);
    if (res.ok) {
      setInfo('Password successfully updated! Redirecting to sign in...');
      setTimeout(() => navigate('/login'), 1500);
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
          <h2>Reset Password</h2>
          <p>
            {step === 1 && 'Enter your account email to receive an OTP'}
            {step === 2 && 'Enter the 6-digit verification code'}
            {step === 3 && 'Choose a new password for your account'}
          </p>
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

        {step === 1 && (
          <form onSubmit={handleRequestOtp}>
            <div className="field">
              <label>Registered Email</label>
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
              Send Reset Code <KeyRound size={16} />
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyOtp}>
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
              Verify OTP Code <ArrowRight size={16} />
            </button>
            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => generateOtp(email, 'reset')}
              >
                Resend OTP Code
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleResetPassword}>
            <div className="field">
              <label>New Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  style={{ paddingLeft: 38 }}
                  required
                />
              </div>
            </div>

            <div className="field">
              <label>Confirm New Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  style={{ paddingLeft: 38 }}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: 12, height: 44 }}>
              Reset Password <CheckCircle2 size={16} />
            </button>
          </form>
        )}

        <div className="muted-link">
          <Link to="/login">Back to Sign In</Link>
        </div>
      </div>
    </div>
  );
}
