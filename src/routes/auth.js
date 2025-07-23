// src/routes/auth.js
const express = require('express');
const { register, login, forgotPassword, resetPassword, verifyToken } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Authentication routes
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/verify-token', authenticateToken, verifyToken);

module.exports = router;