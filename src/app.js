// src/app.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware (MUST come before routes)
app.use(cors({
  origin: 'http://localhost:4200', // Angular dev server
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Import routes
const authRoutes = require('./routes/auth');
const riderRoutes = require('./routes/rider');
const driverRoutes = require('./routes/driver');
const rideRoutes = require('./routes/rides');

console.log('authRoutes:', typeof authRoutes, authRoutes);
console.log('riderRoutes:', typeof riderRoutes, riderRoutes);
console.log('driverRoutes:', typeof driverRoutes, driverRoutes);
console.log('rideRoutes:', typeof rideRoutes, rideRoutes);
// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rider', riderRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/rides', rideRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    message: 'LiteRide API is running!',
    timestamp: new Date().toISOString(),
    status: 'healthy'
  });
});

// Test database connection endpoint
app.get('/api/test-db', async (req, res) => {
  try {
    const db = require('./config/database');
    const [rows] = await db.execute('SELECT 1 as test');
    res.json({ 
      message: 'Database connection successful',
      result: rows[0]
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'LiteRide API Documentation',
    version: '1.0.0',
    endpoints: {
      authentication: [
        'POST /api/auth/register',
        'POST /api/auth/login',
        'POST /api/auth/forgot-password',
        'POST /api/auth/reset-password',
        'GET  /api/auth/verify-token'
      ],
      data_viewing: [
        'GET /api/auth/users',
        'GET /api/auth/users/:userId',
        'GET /api/auth/users/email/:email',
        'GET /api/rider/all', 
        'GET /api/rider/id/:riderId',
        'GET /api/rider/email/:email',
        'GET /api/rider/:riderId/rides',
        'GET /api/driver/all',
        'GET /api/driver/available',
        'GET /api/driver/id/:driverId',
        'GET /api/driver/email/:email',
        'GET /api/driver/:driverId/rides',
        'GET /api/rides/all',
        'GET /api/rides/active',
        'GET /api/rides/status/:status',
        'GET /api/rides/ride/:rideId',
        'GET /api/rides/stats'
      ],
      rider_features: [
        'GET /api/rider/profile',
        'PUT /api/rider/profile',
        'GET /api/rider/rides/history',
        'GET /api/rider/rides/current',
        'POST /api/rider/rides/request',
        'POST /api/rider/rides/:rideId/cancel',
        'POST /api/rider/rides/:rideId/rate'
      ],
      driver_features: [
        'GET /api/driver/profile',
        'PUT /api/driver/profile',
        'PUT /api/driver/location',
        'PUT /api/driver/availability',
        'GET /api/driver/vehicle',
        'PUT /api/driver/vehicle',
        'GET /api/driver/ride-requests',
        'POST /api/driver/ride-requests/:requestId/accept',
        'POST /api/driver/ride-requests/:requestId/decline',
        'GET /api/driver/current-ride',
        'PUT /api/driver/current-ride/status',
        'POST /api/driver/current-ride/complete',
        'GET /api/driver/rides/history',
        'GET /api/driver/earnings',
        'POST /api/driver/rides/:rideId/rate'
      ],
      ride_management: [
        'POST /api/rides/create',
        'PUT /api/rides/:rideId/status',
        'POST /api/rides/:rideId/cancel',
        'GET /api/rides/search-drivers',
        'GET /api/rides/statistics'
      ]
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error occurred:', err.stack);
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Invalid token' });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Token expired' });
  }
  
  // Handle MySQL errors
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(400).json({ message: 'Duplicate entry found' });
  }
  
  // Generic error
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

module.exports = app;