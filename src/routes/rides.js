console.log('ridesController imports:', Object.keys(require('../controllers/ridesController')));
const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const {
  getAllRides,
  getRideById,
  createRide,
  updateRideStatus,
  cancelRide,
  searchAvailableDrivers,
  getRideStatistics
} = require('../controllers/ridesController');
const db = require('../config/database');

const router = express.Router();

// GET endpoints for viewing ride data (no auth required for development)
router.get('/all', async (req, res) => {
  try {
    const [rides] = await db.execute(`
      SELECT 
        r.id, r.ride_id, r.pickup_location, r.destination, r.ride_type,
        r.status, r.estimated_fare, r.final_fare, r.distance_km, r.duration_minutes,
        r.created_at, r.completed_at, r.cancelled_at,
        ur.full_name as rider_name, ur.email as rider_email,
        ud.full_name as driver_name, ud.email as driver_email,
        v.make, v.model, v.plate_number
      FROM rides r
      JOIN riders rd ON r.rider_id = rd.id
      JOIN users ur ON rd.user_id = ur.id
      LEFT JOIN drivers d ON r.driver_id = d.id
      LEFT JOIN users ud ON d.user_id = ud.id
      LEFT JOIN vehicles v ON d.id = v.driver_id AND v.is_active = TRUE
      ORDER BY r.created_at DESC
    `);
    res.json({ message: 'All rides retrieved', count: rides.length, data: rides });
  } catch (error) {
    console.error('Error fetching rides:', error);
    res.status(500).json({ message: 'Failed to fetch rides' });
  }
});

router.get('/active', async (req, res) => {
  try {
    const [rides] = await db.execute(`
      SELECT 
        r.id, r.ride_id, r.pickup_location, r.destination, r.status, r.estimated_fare, r.otp,
        ur.full_name as rider_name, ur.phone_number as rider_phone,
        ud.full_name as driver_name, ud.phone_number as driver_phone,
        v.make, v.model, v.plate_number
      FROM rides r
      JOIN riders rd ON r.rider_id = rd.id
      JOIN users ur ON rd.user_id = ur.id
      LEFT JOIN drivers d ON r.driver_id = d.id
      LEFT JOIN users ud ON d.user_id = ud.id
      LEFT JOIN vehicles v ON d.id = v.driver_id AND v.is_active = TRUE
      WHERE r.status IN ('requested', 'accepted', 'driver_on_way', 'rider_picked_up')
      ORDER BY r.created_at DESC
    `);
    res.json({ message: 'Active rides retrieved', count: rides.length, data: rides });
  } catch (error) {
    console.error('Error fetching active rides:', error);
    res.status(500).json({ message: 'Failed to fetch active rides' });
  }
});

router.get('/status/:status', async (req, res) => {
  try {
    const { status } = req.params;
    const validStatuses = ['requested', 'accepted', 'driver_on_way', 'rider_picked_up', 'completed', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const [rides] = await db.execute(`
      SELECT 
        r.id, r.ride_id, r.pickup_location, r.destination, r.status, r.estimated_fare, r.final_fare,
        ur.full_name as rider_name, ud.full_name as driver_name,
        v.make, v.model, v.plate_number
      FROM rides r
      JOIN riders rd ON r.rider_id = rd.id
      JOIN users ur ON rd.user_id = ur.id
      LEFT JOIN drivers d ON r.driver_id = d.id
      LEFT JOIN users ud ON d.user_id = ud.id
      LEFT JOIN vehicles v ON d.id = v.driver_id AND v.is_active = TRUE
      WHERE r.status = ?
      ORDER BY r.created_at DESC
    `, [status]);

    res.json({ message: `${status} rides retrieved`, count: rides.length, data: rides });
  } catch (error) {
    console.error('Error fetching rides by status:', error);
    res.status(500).json({ message: 'Failed to fetch rides' });
  }
});

router.get('/ride/:rideId', async (req, res) => {
  try {
    const [rides] = await db.execute(`
      SELECT 
        r.id, r.ride_id, r.pickup_location, r.destination, r.ride_type,
        r.status, r.estimated_fare, r.final_fare, r.distance_km, r.duration_minutes,
        r.otp, r.created_at, r.completed_at, r.cancelled_at,
        ur.full_name as rider_name, ur.email as rider_email, ur.phone_number as rider_phone,
        ud.full_name as driver_name, ud.email as driver_email, ud.phone_number as driver_phone,
        v.make, v.model, v.plate_number, v.color
      FROM rides r
      JOIN riders rd ON r.rider_id = rd.id
      JOIN users ur ON rd.user_id = ur.id
      LEFT JOIN drivers d ON r.driver_id = d.id
      LEFT JOIN users ud ON d.user_id = ud.id
      LEFT JOIN vehicles v ON d.id = v.driver_id AND v.is_active = TRUE
      WHERE r.ride_id = ?
    `, [req.params.rideId]);
    
    if (rides.length === 0) {
      return res.status(404).json({ message: 'Ride not found' });
    }
    res.json({ message: 'Ride retrieved', data: rides[0] });
  } catch (error) {
    console.error('Error fetching ride:', error);
    res.status(500).json({ message: 'Failed to fetch ride' });
  }
});

// Statistics endpoint
router.get('/stats', async (req, res) => {
  try {
    const [stats] = await db.execute(`
      SELECT 
        COUNT(*) as total_rides,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_rides,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_rides,
        COUNT(CASE WHEN status IN ('requested', 'accepted', 'driver_on_way', 'rider_picked_up') THEN 1 END) as active_rides,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN final_fare END), 0) as total_revenue
      FROM rides
    `);
    res.json({ message: 'Ride statistics retrieved', data: stats[0] });
  } catch (error) {
    console.error('Error fetching ride statistics:', error);
    res.status(500).json({ message: 'Failed to fetch statistics' });
  }
});

// Protected routes (require authentication)
router.use(authenticateToken);

// POST routes for creating and managing rides
router.post('/create', createRide);
router.post('/:rideId/cancel', cancelRide);
router.put('/:rideId/status', updateRideStatus);

// General ride routes
router.get('/', getAllRides);
router.get('/statistics', getRideStatistics);
router.get('/search-drivers', searchAvailableDrivers);
router.get('/:rideId', getRideById);

module.exports = router;