// src/controllers/ridesController.js
const db = require('../config/database');

const getAllRides = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.user_type;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const status = req.query.status;

    let query, countQuery, params;

    if (userType === 'rider') {
      // Get rides for rider
      query = `
        SELECT 
          r.id, r.ride_id, r.pickup_location, r.destination, 
          r.status, r.final_fare, r.estimated_fare, r.created_at,
          u.full_name as driver_name,
          v.make, v.model, v.plate_number
        FROM rides r
        JOIN riders rd ON r.rider_id = rd.id
        LEFT JOIN drivers d ON r.driver_id = d.id
        LEFT JOIN users u ON d.user_id = u.id
        LEFT JOIN vehicles v ON d.id = v.driver_id AND v.is_active = TRUE
        WHERE rd.user_id = ?
      `;
      
      countQuery = `
        SELECT COUNT(*) as total
        FROM rides r
        JOIN riders rd ON r.rider_id = rd.id
        WHERE rd.user_id = ?
      `;
      
      params = [userId];
    } else {
      // Get rides for driver
      query = `
        SELECT 
          r.id, r.ride_id, r.pickup_location, r.destination, 
          r.status, r.final_fare, r.estimated_fare, r.created_at,
          u.full_name as rider_name
        FROM rides r
        JOIN drivers d ON r.driver_id = d.id
        JOIN riders rd ON r.rider_id = rd.id
        JOIN users u ON rd.user_id = u.id
        WHERE d.user_id = ?
      `;
      
      countQuery = `
        SELECT COUNT(*) as total
        FROM rides r
        JOIN drivers d ON r.driver_id = d.id
        WHERE d.user_id = ?
      `;
      
      params = [userId];
    }

    // Add status filter if provided
    if (status) {
      query += ' AND r.status = ?';
      countQuery += ' AND r.status = ?';
      params.push(status);
    }

    query += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rides] = await db.execute(query, params);
    const [countResult] = await db.execute(countQuery, params.slice(0, -2));

    const total = countResult[0].total;

    res.json({
      rides: rides.map(ride => ({
        rideId: ride.ride_id,
        pickup: ride.pickup_location,
        destination: ride.destination,
        status: ride.status,
        fare: ride.final_fare || ride.estimated_fare,
        date: ride.created_at,
        ...(userType === 'rider' && ride.driver_name ? {
          driver: {
            name: ride.driver_name,
            vehicle: `${ride.make} ${ride.model}`,
            plateNumber: ride.plate_number
          }
        } : {}),
        ...(userType === 'driver' && {
          rider: {
            name: ride.rider_name
          }
        })
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get all rides error:', error);
    res.status(500).json({ message: 'Failed to fetch rides' });
  }
};

const getRideById = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.user_type;
    const { rideId } = req.params;

    let query, params;

    if (userType === 'rider') {
      query = `
        SELECT 
          r.id, r.ride_id, r.pickup_location, r.destination, 
          r.status, r.final_fare, r.estimated_fare, r.distance_km,
          r.duration_minutes, r.otp, r.created_at, r.completed_at,
          r.cancelled_at, r.cancellation_reason,
          u.full_name as driver_name, u.phone_number as driver_phone,
          d.rating as driver_rating,
          v.make, v.model, v.plate_number, v.color,
          rt.rating as my_rating, rt.comment as my_comment
        FROM rides r
        JOIN riders rd ON r.rider_id = rd.id
        LEFT JOIN drivers d ON r.driver_id = d.id
        LEFT JOIN users u ON d.user_id = u.id
        LEFT JOIN vehicles v ON d.id = v.driver_id AND v.is_active = TRUE
        LEFT JOIN ratings rt ON r.id = rt.ride_id AND rt.rater_id = ?
        WHERE rd.user_id = ? AND r.ride_id = ?
      `;
      params = [userId, userId, rideId];
    } else {
      query = `
        SELECT 
          r.id, r.ride_id, r.pickup_location, r.destination, 
          r.status, r.final_fare, r.estimated_fare, r.distance_km,
          r.duration_minutes, r.otp, r.created_at, r.completed_at,
          r.cancelled_at, r.cancellation_reason,
          u.full_name as rider_name, u.phone_number as rider_phone,
          rt.rating as my_rating, rt.comment as my_comment,
          de.net_amount as my_earnings
        FROM rides r
        JOIN drivers d ON r.driver_id = d.id
        JOIN riders rd ON r.rider_id = rd.id
        JOIN users u ON rd.user_id = u.id
        LEFT JOIN ratings rt ON r.id = rt.ride_id AND rt.rater_id = ?
        LEFT JOIN driver_earnings de ON r.id = de.ride_id
        WHERE d.user_id = ? AND r.ride_id = ?
      `;
      params = [userId, userId, rideId];
    }

    const [rides] = await db.execute(query, params);

    if (rides.length === 0) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    const ride = rides[0];

    res.json({
      ride: {
        rideId: ride.ride_id,
        pickup: ride.pickup_location,
        destination: ride.destination,
        status: ride.status,
        fare: ride.final_fare || ride.estimated_fare,
        distance: ride.distance_km,
        duration: ride.duration_minutes,
        otp: ride.otp,
        createdAt: ride.created_at,
        completedAt: ride.completed_at,
        cancelledAt: ride.cancelled_at,
        cancellationReason: ride.cancellation_reason,
        myRating: ride.my_rating,
        myComment: ride.my_comment,
        ...(userType === 'rider' && ride.driver_name ? {
          driver: {
            name: ride.driver_name,
            phone: ride.driver_phone,
            rating: ride.driver_rating,
            vehicle: {
              make: ride.make,
              model: ride.model,
              plateNumber: ride.plate_number,
              color: ride.color
            }
          }
        } : {}),
        ...(userType === 'driver' && {
          rider: {
            name: ride.rider_name,
            phone: ride.rider_phone
          },
          earnings: ride.my_earnings
        })
      }
    });
  } catch (error) {
    console.error('Get ride by ID error:', error);
    res.status(500).json({ message: 'Failed to fetch ride details' });
  }
};

const createRide = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.user_type;
    
    if (userType !== 'rider') {
      return res.status(403).json({ message: 'Only riders can create rides' });
    }

    const { pickupLocation, destination, rideType, scheduledTime } = req.body;

    // Validation
    if (!pickupLocation || !destination || !rideType) {
      return res.status(400).json({ message: 'Pickup location, destination, and ride type are required' });
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

    // Create ride
    const [result] = await db.execute(`
      INSERT INTO rides (
        ride_id, rider_id, pickup_location, destination, 
        ride_type, estimated_fare, otp, status, scheduled_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'requested', ?)
    `, [rideId, riderId, pickupLocation, destination, rideType, estimatedFare, otp, scheduledTime || null]);

    res.status(201).json({
      message: 'Ride created successfully',
      ride: {
        id: result.insertId,
        rideId,
        pickup: pickupLocation,
        destination,
        rideType,
        estimatedFare,
        status: 'requested',
        otp
      }
    });
  } catch (error) {
    console.error('Create ride error:', error);
    res.status(500).json({ message: 'Failed to create ride' });
  }
};

const updateRideStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { rideId } = req.params;
    const { status, finalFare, distance, duration } = req.body;

    const validStatuses = ['accepted', 'driver_on_way', 'rider_picked_up', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Build update query based on status
    let updateQuery = 'UPDATE rides SET status = ?';
    let params = [status];

    if (status === 'completed') {
      updateQuery += ', completed_at = CURRENT_TIMESTAMP';
      if (finalFare) {
        updateQuery += ', final_fare = ?';
        params.push(finalFare);
      }
      if (distance) {
        updateQuery += ', distance_km = ?';
        params.push(distance);
      }
      if (duration) {
        updateQuery += ', duration_minutes = ?';
        params.push(duration);
      }
    } else if (status === 'cancelled') {
      updateQuery += ', cancelled_at = CURRENT_TIMESTAMP';
    } else if (status === 'rider_picked_up') {
      updateQuery += ', started_at = CURRENT_TIMESTAMP';
    } else if (status === 'accepted') {
      updateQuery += ', accepted_at = CURRENT_TIMESTAMP';
    }

    updateQuery += ' WHERE ride_id = ?';
    params.push(rideId);

    // Check user access
    if (req.user.user_type === 'rider') {
      updateQuery += ' AND rider_id IN (SELECT id FROM riders WHERE user_id = ?)';
      params.push(userId);
    } else if (req.user.user_type === 'driver') {
      updateQuery += ' AND driver_id IN (SELECT id FROM drivers WHERE user_id = ?)';
      params.push(userId);
    }

    const [result] = await db.execute(updateQuery, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Ride not found or access denied' });
    }

    res.json({ message: 'Ride status updated successfully' });
  } catch (error) {
    console.error('Update ride status error:', error);
    res.status(500).json({ message: 'Failed to update ride status' });
  }
};

const cancelRide = async (req, res) => {
  try {
    const userId = req.user.id;
    const { rideId } = req.params;
    const { reason } = req.body;

    // Find the ride
    let query, params;
    if (req.user.user_type === 'rider') {
      query = `
        SELECT r.id, r.status 
        FROM rides r
        JOIN riders rd ON r.rider_id = rd.id
        WHERE rd.user_id = ? AND r.ride_id = ?
      `;
      params = [userId, rideId];
    } else {
      query = `
        SELECT r.id, r.status 
        FROM rides r
        JOIN drivers d ON r.driver_id = d.id
        WHERE d.user_id = ? AND r.ride_id = ?
      `;
      params = [userId, rideId];
    }

    const [rides] = await db.execute(query, params);

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
    `, [reason || `Cancelled by ${req.user.user_type}`, ride.id]);

    res.json({ message: 'Ride cancelled successfully' });
  } catch (error) {
    console.error('Cancel ride error:', error);
    res.status(500).json({ message: 'Failed to cancel ride' });
  }
};

const searchAvailableDrivers = async (req, res) => {
  try {
    const { lat, lng, rideType } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    // Simple search for available drivers
    // In a real app, you'd use geospatial queries for distance calculation
    const [drivers] = await db.execute(`
      SELECT 
        d.id, d.current_location_lat, d.current_location_lng,
        d.current_location_address, d.rating,
        u.full_name as driver_name, u.phone_number,
        v.vehicle_type, v.make, v.model, v.plate_number, v.color
      FROM drivers d
      JOIN users u ON d.user_id = u.id
      JOIN vehicles v ON d.id = v.driver_id AND v.is_active = TRUE
      WHERE d.is_available = TRUE 
        AND d.is_verified = TRUE
        AND v.vehicle_type = ?
        AND d.current_location_lat IS NOT NULL
        AND d.current_location_lng IS NOT NULL
      LIMIT 10
    `, [rideType || 'car']);

    res.json({
      availableDrivers: drivers.map(driver => ({
        driverId: driver.id,
        name: driver.driver_name,
        phone: driver.phone_number,
        rating: driver.rating,
        location: {
          lat: driver.current_location_lat,
          lng: driver.current_location_lng,
          address: driver.current_location_address
        },
        vehicle: {
          type: driver.vehicle_type,
          make: driver.make,
          model: driver.model,
          plateNumber: driver.plate_number,
          color: driver.color
        },
        // Simple ETA calculation (in real app, use mapping service)
        estimatedEta: `${Math.floor(Math.random() * 10) + 2} mins`
      }))
    });
  } catch (error) {
    console.error('Search available drivers error:', error);
    res.status(500).json({ message: 'Failed to search drivers' });
  }
};

const getRideStatistics = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.user_type;

    if (userType === 'rider') {
      // Rider statistics
      const [riderStats] = await db.execute(`
        SELECT 
          COUNT(*) as total_rides,
          COUNT(CASE WHEN r.status = 'completed' THEN 1 END) as completed_rides,
          COUNT(CASE WHEN r.status = 'cancelled' THEN 1 END) as cancelled_rides,
          COALESCE(SUM(CASE WHEN r.status = 'completed' THEN r.final_fare END), 0) as total_spent,
          COALESCE(AVG(CASE WHEN r.status = 'completed' THEN r.final_fare END), 0) as avg_fare
        FROM rides r
        JOIN riders rd ON r.rider_id = rd.id
        WHERE rd.user_id = ?
      `, [userId]);

      res.json({
        statistics: {
          totalRides: riderStats[0].total_rides,
          completedRides: riderStats[0].completed_rides,
          cancelledRides: riderStats[0].cancelled_rides,
          totalSpent: parseFloat(riderStats[0].total_spent),
          averageFare: parseFloat(riderStats[0].avg_fare)
        }
      });
    } else {
      // Driver statistics
      const [driverStats] = await db.execute(`
        SELECT 
          COUNT(*) as total_rides,
          COUNT(CASE WHEN r.status = 'completed' THEN 1 END) as completed_rides,
          COUNT(CASE WHEN r.status = 'cancelled' THEN 1 END) as cancelled_rides,
          COALESCE(SUM(CASE WHEN r.status = 'completed' THEN de.net_amount END), 0) as total_earnings,
          COALESCE(AVG(CASE WHEN r.status = 'completed' THEN de.net_amount END), 0) as avg_earnings,
          d.rating
        FROM rides r
        JOIN drivers d ON r.driver_id = d.id
        LEFT JOIN driver_earnings de ON r.id = de.ride_id
        WHERE d.user_id = ?
      `, [userId]);

      res.json({
        statistics: {
          totalRides: driverStats[0].total_rides,
          completedRides: driverStats[0].completed_rides,
          cancelledRides: driverStats[0].cancelled_rides,
          totalEarnings: parseFloat(driverStats[0].total_earnings),
          averageEarnings: parseFloat(driverStats[0].avg_earnings),
          rating: driverStats[0].rating
        }
      });
    }
  } catch (error) {
    console.error('Get ride statistics error:', error);
    res.status(500).json({ message: 'Failed to fetch statistics' });
  }
};

module.exports = {
  getAllRides,
  getRideById,
  createRide,
  updateRideStatus,
  cancelRide,
  searchAvailableDrivers,
  getRideStatistics
};