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

const router = express.Router();

// All driver routes require authentication and driver role
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