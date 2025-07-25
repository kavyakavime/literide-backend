// src/controllers/authController.js
const db = require('../config/database');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

const register = async (req, res) => {
  try {
    console.log('Registration request received:', req.body);
    
    // Frontend sends: fullName, email, phoneNumber, password, role
    const { fullName, email, phoneNumber, password, role } = req.body;

    // Validation
    if (!fullName || !email || !phoneNumber || !password || !role) {
      console.log('Missing required fields');
      return res.status(400).json({
        message: 'All fields are required'
      });
    }

    // Validate user_type
    if (!['rider', 'driver'].includes(role)) {
      console.log('Invalid user type:', role);
      return res.status(400).json({
        message: 'User type must be either rider or driver'
      });
    }

    // Check if user already exists
    const [existingUsers] = await db.execute(
      'SELECT id FROM users WHERE email = ? OR phone_number = ?',
      [email, phoneNumber]
    );

    if (existingUsers.length > 0) {
      console.log('User already exists with email:', email);
      return res.status(400).json({
        message: 'User with this email or phone number already exists'
      });
    }

    // Store password directly (NOT RECOMMENDED FOR PRODUCTION)
    // In production, you should hash the password
    console.log('Storing password directly (no hashing) - DEVELOPMENT ONLY');

    // Start transaction
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Insert user into database with correct field mapping
      const [result] = await connection.execute(
        `INSERT INTO users (email, password_hash, full_name, phone_number, user_type, is_verified, is_active) 
         VALUES (?, ?, ?, ?, ?, TRUE, TRUE)`,
        [email, password, fullName, phoneNumber, role]
      );

      const userId = result.insertId;
      console.log('User inserted successfully with ID:', userId);

      // Create rider or driver profile
      if (role === 'rider') {
        await connection.execute(
          'INSERT INTO riders (user_id) VALUES (?)',
          [userId]
        );
        console.log('Rider profile created');
      } else if (role === 'driver') {
        const [driverResult] = await connection.execute(
          'INSERT INTO drivers (user_id, license_number, license_expiry, is_verified) VALUES (?, ?, ?, TRUE)',
          [userId, 'PENDING', '2025-12-31'] // Placeholder values
        );
        
        // Create default vehicle for driver
        await connection.execute(
          'INSERT INTO vehicles (driver_id, vehicle_type, make, model, year, color, plate_number, registration_number, insurance_expiry, is_verified, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, TRUE)',
          [driverResult.insertId, 'car', 'Honda', 'City', 2022, 'White', 'MH 01 AB 1234', 'REG123456', '2025-06-30']
        );
        
        console.log('Driver profile and vehicle created');
      }

      await connection.commit();
      connection.release();

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: userId, 
          email: email, 
          userType: role 
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      // Return success response with token
      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: userId,
          fullName: fullName,
          email: email,
          userType: role
        },
        token: token
      });

    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      message: 'Internal server error during registration',
      error: error.message
    });
  }
};

const login = async (req, res) => {
  try {
    console.log('Login request received:', req.body);
    
    const { email, password, userType } = req.body;

    // Validation
    if (!email || !password || !userType) {
      return res.status(400).json({
        message: 'Email, password, and user type are required'
      });
    }

    // Find user by email
    const [users] = await db.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    const user = users[0];

    // Check if user type matches
    if (user.user_type !== userType) {
      return res.status(400).json({
        message: 'Invalid user type'
      });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(400).json({
        message: 'Account is deactivated'
      });
    }

    // Check password (direct comparison - NOT RECOMMENDED FOR PRODUCTION)
    if (user.password_hash !== password) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    // Update last login
    await db.execute(
      'UPDATE users SET last_login = NOW() WHERE id = ?',
      [user.id]
    );

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        userType: user.user_type,
        fullName: user.full_name
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    console.log('Login successful for user:', user.full_name);

    // Return success response with token
    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        userType: user.user_type
      },
      token: token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Internal server error during login'
    });
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

    // In a real application, you would send an email here
    console.log(`Password reset requested for ${email}`);

    res.json({ 
      message: 'If an account with this email exists, a password reset link has been sent.'
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

    // For development - just return success
    res.json({ message: 'Password reset functionality not fully implemented in development mode' });
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