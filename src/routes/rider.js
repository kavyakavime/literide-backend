// src/routes/rider.js - FIXED version

const express = require('express');
const { authenticateToken, requireRider } = require('../middleware/auth');
const {
  getRiderProfile,
  updateRiderProfile,
  getRideHistory,
  getCurrentRide,
  requestRide: requestRideLegacy,
  cancelRide,
  rateDriver
} = require('../controllers/riderController');

// Import current ride controller functions
const {
  getRiderCurrentRide,
  cancelCurrentRide,
  createCurrentRide,
  requestRide
} = require('../controllers/currentRideController');

const db = require('../config/database');

const router = express.Router();

// GET endpoints for viewing rider data (no auth required for development)
router.get('/all', async (req, res) => {
  try {
    const [riders] = await db.execute(`
      SELECT 
        r.id, u.full_name, u.email, u.phone_number,
        r.emergency_contact_name, r.emergency_contact_phone,
        r.preferred_payment_method, r.created_at
      FROM riders r
      JOIN users u ON r.user_id = u.id
      ORDER BY r.created_at DESC
    `);
    res.json({ message: 'All riders retrieved', count: riders.length, data: riders });
  } catch (error) {
    console.error('Error fetching riders:', error);
    res.status(500).json({ message: 'Failed to fetch riders' });
  }
});

router.get('/id/:riderId', async (req, res) => {
  try {
    const [riders] = await db.execute(`
      SELECT 
        r.id, u.id as user_id, u.full_name, u.email, u.phone_number,
        r.emergency_contact_name, r.emergency_contact_phone,
        r.preferred_payment_method, r.created_at, u.is_verified, u.is_active
      FROM riders r
      JOIN users u ON r.user_id = u.id
      WHERE r.id = ?
    `, [req.params.riderId]);
    
    if (riders.length === 0) {
      return res.status(404).json({ message: 'Rider not found' });
    }
    res.json({ message: 'Rider retrieved', data: riders[0] });
  } catch (error) {
    console.error('Error fetching rider:', error);
    res.status(500).json({ message: 'Failed to fetch rider' });
  }
});

router.get('/email/:email', async (req, res) => {
  try {
    const [riders] = await db.execute(`
      SELECT 
        r.id, u.id as user_id, u.full_name, u.email, u.phone_number,
        r.emergency_contact_name, r.emergency_contact_phone,
        r.preferred_payment_method, r.created_at, u.is_verified, u.is_active
      FROM riders r
      JOIN users u ON r.user_id = u.id
      WHERE u.email = ?
    `, [req.params.email]);
    
    if (riders.length === 0) {
      return res.status(404).json({ message: 'Rider not found' });
    }
    res.json({ message: 'Rider retrieved', data: riders[0] });
  } catch (error) {
    console.error('Error fetching rider:', error);
    res.status(500).json({ message: 'Failed to fetch rider' });
  }
});

// Get rides for specific rider
router.get('/:riderId/rides', async (req, res) => {
  try {
    const [rides] = await db.execute(`
      SELECT 
        r.id, r.ride_id, r.pickup_location, r.destination, r.ride_type,
        r.status, r.estimated_fare, r.final_fare, r.created_at, r.completed_at,
        ud.full_name as driver_name, v.make, v.model, v.plate_number
      FROM rides r
      JOIN riders rd ON r.rider_id = rd.id
      LEFT JOIN drivers d ON r.driver_id = d.id
      LEFT JOIN users ud ON d.user_id = ud.id
      LEFT JOIN vehicles v ON d.id = v.driver_id AND v.is_active = TRUE
      WHERE rd.id = ?
      ORDER BY r.created_at DESC
    `, [req.params.riderId]);
    
    res.json({ message: 'Rider rides retrieved', count: rides.length, data: rides });
  } catch (error) {
    console.error('Error fetching rider rides:', error);
    res.status(500).json({ message: 'Failed to fetch rider rides' });
  }
});

// Protected routes - Apply authentication middleware BEFORE defining the routes
router.use(authenticateToken);
router.use(requireRider);

// Profile routes
router.get('/profile', getRiderProfile);
router.put('/profile', updateRiderProfile);

// Ride routes
router.get('/rides/history', getRideHistory);
router.get('/rides/current', getRiderCurrentRide);
router.post('/rides/current/cancel', cancelCurrentRide);

// IMPORTANT: This is the main ride request endpoint your frontend uses
router.post('/rides/request', requestRide);

// Legacy routes (keeping for backward compatibility)
router.get('/rides/current-legacy', getCurrentRide);
router.post('/rides/request-legacy', requestRideLegacy);
router.post('/rides/:rideId/cancel-legacy', cancelRide);

// Rating route
router.post('/rides/:rideId/rate', rateDriver);

module.exports = router;