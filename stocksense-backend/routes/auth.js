const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');
const { sendOtpEmail } = require('../services/mailer');

const router = express.Router();
const MANAGER_PASSCODE = process.env.MANAGER_PASSCODE || 'MGR-2026-KEY';

// Signup with Manager Passcode protection & Email OTP generation
router.post('/signup', async (req, res) => {
  const { name, email, password, role, managerPasscode } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(400).json({ error: 'Email already registered' });
  }

  // Security Check: Role Misuse Protection
  let userRole = 'Warehouse Staff';
  if (role === 'Inventory Manager') {
    if (!managerPasscode || managerPasscode.trim() !== MANAGER_PASSCODE) {
      return res.status(403).json({
        error: `Invalid Manager Security Passcode! Inventory Manager role requires authorized passcode (Demo Passcode: ${MANAGER_PASSCODE}).`
      });
    }
    userRole = 'Inventory Manager';
  }

  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);

  const result = db.prepare(`
    INSERT INTO users (name, email, password_hash, role, is_verified)
    VALUES (?, ?, ?, ?, 0)
  `).run(name, email, hash, userRole);

  const userId = result.lastInsertRowid;

  // Generate 6-digit OTP code & dispatch email
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO otps (email, code, expires_at)
    VALUES (?, ?, ?)
  `).run(email, code, expiresAt);

  console.log(`[AUTH REGISTRATION OTP] Generated for ${email}: ${code}`);
  const mailResult = await sendOtpEmail(email, code, 'signup');

  const token = jwt.sign(
    { id: userId, email, name, role: userRole, isVerified: 0 },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.status(201).json({
    token,
    user: { id: userId, name, email, role: userRole, isVerified: 0 },
    otp: code,
    expiresAt,
    emailSent: mailResult.success,
    previewUrl: mailResult.previewUrl || null
  });
});

// Login (by password)
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const isValid = bcrypt.compareSync(password, user.password_hash);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role, isVerified: user.is_verified },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, isVerified: user.is_verified }
  });
});

// Request OTP (Nodemailer Email Dispatch)
router.post('/otp/request', async (req, res) => {
  const { email, type } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO otps (email, code, expires_at)
    VALUES (?, ?, ?)
  `).run(email, code, expiresAt);

  console.log(`[OTP DISPATCH] Generated for ${email}: ${code}`);
  const mailResult = await sendOtpEmail(email, code, type || 'signup');

  res.json({
    message: `Verification code sent to ${email}`,
    otp: code,
    expiresAt,
    emailSent: mailResult.success,
    previewUrl: mailResult.previewUrl || null
  });
});

// Verify OTP & Activate Account Verification State
router.post('/otp/verify', (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'Email and OTP code required' });

  const otpRow = db.prepare(`
    SELECT * FROM otps 
    WHERE email = ? AND code = ? AND used = 0 AND datetime(expires_at) > datetime('now')
    ORDER BY id DESC LIMIT 1
  `).get(email, code);

  if (!otpRow) {
    return res.status(400).json({ error: 'Invalid or expired OTP verification code' });
  }

  // Mark OTP used
  db.prepare('UPDATE otps SET used = 1 WHERE id = ?').run(otpRow.id);

  // Mark User Email as Verified
  db.prepare('UPDATE users SET is_verified = 1 WHERE email = ?').run(email);

  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('stocksense123', salt);
    const name = email.split('@')[0];
    const result = db.prepare(`
      INSERT INTO users (name, email, password_hash, role, is_verified)
      VALUES (?, ?, ?, 'Warehouse Staff', 1)
    `).run(name, email, hash);

    user = { id: result.lastInsertRowid, name, email, role: 'Warehouse Staff', is_verified: 1 };
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role, isVerified: 1 },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    message: 'Email verified successfully!',
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, isVerified: 1 }
  });
});

// Reset Password
router.post('/reset-password', (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: 'Email, OTP code, and new password required' });
  }

  const otpRow = db.prepare(`
    SELECT * FROM otps 
    WHERE email = ? AND code = ? AND used = 0 AND datetime(expires_at) > datetime('now')
    ORDER BY id DESC LIMIT 1
  `).get(email, code);

  if (!otpRow) {
    return res.status(400).json({ error: 'Invalid or expired OTP code' });
  }

  db.prepare('UPDATE otps SET used = 1 WHERE id = ?').run(otpRow.id);

  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(newPassword, salt);

  const updateRes = db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(hash, email);
  if (updateRes.changes === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ message: 'Password updated successfully' });
});

// Get current user profile
router.get('/me', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, name, email, role, is_verified, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

module.exports = router;
