// src/routes/auth.js
const express = require('express');
const { register, login, forgotPassword, resetPassword, verifyToken } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const db = require('../config/database');
const router = express.Router();

// Authentication routes
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/verify-token', authenticateToken, verifyToken);

// endpoints for viewing the data 'GET'
router.get('/users', async (req, res) => {
  try {
    const [users] = await db.execute(`
      SELECT id, email, full_name, phone_number, user_type, is_verified, is_active, created_at, last_login
      FROM users ORDER BY created_at DESC
    `);
    res.json({ message: 'All users retrieved', count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

router.get('/users/:userId', async (req, res) => {
  try {
    const [users] = await db.execute(`
      SELECT id, email, full_name, phone_number, user_type, is_verified, is_active, created_at, last_login
      FROM users WHERE id = ?
    `, [req.params.userId]);
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User retrieved', data: users[0] });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch user' });
  }
});

router.get('/users/email/:email', async (req, res) => {
  try {
    const [users] = await db.execute(`
      SELECT id, email, full_name, phone_number, user_type, is_verified, is_active, created_at, last_login
      FROM users WHERE email = ?
    `, [req.params.email]);
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User retrieved', data: users[0] });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch user' });
  }
});

module.exports = router;