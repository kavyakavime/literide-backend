// src/routes/rides.js
const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const {
  getAllRides,
  getRideById,
  searchAvailableDrivers,
  getRideStatistics
} = require('../controllers/ridesController');

const router = express.Router();

// All ride routes require authentication
router.use(authenticateToken);

// General ride routes
router.get('/', getAllRides);
router.get('/statistics', getRideStatistics);
router.get('/search-drivers', searchAvailableDrivers);
router.get('/:rideId', getRideById);

module.exports = router;