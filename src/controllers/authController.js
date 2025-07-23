// src/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/database');

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const register = async (req, res) => {
  try {
    const { fullName, email, phoneNumber, password, role } = req.body;

    // Validation
    if (!fullName || !email || !phoneNumber || !password || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    if (!['rider', 'driver'].includes(role)) {
      return res.status(400).json({ message: 'Invalid user type' });
    }

    // Check if user already exists
    const [existingUsers] = await db.execute(
      'SELECT id FROM users WHERE email = ? OR phone_number = ?',
      [email, phoneNumber]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'User already exists with this email or phone number' });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Start transaction
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Insert user
      const [result] = await connection.execute(
        'INSERT INTO users (full_name, email, phone_number, password_hash, user_type) VALUES (?, ?, ?, ?, ?)',
        [fullName, email, phoneNumber, passwordHash, role]
      );

      const userId = result.insertId;

      // Create rider or driver profile
      if (role === 'rider') {
        await connection.execute(
          'INSERT INTO riders (user_id) VALUES (?)',
          [userId]
        );
      } else if (role === 'driver') {
        await connection.execute(
          'INSERT INTO drivers (user_id, license_number, license_expiry) VALUES (?, ?, ?)',
          [userId, 'PENDING', '2025-12-31'] // Placeholder values
        );
      }

      await connection.commit();
      connection.release();

      const token = generateToken(userId);

      res.status(201).json({
        message: 'User registered successfully',
        token,
        user: {
          id: userId,
          fullName,
          email,
          userType: role
        }
      });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed. Please try again.' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password, userType } = req.body;

    // Validation
    if (!email || !password || !userType) {
      return res.status(400).json({ message: 'Email, password, and user type are required' });
    }

    // Find user
    const [users] = await db.execute(
      'SELECT id, full_name, email, password_hash, user_type, is_active FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = users[0];

    if (!user.is_active) {
      return res.status(401).json({ message: 'Account is deactivated. Please contact support.' });
    }

    if (user.user_type !== userType) {
      return res.status(401).json({ message: `Please select the correct account type (${user.user_type})` });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Update last login
    await db.execute(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [user.id]
    );

    const token = generateToken(user.id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        userType: user.user_type
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed. Please try again.' });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check if user exists
    const [users] = await db.execute(
      'SELECT id, full_name FROM users WHERE email = ? AND is_active = TRUE',
      [email]
    );

    if (users.length === 0) {
      // Don't reveal if email exists or not for security
      return res.json({ message: 'If an account with this email exists, a password reset link has been sent.' });
    }

    const user = users[0];

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Save reset token
    await db.execute(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE token = ?, expires_at = ?, used = FALSE',
      [user.id, resetToken, tokenExpiry, resetToken, tokenExpiry]
    );

    // In a real application, you would send an email here
    console.log(`Password reset token for ${email}: ${resetToken}`);

    res.json({ 
      message: 'If an account with this email exists, a password reset link has been sent.',
      // For development only - remove in production
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Unable to process password reset request' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    // Find valid token
    const [tokens] = await db.execute(
      'SELECT user_id FROM password_reset_tokens WHERE token = ? AND expires_at > NOW() AND used = FALSE',
      [token]
    );

    if (tokens.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    const userId = tokens[0].user_id;

    // Hash new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Update password
      await connection.execute(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        [passwordHash, userId]
      );

      // Mark token as used
      await connection.execute(
        'UPDATE password_reset_tokens SET used = TRUE WHERE token = ?',
        [token]
      );

      await connection.commit();
      connection.release();

      res.json({ message: 'Password reset successful' });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Password reset failed' });
  }
};

const verifyToken = async (req, res) => {
  try {
    // If we reach here, the token is valid (middleware already verified it)
    res.json({
      message: 'Token is valid',
      user: {
        id: req.user.id,
        fullName: req.user.full_name,
        email: req.user.email,
        userType: req.user.user_type
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ message: 'Token verification failed' });
  }
};

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  verifyToken
};