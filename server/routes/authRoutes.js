const express = require('express');
const router = express.Router();
const db = require('../db');
const { generateToken, comparePassword, authenticate } = require('../auth');
const { broadcastPresence } = require('../websocket');

// POST /api/auth/register
router.post('/register', (req, res) => {
  try {
    const { name, email, password, role, avatar } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email address is required' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = db.createUser({ name, email, password, role, avatar });
    const token = generateToken(user);

    return res.status(201).json({
      message: 'Account created successfully',
      user,
      token
    });
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const rawUser = db.findUserByEmail(email);
    if (!rawUser) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValid = comparePassword(password, rawUser.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const { password: _, ...user } = rawUser;
    const token = generateToken(user);

    return res.json({
      message: 'Login successful',
      user,
      token
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error during login' });
  }
});

// POST /api/auth/demo-login
router.post('/demo-login', (req, res) => {
  try {
    const { email } = req.body;
    const targetEmail = email || 'alex@taskflow.dev';
    const rawUser = db.findUserByEmail(targetEmail);

    if (!rawUser) {
      return res.status(404).json({ error: 'Demo user not found' });
    }

    const { password: _, ...user } = rawUser;
    const token = generateToken(user);

    return res.json({
      message: `Signed in as ${user.name}`,
      user,
      token
    });
  } catch (err) {
    return res.status(500).json({ error: 'Demo login failed' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  const user = db.findUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  return res.json({ user });
});

// PUT /api/auth/me
router.put('/me', authenticate, (req, res) => {
  try {
    const { name, role, avatar, currentPassword, newPassword } = req.body;
    const updates = {};

    if (name) updates.name = name;
    if (role) updates.role = role;
    if (avatar) updates.avatar = avatar;

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to set new password' });
      }
      const rawUser = db.findUserByEmail(req.user.email);
      if (!comparePassword(currentPassword, rawUser.password)) {
        return res.status(400).json({ error: 'Current password does not match' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters' });
      }
      updates.password = newPassword;
    }

    const updatedUser = db.updateUser(req.user.id, updates);
    return res.json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Profile update failed' });
  }
});

// GET /api/auth/users (Get team members)
router.get('/users', authenticate, (req, res) => {
  const users = db.getAllUsers();
  return res.json({ users });
});

// POST /api/auth/reset (Reset database to defaults)
router.post('/reset', (req, res) => {
  db.resetDatabase();
  return res.json({ message: 'Database reset to default seed data successfully' });
});

module.exports = router;
