// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database to ensure they still exist and are active
    const [users] = await db.execute(
      'SELECT id, full_name, email, user_type, is_active FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: 'User not found' });
    }

    const user = users[0];

    if (!user.is_active) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    return res.status(500).json({ message: 'Token verification failed' });
  }
};

// Middleware to check if user is a rider
const requireRider = (req, res, next) => {
  if (req.user.user_type !== 'rider') {
    return res.status(403).json({ message: 'Rider access required' });
  }
  next();
};

// Middleware to check if user is a driver
const requireDriver = (req, res, next) => {
  if (req.user.user_type !== 'driver') {
    return res.status(403).json({ message: 'Driver access required' });
  }
  next();
};

module.exports = {
  authenticateToken,
  requireRider,
  requireDriver
};