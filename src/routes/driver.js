// src/routes/driver.js
const express = require('express');
const { authenticateToken, requireDriver } = require('../middleware/auth');
const {
  getDriverProfile,
  updateDriverProfile,
  updateDriverLocation,
  toggleAvailability,
  getVehicleInfo,
  updateVehicleInfo,
  getPendingRideRequests,
  acceptRideRequest,
  declineRideRequest,
  getCurrentRide,
  updateRideStatus,
  completeRide,
  getRideHistory,
  getEarnings,
  rateRider
} = require('../controllers/driverController');
const db = require('../config/database');

const router = express.Router();

// GET endpoints for viewing driver data (no auth required for development)
router.get('/all', async (req, res) => {
  try {
    const [drivers] = await db.execute(`
      SELECT 
        d.id, u.full_name, u.email, u.phone_number,
        d.license_number, d.current_location_address, d.is_available, 
        d.is_verified, d.rating, d.total_rides, d.total_earnings,
        v.make, v.model, v.plate_number, v.vehicle_type, v.color
      FROM drivers d
      JOIN users u ON d.user_id = u.id
      LEFT JOIN vehicles v ON d.id = v.driver_id AND v.is_active = TRUE
      ORDER BY d.created_at DESC
    `);
    res.json({ message: 'All drivers retrieved', count: drivers.length, data: drivers });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch drivers' });
  }
});

router.get('/available', async (req, res) => {
  try {
    const [drivers] = await db.execute(`
      SELECT 
        d.id, u.full_name, u.phone_number, d.current_location_address, d.rating,
        v.make, v.model, v.plate_number, v.vehicle_type, v.color
      FROM drivers d
      JOIN users u ON d.user_id = u.id
      LEFT JOIN vehicles v ON d.id = v.driver_id AND v.is_active = TRUE
      WHERE d.is_available = TRUE AND d.is_verified = TRUE
      ORDER BY d.rating DESC
    `);
    res.json({ message: 'Available drivers retrieved', count: drivers.length, data: drivers });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch available drivers' });
  }
});

router.get('/id/:driverId', async (req, res) => {
  try {
    const [drivers] = await db.execute(`
      SELECT 
        d.id, u.id as user_id, u.full_name, u.email, u.phone_number,
        d.license_number, d.current_location_address, d.is_available, 
        d.is_verified, d.rating, d.total_rides, d.total_earnings, d.created_at,
        v.make, v.model, v.plate_number, v.vehicle_type, v.color, v.year
      FROM drivers d
      JOIN users u ON d.user_id = u.id
      LEFT JOIN vehicles v ON d.id = v.driver_id AND v.is_active = TRUE
      WHERE d.id = ?
    `, [req.params.driverId]);
    
    if (drivers.length === 0) {
      return res.status(404).json({ message: 'Driver not found' });
    }
    res.json({ message: 'Driver retrieved', data: drivers[0] });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch driver' });
  }
});

router.get('/email/:email', async (req, res) => {
  try {
    const [drivers] = await db.execute(`
      SELECT 
        d.id, u.id as user_id, u.full_name, u.email, u.phone_number,
        d.license_number, d.current_location_address, d.is_available, 
        d.is_verified, d.rating, d.total_rides, d.total_earnings, d.created_at,
        v.make, v.model, v.plate_number, v.vehicle_type, v.color, v.year
      FROM drivers d
      JOIN users u ON d.user_id = u.id
      LEFT JOIN vehicles v ON d.id = v.driver_id AND v.is_active = TRUE
      WHERE u.email = ?
    `, [req.params.email]);
    
    if (drivers.length === 0) {
      return res.status(404).json({ message: 'Driver not found' });
    }
    res.json({ message: 'Driver retrieved', data: drivers[0] });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch driver' });
  }
});

// Get rides for specific driver
router.get('/:driverId/rides', async (req, res) => {
  try {
    const [rides] = await db.execute(`
      SELECT 
        r.id, r.ride_id, r.pickup_location, r.destination, r.ride_type,
        r.status, r.estimated_fare, r.final_fare, r.created_at, r.completed_at,
        ur.full_name as rider_name
      FROM rides r
      JOIN drivers d ON r.driver_id = d.id
      JOIN riders rd ON r.rider_id = rd.id
      JOIN users ur ON rd.user_id = ur.id
      WHERE d.id = ?
      ORDER BY r.created_at DESC
    `, [req.params.driverId]);
    
    res.json({ message: 'Driver rides retrieved', count: rides.length, data: rides });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch driver rides' });
  }
});

// Protected routes (require authentication and driver role)
router.use(authenticateToken);
router.use(requireDriver);

// Profile routes
router.get('/profile', getDriverProfile);
router.put('/profile', updateDriverProfile);
router.put('/location', updateDriverLocation);
router.put('/availability', toggleAvailability);

// Vehicle routes
router.get('/vehicle', getVehicleInfo);
router.put('/vehicle', updateVehicleInfo);

// Ride request routes
router.get('/ride-requests', getPendingRideRequests);
router.post('/ride-requests/:requestId/accept', acceptRideRequest);
router.post('/ride-requests/:requestId/decline', declineRideRequest);

// Current ride routes
router.get('/current-ride', getCurrentRide);
router.put('/current-ride/status', updateRideStatus);
router.post('/current-ride/complete', completeRide);

// History and earnings
router.get('/rides/history', getRideHistory);
router.get('/earnings', getEarnings);
router.post('/rides/:rideId/rate', rateRider);

module.exports = router;