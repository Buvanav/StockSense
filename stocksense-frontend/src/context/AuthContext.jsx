import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);
const API_URL = 'http://localhost:3001/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const savedSession = localStorage.getItem('stocksense_session');
    return savedSession ? JSON.parse(savedSession) : null;
  });

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('stocksense_theme') === 'dark';
  });

  const [emails, setEmails] = useState([]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('stocksense_session', JSON.stringify(user));
    } else {
      localStorage.removeItem('stocksense_session');
      localStorage.removeItem('stocksense_token');
    }
  }, [user]);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('stocksense_theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('stocksense_theme', 'light');
    }
  }, [darkMode]);

  // Helper to add simulated email alert to topbar notification drawer
  function pushEmailNotification(email, subject, otpCode, type) {
    const newEmail = {
      id: Date.now(),
      to: email,
      subject: subject,
      otp: otpCode,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type,
    };
    setEmails(prev => [newEmail, ...prev]);
  }

  async function login(email, password) {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error || 'Login failed' };

      localStorage.setItem('stocksense_token', data.token);
      setUser(data.user);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: 'Could not connect to authentication server' };
    }
  }

  async function loginWithOtp(email, otp) {
    try {
      const res = await fetch(`${API_URL}/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otp })
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error || 'Invalid OTP code' };

      localStorage.setItem('stocksense_token', data.token);
      setUser(data.user);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: 'Could not connect to backend server' };
    }
  }

  async function signup(name, email, password, role = 'Inventory Manager') {
    try {
      // Create user on backend
      const res = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role })
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error || 'Signup failed' };

      // Request OTP
      const otpRes = await fetch(`${API_URL}/auth/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const otpData = await otpRes.json();
      
      if (otpData.otp) {
        pushEmailNotification(email, 'StockSense Verification Code', otpData.otp, 'signup');
      }

      localStorage.setItem('stocksense_token', data.token);
      setUser(data.user);
      return { ok: true, otp: otpData.otp };
    } catch (err) {
      return { ok: false, error: 'Backend connection error' };
    }
  }

  async function generateOtp(email, type = 'login') {
    try {
      const res = await fetch(`${API_URL}/auth/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.otp) {
        pushEmailNotification(email, 'StockSense Verification Code', data.otp, type);
      }
      return data.otp || '123456';
    } catch (err) {
      return '123456';
    }
  }

  async function verifySignupOtp(email, otp) {
    return loginWithOtp(email, otp);
  }

  async function requestPasswordResetOtp(email) {
    try {
      const res = await fetch(`${API_URL}/auth/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error || 'Could not send OTP' };

      if (data.otp) {
        pushEmailNotification(email, 'StockSense Password Reset Code', data.otp, 'reset');
      }
      return { ok: true, otp: data.otp };
    } catch (err) {
      return { ok: false, error: 'Backend connection error' };
    }
  }

  async function resetPassword(email, otp, newPassword) {
    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otp, newPassword })
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error || 'Reset failed' };
      return { ok: true };
    } catch (err) {
      return { ok: false, error: 'Backend connection error' };
    }
  }

  function updateProfile(updatedData) {
    if (!user) return;
    setUser(prev => ({ ...prev, ...updatedData }));
  }

  function logout() {
    setUser(null);
    localStorage.removeItem('stocksense_session');
    localStorage.removeItem('stocksense_token');
  }

  function toggleDarkMode() {
    setDarkMode(prev => !prev);
  }

  function dismissEmail(id) {
    setEmails(prev => prev.filter(e => e.id !== id));
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        darkMode,
        emails,
        login,
        loginWithOtp,
        signup,
        verifySignupOtp,
        requestPasswordResetOtp,
        resetPassword,
        generateOtp,
        updateProfile,
        logout,
        toggleDarkMode,
        dismissEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
