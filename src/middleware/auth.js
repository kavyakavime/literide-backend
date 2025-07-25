// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_fallback_secret_key');
      
      const [users] = await db.execute(
        'SELECT id, full_name, email, user_type, is_active FROM users WHERE id = ?',
        [decoded.userId]
      );

      if (users.length === 0) {
        return res.status(401).json({ 
          success: false, 
          message: 'User not found' 
        });
      }

      const user = users[0];

      if (!user.is_active) {
        return res.status(401).json({ 
          success: false, 
          message: 'Account is deactivated' 
        });
      }

      req.user = {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        user_type: user.user_type
      };
      
      next();
    } catch (jwtError) {
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid token' 
        });
      }
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          success: false, 
          message: 'Token expired' 
        });
      }
      throw jwtError;
    }
  } catch (error) {
    console.error('Token authentication error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Token verification failed' 
    });
  }
};

const requireRider = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required' 
    });
  }
  
  if (req.user.user_type !== 'rider') {
    return res.status(403).json({ 
      success: false, 
      message: 'Rider access required' 
    });
  }
  next();
};

const requireDriver = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required' 
    });
  }
  
  if (req.user.user_type !== 'driver') {
    return res.status(403).json({ 
      success: false, 
      message: 'Driver access required' 
    });
  }
  next();
};

module.exports = {
  authenticateToken,
  requireRider,
  requireDriver
};