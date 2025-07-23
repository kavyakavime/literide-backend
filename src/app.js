// src/app.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const riderRoutes = require('./routes/rider');
const driverRoutes = require('./routes/driver');
const rideRoutes = require('./routes/rides');
const app = express();


app.use('/api/auth', authRoutes);
app.use('/api/rider', riderRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/rides', rideRoutes);


// Middleware
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
      users: [
        'GET /api/auth/users - All users',
        'GET /api/auth/users/:userId - User by ID',  
        'GET /api/auth/users/email/:email - User by email'
      ],
      riders: [
        'GET /api/rider/all - All riders',
        'GET /api/rider/id/:riderId - Rider by ID',
        'GET /api/rider/email/:email - Rider by email',
        'GET /api/rider/:riderId/rides - Rides for rider'
      ],
      drivers: [
        'GET /api/driver/all - All drivers',
        'GET /api/driver/available - Available drivers',
        'GET /api/driver/id/:driverId - Driver by ID',
        'GET /api/driver/email/:email - Driver by email',
        'GET /api/driver/:driverId/rides - Rides for driver'
      ],
      rides: [
        'GET /api/rides/all - All rides',
        'GET /api/rides/active - Active rides',
        'GET /api/rides/status/:status - Rides by status',
        'GET /api/rides/ride/:rideId - Specific ride',
        'GET /api/rides/stats - Ride statistics'
      ],
      authentication: [
        'POST /api/auth/register',
        'POST /api/auth/login',
        'POST /api/auth/forgot-password'
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

module.exports = app;// src/app.js

// Import routes


// Middleware
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

// Routes

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
        'GET  /api/auth/verify-token'
      ],
      data_viewing: [
        'GET /api/data/users',
        'GET /api/data/riders', 
        'GET /api/data/drivers',
        'GET /api/data/drivers/available',
        'GET /api/data/rides',
        'GET /api/data/rides/active',
        'GET /api/data/rides/status/:status',
        'GET /api/data/rides/:rideId',
        'GET /api/data/ride-requests',
        'GET /api/data/ride-requests/pending',
        'GET /api/data/vehicles',
        'GET /api/data/ratings',
        'GET /api/data/earnings',
        'GET /api/data/payments',
        'GET /api/data/stats/overview',
        'GET /api/data/stats/daily'
      ],
      rider_features: [
        'GET /api/rider/profile',
        'PUT /api/rider/profile',
        'GET /api/rider/rides/history',
        'GET /api/rider/rides/current',
        'POST /api/rider/rides/request',
        'POST /api/rider/rides/:rideId/cancel'
      ],
      driver_features: [
        'GET /api/driver/profile',
        'PUT /api/driver/profile',
        'GET /api/driver/ride-requests',
        'POST /api/driver/ride-requests/:requestId/accept',
        'GET /api/driver/current-ride',
        'POST /api/driver/current-ride/complete',
        'GET /api/driver/rides/history',
        'GET /api/driver/earnings'
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