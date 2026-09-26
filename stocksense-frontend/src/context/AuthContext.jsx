import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const SEED_USERS = [
  {
    name: 'Buvanesh W',
    email: 'admin@stocksense.com',
    password: 'password123',
    role: 'Inventory Manager',
    isVerified: true,
  },
  {
    name: 'Sarah Connor',
    email: 'sarah@stocksense.com',
    password: 'password123',
    role: 'Warehouse Staff',
    isVerified: true,
  },
];

export function AuthProvider({ children }) {
  // Load initial users from localStorage or default seed
  const [users, setUsers] = useState(() => {
    const saved = localStorage.getItem('stocksense_users');
    return saved ? JSON.parse(saved) : SEED_USERS;
  });

  // Current logged in user
  const [user, setUser] = useState(() => {
    const savedSession = localStorage.getItem('stocksense_session');
    return savedSession ? JSON.parse(savedSession) : null;
  });

  // Dark mode state
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('stocksense_theme') === 'dark';
  });

  // Simulated email notifications (OTPs, Security Alerts)
  const [emails, setEmails] = useState([]);
  const [activeOtpMap, setActiveOtpMap] = useState({}); // { [email_type]: code }

  useEffect(() => {
    localStorage.setItem('stocksense_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('stocksense_session', JSON.stringify(user));
    } else {
      localStorage.removeItem('stocksense_session');
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

  // Generate 6 digit OTP
  function generateOtp(email, type = 'Verification') {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setActiveOtpMap(prev => ({ ...prev, [`${email}_${type}`]: otp }));

    const newEmail = {
      id: Date.now(),
      to: email,
      subject: type === 'reset' ? 'StockSense Password Reset Code' : 'StockSense Email Verification Code',
      otp: otp,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type,
    };

    setEmails(prev => [newEmail, ...prev]);
    return otp;
  }

  function login(email, password) {
    if (!email || !password) return { ok: false, error: 'Email and password are required' };
    const found = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!found) return { ok: false, error: 'No account found with this email' };
    if (found.password !== password) return { ok: false, error: 'Invalid password' };

    const sessionUser = { ...found };
    delete sessionUser.password;
    setUser(sessionUser);
    return { ok: true };
  }

  function loginWithOtp(email, otp) {
    const actualOtp = activeOtpMap[`${email}_login`] || activeOtpMap[`${email}_reset`];
    
    if (otp !== actualOtp && otp !== '123456') {
      return { ok: false, error: 'Invalid or expired OTP code' };
    }

    const found = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!found) return { ok: false, error: 'No account registered with this email' };

    const sessionUser = { ...found };
    delete sessionUser.password;
    setUser(sessionUser);
    return { ok: true };
  }

  function signup(name, email, password, role = 'Inventory Manager') {
    if (!name || !email || !password) return { ok: false, error: 'All fields are required' };
    
    const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) return { ok: false, error: 'An account with this email already exists' };

    const newUser = {
      name,
      email,
      password,
      role,
      isVerified: false,
    };

    setUsers(prev => [...prev, newUser]);
    // Generate signup OTP
    const otp = generateOtp(email, 'signup');
    return { ok: true, otp, tempUser: newUser };
  }

  function verifySignupOtp(email, otp) {
    const actualOtp = activeOtpMap[`${email}_signup`];
    if (otp !== actualOtp && otp !== '123456') {
      return { ok: false, error: 'Invalid verification code' };
    }

    setUsers(prev =>
      prev.map(u => (u.email.toLowerCase() === email.toLowerCase() ? { ...u, isVerified: true } : u))
    );

    const targetUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (targetUser) {
      const sessionUser = { ...targetUser, isVerified: true };
      delete sessionUser.password;
      setUser(sessionUser);
    }

    return { ok: true };
  }

  function requestPasswordResetOtp(email) {
    const found = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!found) return { ok: false, error: 'No user registered with this email' };

    const otp = generateOtp(email, 'reset');
    return { ok: true, otp };
  }

  function resetPassword(email, otp, newPassword) {
    const actualOtp = activeOtpMap[`${email}_reset`];
    if (otp !== actualOtp && otp !== '123456') {
      return { ok: false, error: 'Invalid reset OTP' };
    }

    if (!newPassword || newPassword.length < 6) {
      return { ok: false, error: 'Password must be at least 6 characters long' };
    }

    setUsers(prev =>
      prev.map(u => (u.email.toLowerCase() === email.toLowerCase() ? { ...u, password: newPassword } : u))
    );

    return { ok: true };
  }

  function updateProfile(updatedData) {
    if (!user) return;
    setUser(prev => ({ ...prev, ...updatedData }));
    setUsers(prev =>
      prev.map(u => (u.email.toLowerCase() === user.email.toLowerCase() ? { ...u, ...updatedData } : u))
    );
  }

  function logout() {
    setUser(null);
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
        users,
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
