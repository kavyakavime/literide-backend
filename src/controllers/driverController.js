// src/controllers/driverController.js
const db = require('../config/database');

const getDriverProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const [drivers] = await db.execute(`
      SELECT 
        u.id, u.full_name, u.email, u.phone_number,
        d.license_number, d.license_expiry, d.profile_picture_url,
        d.current_location_lat, d.current_location_lng, d.current_location_address,
        d.is_available, d.is_verified, d.rating, d.total_rides, d.total_earnings,
        d.created_at
      FROM users u
      JOIN drivers d ON u.id = d.user_id
      WHERE u.id = ?
    `, [userId]);

    if (drivers.length === 0) {
      return res.status(404).json({ message: 'Driver profile not found' });
    }

    const driver = drivers[0];
    res.json({
      profile: {
        id: driver.id,
        fullName: driver.full_name,
        email: driver.email,
        phoneNumber: driver.phone_number,
        licenseNumber: driver.license_number,
        licenseExpiry: driver.license_expiry,
        profilePicture: driver.profile_picture_url,
        currentLocation: {
          lat: driver.current_location_lat,
          lng: driver.current_location_lng,
          address: driver.current_location_address
        },
        isAvailable: driver.is_available,
        isVerified: driver.is_verified,
        rating: driver.rating,
        totalRides: driver.total_rides,
        totalEarnings: driver.total_earnings,
        memberSince: driver.created_at
      }
    });
  } catch (error) {
    console.error('Get driver profile error:', error);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
};

const updateDriverProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentLocationAddress } = req.body;

    await db.execute(`
      UPDATE drivers 
      SET current_location_address = ?
      WHERE user_id = ?
    `, [currentLocationAddress, userId]);

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update driver profile error:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
};

const updateDriverLocation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { lat, lng, address } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    await db.execute(`
      UPDATE drivers 
      SET current_location_lat = ?, current_location_lng = ?, current_location_address = ?
      WHERE user_id = ?
    `, [lat, lng, address, userId]);

    res.json({ message: 'Location updated successfully' });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ message: 'Failed to update location' });
  }
};

const toggleAvailability = async (req, res) => {
  try {
    const userId = req.user.id;
    const { isAvailable } = req.body;

    await db.execute(`
      UPDATE drivers 
      SET is_available = ?
      WHERE user_id = ?
    `, [isAvailable, userId]);

    res.json({ 
      message: `Driver ${isAvailable ? 'is now available' : 'went offline'}`,
      isAvailable 
    });
  } catch (error) {
    console.error('Toggle availability error:', error);
    res.status(500).json({ message: 'Failed to update availability' });
  }
};

const getVehicleInfo = async (req, res) => {
  try {
    const userId = req.user.id;

    const [vehicles] = await db.execute(`
      SELECT 
        v.id, v.vehicle_type, v.make, v.model, v.year, v.color,
        v.plate_number, v.registration_number, v.insurance_expiry,
        v.is_verified, v.is_active
      FROM vehicles v
      JOIN drivers d ON v.driver_id = d.id
      WHERE d.user_id = ? AND v.is_active = TRUE
    `, [userId]);

    if (vehicles.length === 0) {
      return res.status(404).json({ message: 'Vehicle information not found' });
    }

    const vehicle = vehicles[0];
    res.json({
      vehicle: {
        id: vehicle.id,
        type: vehicle.vehicle_type,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        color: vehicle.color,
        plateNumber: vehicle.plate_number,
        registrationNumber: vehicle.registration_number,
        insuranceExpiry: vehicle.insurance_expiry,
        isVerified: vehicle.is_verified,
        isActive: vehicle.is_active
      }
    });
  } catch (error) {
    console.error('Get vehicle info error:', error);
    res.status(500).json({ message: 'Failed to fetch vehicle information' });
  }
};

const updateVehicleInfo = async (req, res) => {
  try {
    const userId = req.user.id;
    const { vehicleType, make, model, year, color, plateNumber } = req.body;

    // Get driver ID
    const [drivers] = await db.execute(
      'SELECT id FROM drivers WHERE user_id = ?',
      [userId]
    );

    if (drivers.length === 0) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    const driverId = drivers[0].id;

    // Update vehicle info
    await db.execute(`
      UPDATE vehicles 
      SET vehicle_type = ?, make = ?, model = ?, year = ?, color = ?, plate_number = ?
      WHERE driver_id = ? AND is_active = TRUE
    `, [vehicleType, make, model, year, color, plateNumber, driverId]);

    res.json({ message: 'Vehicle information updated successfully' });
  } catch (error) {
    console.error('Update vehicle info error:', error);
    res.status(500).json({ message: 'Failed to update vehicle information' });
  }
};

const getPendingRideRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    const [requests] = await db.execute(`
      SELECT 
        rr.id as request_id, rr.estimated_fare, rr.estimated_eta,
        r.ride_id, r.pickup_location, r.destination, r.ride_type,
        u.full_name as rider_name, u.phone_number as rider_phone,
        rr.expires_at
      FROM ride_requests rr
      JOIN rides r ON rr.ride_id = r.id
      JOIN riders rd ON r.rider_id = rd.id
      JOIN users u ON rd.user_id = u.id
      JOIN drivers d ON rr.driver_id = d.id
      WHERE d.user_id = ? 
        AND rr.request_status = 'pending' 
        AND rr.expires_at > NOW()
        AND r.status = 'requested'
      ORDER BY rr.requested_at ASC
    `, [userId]);

    res.json({
      requests: requests.map(req => ({
        requestId: req.request_id,
        rideId: req.ride_id,
        pickup: req.pickup_location,
        destination: req.destination,
        rideType: req.ride_type,
        estimatedFare: req.estimated_fare,
        estimatedEta: req.estimated_eta,
        rider: {
          name: req.rider_name,
          phone: req.rider_phone
        },
        expiresAt: req.expires_at
      }))
    });
  } catch (error) {
    console.error('Get pending ride requests error:', error);
    res.status(500).json({ message: 'Failed to fetch ride requests' });
  }
};

const acceptRideRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { requestId } = req.params;

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Get request details
      const [requests] = await connection.execute(`
        SELECT rr.ride_id, d.id as driver_id
        FROM ride_requests rr
        JOIN drivers d ON rr.driver_id = d.id
        WHERE rr.id = ? AND d.user_id = ? AND rr.request_status = 'pending'
      `, [requestId, userId]);

      if (requests.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({ message: 'Ride request not found or already processed' });
      }

      const { ride_id, driver_id } = requests[0];

      // Update ride status and assign driver
      await connection.execute(`
        UPDATE rides 
        SET driver_id = ?, status = 'accepted', accepted_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status = 'requested'
      `, [driver_id, ride_id]);

      // Update this request as accepted
      await connection.execute(`
        UPDATE ride_requests 
        SET request_status = 'accepted', responded_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [requestId]);

      // Decline all other pending requests for this ride
      await connection.execute(`
        UPDATE ride_requests 
        SET request_status = 'expired'
        WHERE ride_id = ? AND id != ? AND request_status = 'pending'
      `, [ride_id, requestId]);

      // Set driver as unavailable
      await connection.execute(`
        UPDATE drivers 
        SET is_available = FALSE
        WHERE id = ?
      `, [driver_id]);

      await connection.commit();
      connection.release();

      res.json({ message: 'Ride request accepted successfully' });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Accept ride request error:', error);
    res.status(500).json({ message: 'Failed to accept ride request' });
  }
};

const declineRideRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { requestId } = req.params;

    await db.execute(`
      UPDATE ride_requests rr
      JOIN drivers d ON rr.driver_id = d.id
      SET rr.request_status = 'declined', rr.responded_at = CURRENT_TIMESTAMP
      WHERE rr.id = ? AND d.user_id = ? AND rr.request_status = 'pending'
    `, [requestId, userId]);

    res.json({ message: 'Ride request declined' });
  } catch (error) {
    console.error('Decline ride request error:', error);
    res.status(500).json({ message: 'Failed to decline ride request' });
  }
};

const getCurrentRide = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rides] = await db.execute(`
      SELECT 
        r.id, r.ride_id, r.pickup_location, r.destination,
        r.status, r.estimated_fare, r.otp, r.accepted_at,
        u.full_name as rider_name, u.phone_number as rider_phone
      FROM rides r
      JOIN drivers d ON r.driver_id = d.id
      JOIN riders rd ON r.rider_id = rd.id
      JOIN users u ON rd.user_id = u.id
      WHERE d.user_id = ? AND r.status IN ('accepted', 'driver_on_way', 'rider_picked_up')
      ORDER BY r.accepted_at DESC
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
        rider: {
          name: ride.rider_name,
          phone: ride.rider_phone
        },
        acceptedAt: ride.accepted_at
      }
    });
  } catch (error) {
    console.error('Get current ride error:', error);
    res.status(500).json({ message: 'Failed to fetch current ride' });
  }
};

const updateRideStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.body;

    const validStatuses = ['driver_on_way', 'rider_picked_up'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    await db.execute(`
      UPDATE rides r
      JOIN drivers d ON r.driver_id = d.id
      SET r.status = ?, r.started_at = CASE WHEN ? = 'rider_picked_up' THEN CURRENT_TIMESTAMP ELSE r.started_at END
      WHERE d.user_id = ? AND r.status IN ('accepted', 'driver_on_way')
    `, [status, status, userId]);

    res.json({ message: 'Ride status updated successfully' });
  } catch (error) {
    console.error('Update ride status error:', error);
    res.status(500).json({ message: 'Failed to update ride status' });
  }
};

const completeRide = async (req, res) => {
  try {
    const userId = req.user.id;
    const { finalFare, distanceKm, durationMinutes } = req.body;

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Get current ride
      const [rides] = await connection.execute(`
        SELECT r.id, r.estimated_fare, d.id as driver_id
        FROM rides r
        JOIN drivers d ON r.driver_id = d.id
        WHERE d.user_id = ? AND r.status = 'rider_picked_up'
      `, [userId]);

      if (rides.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({ message: 'No active ride to complete' });
      }

      const ride = rides[0];
      const fare = finalFare || ride.estimated_fare;

      // Complete the ride
      await connection.execute(`
        UPDATE rides 
        SET status = 'completed', completed_at = CURRENT_TIMESTAMP, 
            final_fare = ?, distance_km = ?, duration_minutes = ?
        WHERE id = ?
      `, [fare, distanceKm, durationMinutes, ride.id]);

      // Update driver stats
      await connection.execute(`
        UPDATE drivers 
        SET total_rides = total_rides + 1, 
            total_earnings = total_earnings + ?,
            is_available = TRUE
        WHERE id = ?
      `, [fare, ride.driver_id]);

      // Create payment record
      await connection.execute(`
        INSERT INTO payments (ride_id, amount, payment_method, payment_status)
        VALUES (?, ?, 'cash', 'completed')
      `, [ride.id, fare]);

      // Create driver earnings record
      const commissionRate = 15; // 15% commission
      const commissionAmount = (fare * commissionRate) / 100;
      const netAmount = fare - commissionAmount;

      await connection.execute(`
        INSERT INTO driver_earnings (driver_id, ride_id, gross_amount, commission_rate, commission_amount, net_amount, payment_status)
        VALUES (?, ?, ?, ?, ?, ?, 'pending')
      `, [ride.driver_id, ride.id, fare, commissionRate, commissionAmount, netAmount]);

      await connection.commit();
      connection.release();

      res.json({ 
        message: 'Ride completed successfully',
        rideDetails: {
          finalFare: fare,
          earnings: netAmount,
          commission: commissionAmount
        }
      });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Complete ride error:', error);
    res.status(500).json({ message: 'Failed to complete ride' });
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
        u.full_name as rider_name,
        rt.rating, rt.comment
      FROM rides r
      JOIN drivers d ON r.driver_id = d.id
      JOIN riders rd ON r.rider_id = rd.id
      JOIN users u ON rd.user_id = u.id
      LEFT JOIN ratings rt ON r.id = rt.ride_id AND rt.rater_id = u.id
      WHERE d.user_id = ?
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `, [userId, limit, offset]);

    const [countResult] = await db.execute(`
      SELECT COUNT(*) as total
      FROM rides r
      JOIN drivers d ON r.driver_id = d.id
      WHERE d.user_id = ?
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
        rider: {
          name: ride.rider_name
        },
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

const getEarnings = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get driver ID
    const [drivers] = await db.execute(
      'SELECT id FROM drivers WHERE user_id = ?',
      [userId]
    );

    if (drivers.length === 0) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    const driverId = drivers[0].id;

    // Get today's earnings
    const [todayEarnings] = await db.execute(`
      SELECT COALESCE(SUM(net_amount), 0) as today_earnings
      FROM driver_earnings 
      WHERE driver_id = ? AND DATE(created_at) = CURDATE()
    `, [driverId]);

    // Get this week's earnings
    const [weekEarnings] = await db.execute(`
      SELECT COALESCE(SUM(net_amount), 0) as week_earnings
      FROM driver_earnings 
      WHERE driver_id = ? AND YEARWEEK(created_at) = YEARWEEK(NOW())
    `, [driverId]);

    // Get this month's earnings
    const [monthEarnings] = await db.execute(`
      SELECT COALESCE(SUM(net_amount), 0) as month_earnings
      FROM driver_earnings 
      WHERE driver_id = ? AND YEAR(created_at) = YEAR(NOW()) AND MONTH(created_at) = MONTH(NOW())
    `, [driverId]);

    res.json({
      earnings: {
        today: parseFloat(todayEarnings[0].today_earnings),
        thisWeek: parseFloat(weekEarnings[0].week_earnings),
        thisMonth: parseFloat(monthEarnings[0].month_earnings)
      }
    });
  } catch (error) {
    console.error('Get earnings error:', error);
    res.status(500).json({ message: 'Failed to fetch earnings' });
  }
};

const rateRider = async (req, res) => {
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
      SELECT r.id, r.rider_id, rd.user_id as rider_user_id
      FROM rides r
      JOIN drivers d ON r.driver_id = d.id
      JOIN riders rd ON r.rider_id = rd.id
      WHERE d.user_id = ? AND r.ride_id = ? AND r.status = 'completed'
    `, [userId, rideId]);

    if (rides.length === 0) {
      return res.status(404).json({ message: 'Completed ride not found' });
    }

    const ride = rides[0];

    // Check if already rated
    const [existingRating] = await db.execute(`
      SELECT id FROM ratings 
      WHERE ride_id = ? AND rater_id = ? AND rated_id = ?
    `, [ride.id, userId, ride.rider_user_id]);

    if (existingRating.length > 0) {
      return res.status(400).json({ message: 'You have already rated this ride' });
    }

    // Insert rating
    await db.execute(`
      INSERT INTO ratings (ride_id, rater_id, rated_id, rating, comment)
      VALUES (?, ?, ?, ?, ?)
    `, [ride.id, userId, ride.rider_user_id, rating, comment]);

    res.json({ message: 'Rating submitted successfully' });
  } catch (error) {
    console.error('Rate rider error:', error);
    res.status(500).json({ message: 'Failed to submit rating' });
  }
};

module.exports = {
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
};