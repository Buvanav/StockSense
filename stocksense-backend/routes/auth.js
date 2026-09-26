const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Signup
router.post('/signup', (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(400).json({ error: 'Email already registered' });
  }

  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);
  const userRole = role || 'Inventory Manager';

  const result = db.prepare(`
    INSERT INTO users (name, email, password_hash, role)
    VALUES (?, ?, ?, ?)
  `).run(name, email, hash, userRole);

  const token = jwt.sign({ id: result.lastInsertRowid, email, name, role: userRole }, JWT_SECRET, { expiresIn: '7d' });

  res.status(201).json({
    token,
    user: { id: result.lastInsertRowid, name, email, role: userRole }
  });
});

// Login (by password or OTP verified flag)
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

  const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  });
});

// Request OTP (for OTP Login or Password Reset)
router.post('/otp/request', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  // Generate 6-digit OTP
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 mins

  db.prepare(`
    INSERT INTO otps (email, code, expires_at)
    VALUES (?, ?, ?)
  `).run(email, code, expiresAt);

  console.log(`[OTP GENERATED] For ${email}: ${code}`);

  // Return code in JSON so frontend drawer can render real live OTP for user demo!
  res.json({
    message: `OTP sent successfully to ${email}`,
    otp: code,
    expiresAt
  });
});

// Verify OTP
router.post('/otp/verify', (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'Email and OTP code required' });

  const otpRow = db.prepare(`
    SELECT * FROM otps 
    WHERE email = ? AND code = ? AND used = 0 AND datetime(expires_at) > datetime('now')
    ORDER BY id DESC LIMIT 1
  `).get(email, code);

  if (!otpRow) {
    return res.status(400).json({ error: 'Invalid or expired OTP code' });
  }

  // Mark OTP as used
  db.prepare('UPDATE otps SET used = 1 WHERE id = ?').run(otpRow.id);

  // Check if user exists or create automatically
  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('stocksense123', salt);
    const name = email.split('@')[0];
    const result = db.prepare(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES (?, ?, ?, 'Inventory Manager')
    `).run(name, email, hash);

    user = { id: result.lastInsertRowid, name, email, role: 'Inventory Manager' };
  }

  const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
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
  const user = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

module.exports = router;
