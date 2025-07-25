// src/routes/auth.js
const express = require('express');
const { register, login, forgotPassword, resetPassword, verifyToken } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const db = require('../config/database');
const router = express.Router();

// Debug check
console.log('authController imports:', { register, login, forgotPassword, resetPassword, verifyToken });

// Authentication routes (no auth required)
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes (auth required)
router.get('/verify-token', authenticateToken, verifyToken);

// Data viewing endpoints (no auth required for development)
router.get('/users', async (req, res) => {
  try {
    const [users] = await db.execute(`
      SELECT id, email, full_name, phone_number, user_type, is_verified, is_active, created_at, last_login
      FROM users ORDER BY created_at DESC
    `);
    res.json({ message: 'All users retrieved', count: users.length, data: users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Get user by email - This should come BEFORE the userId route
router.get('/users/email/:email', async (req, res) => {
  try {
    const email = req.params.email;
        
    const [users] = await db.execute(`
      SELECT id, password_hash, email, full_name, phone_number, user_type, is_verified, is_active, created_at, last_login
      FROM users WHERE email = ?
    `, [email]);
            
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
        
    res.json({ message: 'User retrieved', data: users[0] });
  } catch (error) {
    console.error('Error fetching user by email:', error);
    res.status(500).json({ message: 'Failed to fetch user' });
  }
});

// Get user by ID - This should come AFTER the email route
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
    console.error('Error fetching user by ID:', error);
    res.status(500).json({ message: 'Failed to fetch user' });
  }
});

module.exports = router;