// src/controllers/riderController.js
const db = require('../config/database');

const getRiderProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const [riders] = await db.execute(`
      SELECT 
        u.id, u.full_name, u.email, u.phone_number,
        r.profile_picture_url, r.emergency_contact_name, r.emergency_contact_phone,
        r.preferred_payment_method, r.created_at
      FROM users u
      JOIN riders r ON u.id = r.user_id
      WHERE u.id = ?
    `, [userId]);

    if (riders.length === 0) {
      return res.status(404).json({ message: 'Rider profile not found' });
    }

    const rider = riders[0];
    res.json({
      profile: {
        id: rider.id,
        fullName: rider.full_name,
        email: rider.email,
        phoneNumber: rider.phone_number,
        profilePicture: rider.profile_picture_url,
        emergencyContact: {
          name: rider.emergency_contact_name,
          phone: rider.emergency_contact_phone
        },
        preferredPaymentMethod: rider.preferred_payment_method,
        memberSince: rider.created_at
      }
    });
  } catch (error) {
    console.error('Get rider profile error:', error);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
};

const updateRiderProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      emergencyContactName, 
      emergencyContactPhone, 
      preferredPaymentMethod 
    } = req.body;

    await db.execute(`
      UPDATE riders 
      SET emergency_contact_name = ?, emergency_contact_phone = ?, preferred_payment_method = ?
      WHERE user_id = ?
    `, [emergencyContactName, emergencyContactPhone, preferredPaymentMethod, userId]);

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update rider profile error:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
};

const getRideHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const [rides] = await db.execute(`
      SELECT 
        r.id, r.ride_id, r.pickup_location, r.destination, 
        r.status, r.final_fare, r.distance_km, r.duration_minutes,
        r.completed_at, r.cancelled_at, r.created_at,
        u.full_name as driver_name,
        v.make, v.model, v.plate_number,
        rt.rating, rt.comment
      FROM rides r
      JOIN riders rd ON r.rider_id = rd.id
      LEFT JOIN drivers d ON r.driver_id = d.id
      LEFT JOIN users u ON d.user_id = u.id
      LEFT JOIN vehicles v ON d.id = v.driver_id AND v.is_active = TRUE
      LEFT JOIN ratings rt ON r.id = rt.ride_id AND rt.rater_id = ?
      WHERE rd.user_id = ?
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `, [userId, userId, limit, offset]);

    const [countResult] = await db.execute(`
      SELECT COUNT(*) as total
      FROM rides r
      JOIN riders rd ON r.rider_id = rd.id
      WHERE rd.user_id = ?
    `, [userId]);

    const total = countResult[0].total;

    res.json({
      rides: rides.map(ride => ({
        rideId: ride.ride_id,
        pickup: ride.pickup_location,
        destination: ride.destination,
        status: ride.status,
        fare: ride.final_fare,
        distance: ride.distance_km,
        duration: ride.duration_minutes,
        date: ride.completed_at || ride.cancelled_at || ride.created_at,
        driver: ride.driver_name ? {
          name: ride.driver_name,
          vehicle: `${ride.make} ${ride.model}`,
          plateNumber: ride.plate_number
        } : null,
        rating: ride.rating,
        comment: ride.comment
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get ride history error:', error);
    res.status(500).json({ message: 'Failed to fetch ride history' });
  }
};

const getCurrentRide = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rides] = await db.execute(`
      SELECT 
        r.id, r.ride_id, r.pickup_location, r.destination,
        r.status, r.estimated_fare, r.otp, r.created_at,
        u.full_name as driver_name, u.phone_number as driver_phone,
        d.rating as driver_rating,
        v.make, v.model, v.plate_number
      FROM rides r
      JOIN riders rd ON r.rider_id = rd.id
      LEFT JOIN drivers d ON r.driver_id = d.id
      LEFT JOIN users u ON d.user_id = u.id
      LEFT JOIN vehicles v ON d.id = v.driver_id AND v.is_active = TRUE
      WHERE rd.user_id = ? AND r.status IN ('requested', 'accepted', 'driver_on_way', 'rider_picked_up')
      ORDER BY r.created_at DESC
      LIMIT 1
    `, [userId]);

    if (rides.length === 0) {
      return res.json({ currentRide: null });
    }

    const ride = rides[0];
    res.json({
      currentRide: {
        rideId: ride.ride_id,
        pickup: ride.pickup_location,
        destination: ride.destination,
        status: ride.status,
        fare: ride.estimated_fare,
        otp: ride.otp,
        driver: ride.driver_name ? {
          name: ride.driver_name,
          phone: ride.driver_phone,
          rating: ride.driver_rating,
          vehicle: `${ride.make} ${ride.model}`,
          plateNumber: ride.plate_number
        } : null,
        requestedAt: ride.created_at
      }
    });
  } catch (error) {
    console.error('Get current ride error:', error);
    res.status(500).json({ message: 'Failed to fetch current ride' });
  }
};

const requestRide = async (req, res) => {
  try {
    const userId = req.user.id;
    const { pickupLocation, destination, rideType, when } = req.body;

    // Validation
    if (!pickupLocation || !destination || !rideType) {
      return res.status(400).json({ message: 'Pickup location, destination, and ride type are required' });
    }

    // Check if rider has an active ride
    const [activeRides] = await db.execute(`
      SELECT r.id 
      FROM rides r
      JOIN riders rd ON r.rider_id = rd.id
      WHERE rd.user_id = ? AND r.status IN ('requested', 'accepted', 'driver_on_way', 'rider_picked_up')
    `, [userId]);

    if (activeRides.length > 0) {
      return res.status(400).json({ message: 'You already have an active ride' });
    }

    // Get rider ID
    const [riders] = await db.execute(
      'SELECT id FROM riders WHERE user_id = ?',
      [userId]
    );

    if (riders.length === 0) {
      return res.status(404).json({ message: 'Rider profile not found' });
    }

    const riderId = riders[0].id;

    // Generate ride ID and OTP
    const rideId = `R${Date.now().toString().slice(-6)}`;
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    // Calculate estimated fare (simple calculation)
    const estimatedFare = Math.floor(Math.random() * 20) + 10; // $10-30

    // Create ride request
    const [result] = await db.execute(`
      INSERT INTO rides (
        ride_id, rider_id, pickup_location, destination, 
        ride_type, estimated_fare, otp, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'requested')
    `, [rideId, riderId, pickupLocation, destination, rideType, estimatedFare, otp]);

    // Find available drivers (simple implementation)
    const [availableDrivers] = await db.execute(`
      SELECT d.id, d.user_id, u.full_name, v.make, v.model, v.plate_number
      FROM drivers d
      JOIN users u ON d.user_id = u.id
      JOIN vehicles v ON d.id = v.driver_id AND v.is_active = TRUE
      WHERE d.is_available = TRUE AND d.is_verified = TRUE
      LIMIT 5
    `);

    // Create ride requests for available drivers
    const rideRequestPromises = availableDrivers.map(driver => {
      const eta = `${Math.floor(Math.random() * 10) + 2} mins`;
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      return db.execute(`
        INSERT INTO ride_requests (
          ride_id, driver_id, estimated_fare, estimated_eta, expires_at
        ) VALUES (?, ?, ?, ?, ?)
      `, [result.insertId, driver.id, estimatedFare, eta, expiresAt]);
    });

    await Promise.all(rideRequestPromises);

    res.status(201).json({
      message: 'Ride requested successfully',
      ride: {
        rideId,
        pickup: pickupLocation,
        destination,
        estimatedFare,
        status: 'requested',
        availableDrivers: availableDrivers.length
      }
    });
  } catch (error) {
    console.error('Request ride error:', error);
    res.status(500).json({ message: 'Failed to request ride' });
  }
};

const cancelRide = async (req, res) => {
  try {
    const userId = req.user.id;
    const { rideId } = req.params;
    const { reason } = req.body;

    // Find the ride
    const [rides] = await db.execute(`
      SELECT r.id, r.status 
      FROM rides r
      JOIN riders rd ON r.rider_id = rd.id
      WHERE rd.user_id = ? AND r.ride_id = ?
    `, [userId, rideId]);

    if (rides.length === 0) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    const ride = rides[0];

    // Check if ride can be cancelled
    if (!['requested', 'accepted', 'driver_on_way'].includes(ride.status)) {
      return res.status(400).json({ message: 'Ride cannot be cancelled at this stage' });
    }

    // Cancel the ride
    await db.execute(`
      UPDATE rides 
      SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP, cancellation_reason = ?
      WHERE id = ?
    `, [reason || 'Cancelled by rider', ride.id]);

    // Cancel pending ride requests
    await db.execute(`
      UPDATE ride_requests 
      SET request_status = 'expired'
      WHERE ride_id = ? AND request_status = 'pending'
    `, [ride.id]);

    res.json({ message: 'Ride cancelled successfully' });
  } catch (error) {
    console.error('Cancel ride error:', error);
    res.status(500).json({ message: 'Failed to cancel ride' });
  }
};

const rateDriver = async (req, res) => {
  try {
    const userId = req.user.id;
    const { rideId } = req.params;
    const { rating, comment } = req.body;

    // Validation
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    // Find the completed ride
    const [rides] = await db.execute(`
      SELECT r.id, r.driver_id, d.user_id as driver_user_id
      FROM rides r
      JOIN riders rd ON r.rider_id = rd.id
      JOIN drivers d ON r.driver_id = d.id
      WHERE rd.user_id = ? AND r.ride_id = ? AND r.status = 'completed'
    `, [userId, rideId]);

    if (rides.length === 0) {
      return res.status(404).json({ message: 'Completed ride not found' });
    }

    const ride = rides[0];

    // Check if already rated
    const [existingRating] = await db.execute(`
      SELECT id FROM ratings 
      WHERE ride_id = ? AND rater_id = ? AND rated_id = ?
    `, [ride.id, userId, ride.driver_user_id]);

    if (existingRating.length > 0) {
      return res.status(400).json({ message: 'You have already rated this ride' });
    }

    // Insert rating
    await db.execute(`
      INSERT INTO ratings (ride_id, rater_id, rated_id, rating, comment)
      VALUES (?, ?, ?, ?, ?)
    `, [ride.id, userId, ride.driver_user_id, rating, comment]);

    // Update driver's average rating
    const [avgRating] = await db.execute(`
      SELECT AVG(rating) as avg_rating, COUNT(*) as total_ratings
      FROM ratings 
      WHERE rated_id = ?
    `, [ride.driver_user_id]);

    await db.execute(`
      UPDATE drivers 
      SET rating = ?
      WHERE user_id = ?
    `, [avgRating[0].avg_rating, ride.driver_user_id]);

    res.json({ message: 'Rating submitted successfully' });
  } catch (error) {
    console.error('Rate driver error:', error);
    res.status(500).json({ message: 'Failed to submit rating' });
  }
};

module.exports = {
  getRiderProfile,
  updateRiderProfile,
  getRideHistory,
  getCurrentRide,
  requestRide,
  cancelRide,
  rateDriver
};