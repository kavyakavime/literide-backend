// src/routes/rider.js
const express = require('express');
const { authenticateToken, requireRider } = require('../middleware/auth');
const {
  getRiderProfile,
  updateRiderProfile,
  getRideHistory,
  getCurrentRide,
  requestRide,
  cancelRide,
  rateDriver
} = require('../controllers/riderController');

const router = express.Router();

// All rider routes require authentication and rider role
router.use(authenticateToken);
router.use(requireRider);

// Profile routes
router.get('/profile', getRiderProfile);
router.put('/profile', updateRiderProfile);

// Ride routes
router.get('/rides/history', getRideHistory);
router.get('/rides/current', getCurrentRide);
router.post('/rides/request', requestRide);
router.post('/rides/:rideId/cancel', cancelRide);
router.post('/rides/:rideId/rate', rateDriver);

module.exports = router;