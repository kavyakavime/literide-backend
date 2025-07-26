// src/controllers/currentRideController.js
const db = require('../config/database');

/**
 * Get current ride for a driver
 */
const getDriverCurrentRide = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get driver's current ride
    const [currentRides] = await db.execute(`
      SELECT 
        cr.id,
        cr.ride_id,
        cr.rider_id,
        cr.driver_id,
        cr.pickup_location,
        cr.destination,
        cr.pickup_lat,
        cr.pickup_lng,
        cr.destination_lat,
        cr.destination_lng,
        cr.current_lat,
        cr.current_lng,
        cr.ride_type,
        cr.status,
        cr.otp,
        cr.estimated_fare,
        cr.final_fare,
        cr.distance_km,
        cr.estimated_duration_minutes,
        cr.actual_duration_minutes,
        cr.rider_name,
        cr.rider_phone,
        cr.estimated_eta,
        cr.ride_started_at,
        cr.driver_arrived_at,
        cr.pickup_completed_at,
        cr.last_location_update,
        cr.payment_method,
        cr.payment_status,
        cr.created_at,
        cr.updated_at
      FROM current_ride cr
      JOIN drivers d ON cr.driver_id = d.id
      WHERE d.user_id = ? 
        AND cr.status IN ('accepted', 'driver_on_way', 'rider_picked_up')
      ORDER BY cr.created_at DESC
      LIMIT 1
    `, [userId]);

    if (currentRides.length === 0) {
      return res.json({ currentRide: null });
    }

    const ride = currentRides[0];
    
    // Format the response to match frontend expectations
    const currentRide = {
      rideId: ride.ride_id,
      pickup: ride.pickup_location,
      destination: ride.destination,
      status: ride.status,
      fare: parseFloat(ride.final_fare || ride.estimated_fare),
      otp: ride.otp,
      rider: {
        name: ride.rider_name,
        phone: ride.rider_phone
      },
      acceptedAt: ride.created_at,
      location: {
        pickup: {
          lat: ride.pickup_lat,
          lng: ride.pickup_lng
        },
        destination: {
          lat: ride.destination_lat,
          lng: ride.destination_lng
        },
        current: {
          lat: ride.current_lat,
          lng: ride.current_lng
        }
      },
      timing: {
        estimatedEta: ride.estimated_eta,
        startedAt: ride.ride_started_at,
        arrivedAt: ride.driver_arrived_at,
        pickedUpAt: ride.pickup_completed_at,
        lastUpdate: ride.last_location_update
      },
      payment: {
        method: ride.payment_method,
        status: ride.payment_status
      }
    };

    res.json({ currentRide });
  } catch (error) {
    console.error('Get driver current ride error:', error);
    res.status(500).json({ message: 'Failed to fetch current ride' });
  }
};

/**
 * Get current ride for a rider
 */
const getRiderCurrentRide = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get rider's current ride
    const [currentRides] = await db.execute(`
      SELECT 
        cr.id,
        cr.ride_id,
        cr.rider_id,
        cr.driver_id,
        cr.pickup_location,
        cr.destination,
        cr.pickup_lat,
        cr.pickup_lng,
        cr.destination_lat,
        cr.destination_lng,
        cr.current_lat,
        cr.current_lng,
        cr.ride_type,
        cr.status,
        cr.otp,
        cr.estimated_fare,
        cr.final_fare,
        cr.distance_km,
        cr.estimated_duration_minutes,
        cr.actual_duration_minutes,
        cr.driver_name,
        cr.driver_phone,
        cr.driver_rating,
        cr.vehicle_make,
        cr.vehicle_model,
        cr.vehicle_plate_number,
        cr.vehicle_color,
        cr.estimated_eta,
        cr.ride_started_at,
        cr.driver_arrived_at,
        cr.pickup_completed_at,
        cr.last_location_update,
        cr.payment_method,
        cr.payment_status,
        cr.created_at,
        cr.updated_at
      FROM current_ride cr
      JOIN riders r ON cr.rider_id = r.id
      WHERE r.user_id = ? 
        AND cr.status IN ('requested', 'accepted', 'driver_on_way', 'rider_picked_up')
      ORDER BY cr.created_at DESC
      LIMIT 1
    `, [userId]);

    if (currentRides.length === 0) {
      return res.json({ currentRide: null });
    }

    const ride = currentRides[0];
    
    // Format the response to match frontend expectations
    const currentRide = {
      rideId: ride.ride_id,
      pickup: ride.pickup_location,
      destination: ride.destination,
      status: ride.status,
      fare: parseFloat(ride.final_fare || ride.estimated_fare),
      otp: ride.otp,
      driver: ride.driver_name ? {
        name: ride.driver_name,
        phone: ride.driver_phone,
        rating: ride.driver_rating,
        vehicle: `${ride.vehicle_make} ${ride.vehicle_model}`,
        plateNumber: ride.vehicle_plate_number,
        carModel: `${ride.vehicle_make} ${ride.vehicle_model}`,
        id: ride.driver_id
      } : {
        id: '',
        name: 'Driver Not Assigned',
        phone: '',
        rating: 0,
        vehicle: '',
        plateNumber: '',
        carModel: ''
      },
      eta: ride.estimated_eta || 'Calculating...',
      requestedAt: ride.created_at,
      location: {
        pickup: {
          lat: ride.pickup_lat,
          lng: ride.pickup_lng
        },
        destination: {
          lat: ride.destination_lat,
          lng: ride.destination_lng
        },
        current: {
          lat: ride.current_lat,
          lng: ride.current_lng
        }
      },
      timing: {
        estimatedEta: ride.estimated_eta,
        startedAt: ride.ride_started_at,
        arrivedAt: ride.driver_arrived_at,
        pickedUpAt: ride.pickup_completed_at,
        lastUpdate: ride.last_location_update
      },
      payment: {
        method: ride.payment_method,
        status: ride.payment_status
      }
    };

    res.json({ currentRide });
  } catch (error) {
    console.error('Get rider current ride error:', error);
    res.status(500).json({ message: 'Failed to fetch current ride' });
  }
};

/**
 * Update current ride status (for drivers)
 */
const updateCurrentRideStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, currentLat, currentLng, estimatedEta } = req.body;

    const validStatuses = ['driver_on_way', 'rider_picked_up'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Get current ride
    const [currentRides] = await db.execute(`
      SELECT cr.id, cr.status
      FROM current_ride cr
      JOIN drivers d ON cr.driver_id = d.id
      WHERE d.user_id = ? 
        AND cr.status IN ('accepted', 'driver_on_way', 'rider_picked_up')
    `, [userId]);

    if (currentRides.length === 0) {
      return res.status(404).json({ message: 'No active ride found' });
    }

    const ride = currentRides[0];

    // Build update query
    let updateFields = ['status = ?', 'updated_at = CURRENT_TIMESTAMP'];
    let params = [status];

    // Add location updates if provided
    if (currentLat && currentLng) {
      updateFields.push('current_lat = ?', 'current_lng = ?', 'last_location_update = CURRENT_TIMESTAMP');
      params.push(currentLat, currentLng);
    }

    // Add ETA if provided
    if (estimatedEta) {
      updateFields.push('estimated_eta = ?');
      params.push(estimatedEta);
    }

    // Add status-specific timestamp updates
    if (status === 'driver_on_way' && ride.status === 'accepted') {
      updateFields.push('driver_arrived_at = CURRENT_TIMESTAMP');
    } else if (status === 'rider_picked_up' && ride.status === 'driver_on_way') {
      updateFields.push('pickup_completed_at = CURRENT_TIMESTAMP', 'ride_started_at = CURRENT_TIMESTAMP');
    }

    params.push(ride.id);

    await db.execute(`
      UPDATE current_ride 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `, params);

    // Also update the main rides table for consistency
    let rideUpdateFields = ['status = ?', 'updated_at = CURRENT_TIMESTAMP'];
    let rideParams = [status];

    if (status === 'rider_picked_up') {
      rideUpdateFields.push('started_at = CURRENT_TIMESTAMP');
    }

    rideParams.push(ride.id);

    await db.execute(`
      UPDATE rides r
      JOIN current_ride cr ON r.id = cr.id
      SET ${rideUpdateFields.join(', ')}
      WHERE cr.id = ?
    `, rideParams);

    res.json({ 
      message: 'Ride status updated successfully',
      status: status,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Update current ride status error:', error);
    res.status(500).json({ message: 'Failed to update ride status' });
  }
};

/**
 * Update driver location during ride
 */
const updateDriverLocation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentLat, currentLng, estimatedEta } = req.body;

    if (!currentLat || !currentLng) {
      return res.status(400).json({ message: 'Current location coordinates are required' });
    }

    // Set default value if estimatedEta is not provided
    const eta = estimatedEta || null;

    // Update current ride location
    const [result] = await db.execute(`
      UPDATE current_ride cr
      JOIN drivers d ON cr.driver_id = d.id
      SET 
        cr.current_lat = ?,
        cr.current_lng = ?,
        cr.estimated_eta = COALESCE(?, cr.estimated_eta),
        cr.last_location_update = CURRENT_TIMESTAMP,
        cr.updated_at = CURRENT_TIMESTAMP
      WHERE d.user_id = ? 
        AND cr.status IN ('accepted', 'driver_on_way', 'rider_picked_up')
    `, [currentLat, currentLng, eta, userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'No active ride found' });
    }

    res.json({ 
      message: 'Location updated successfully',
      location: {
        lat: currentLat,
        lng: currentLng
      },
      estimatedEta: eta,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Update driver location error:', error);
    res.status(500).json({ message: 'Failed to update location' });
  }
};

/**
 * Complete current ride (move to rides table and remove from current_ride)
 */
const completeCurrentRide = async (req, res) => {
  try {
    const userId = req.user.id;
    const { finalFare, distanceKm, durationMinutes } = req.body;

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Get current ride details
      const [currentRides] = await connection.execute(`
        SELECT 
          cr.*,
          d.id as driver_table_id,
          r.id as rider_table_id
        FROM current_ride cr
        JOIN drivers d ON cr.driver_id = d.id
        JOIN riders r ON cr.rider_id = r.id
        WHERE d.user_id = ? 
          AND cr.status = 'rider_picked_up'
      `, [userId]);

      if (currentRides.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({ message: 'No active ride to complete' });
      }

      const ride = currentRides[0];
      const completedFare = finalFare || ride.estimated_fare;
      const completedDistance = distanceKm || ride.distance_km;
      const completedDuration = durationMinutes || ride.actual_duration_minutes;

      // Insert into main rides table
      await connection.execute(`
        INSERT INTO rides (
          ride_id, rider_id, driver_id, pickup_location, destination,
          ride_type, status, estimated_fare, final_fare, distance_km,
          duration_minutes, otp, created_at, accepted_at, started_at, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        ride.ride_id,
        ride.rider_table_id,
        ride.driver_table_id,
        ride.pickup_location,
        ride.destination,
        ride.ride_type,
        ride.estimated_fare,
        completedFare,
        completedDistance,
        completedDuration,
        ride.otp,
        ride.created_at,
        ride.created_at, // Using created_at as accepted_at since we don't track it separately in current_ride
        ride.ride_started_at || ride.created_at,
      ]);

      const [insertResult] = await connection.execute('SELECT LAST_INSERT_ID() as ride_id');
      const completedRideId = insertResult[0].ride_id;

      // Create payment record
      await connection.execute(`
        INSERT INTO payments (ride_id, amount, payment_method, payment_status)
        VALUES (?, ?, ?, 'completed')
      `, [completedRideId, completedFare, ride.payment_method || 'cash']);

      // Create driver earnings record
      const commissionRate = 15; // 15% commission
      const commissionAmount = (completedFare * commissionRate) / 100;
      const netAmount = completedFare - commissionAmount;

      await connection.execute(`
        INSERT INTO driver_earnings (driver_id, ride_id, gross_amount, commission_rate, commission_amount, net_amount, payment_status)
        VALUES (?, ?, ?, ?, ?, ?, 'pending')
      `, [ride.driver_table_id, completedRideId, completedFare, commissionRate, commissionAmount, netAmount]);

      // Update driver stats
      await connection.execute(`
        UPDATE drivers 
        SET total_rides = total_rides + 1, 
            total_earnings = total_earnings + ?,
            is_available = TRUE
        WHERE id = ?
      `, [netAmount, ride.driver_table_id]);

      // Remove from current_ride table
      await connection.execute(`
        DELETE FROM current_ride WHERE id = ?
      `, [ride.id]);

      await connection.commit();
      connection.release();

      res.json({ 
        message: 'Ride completed successfully',
        rideDetails: {
          rideId: ride.ride_id,
          finalFare: completedFare,
          distance: completedDistance,
          duration: completedDuration,
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
    console.error('Complete current ride error:', error);
    res.status(500).json({ message: 'Failed to complete ride' });
  }
};

/**
 * Cancel current ride
 */
const cancelCurrentRide = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.user_type;
    const { reason } = req.body;

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      let whereClause;
      if (userType === 'rider') {
        whereClause = `
          FROM current_ride cr
          JOIN riders r ON cr.rider_id = r.id
          WHERE r.user_id = ?
        `;
      } else {
        whereClause = `
          FROM current_ride cr
          JOIN drivers d ON cr.driver_id = d.id
          WHERE d.user_id = ?
        `;
      }

      // Get current ride details
      const [currentRides] = await connection.execute(`
        SELECT cr.*, r.id as rider_table_id, d.id as driver_table_id
        ${whereClause}
          AND cr.status IN ('requested', 'accepted', 'driver_on_way')
      `, [userId]);

      if (currentRides.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({ message: 'No cancellable ride found' });
      }

      const ride = currentRides[0];

      // Insert cancelled ride into main rides table
      await connection.execute(`
        INSERT INTO rides (
          ride_id, rider_id, driver_id, pickup_location, destination,
          ride_type, status, estimated_fare, final_fare, otp, 
          created_at, cancelled_at, cancellation_reason
        ) VALUES (?, ?, ?, ?, ?, ?, 'cancelled', ?, NULL, ?, ?, CURRENT_TIMESTAMP, ?)
      `, [
        ride.ride_id,
        ride.rider_table_id,
        ride.driver_table_id,
        ride.pickup_location,
        ride.destination,
        ride.ride_type,
        ride.estimated_fare,
        ride.otp,
        ride.created_at,
        reason || `Cancelled by ${userType}`
      ]);

      // If driver was assigned, make them available again
      if (ride.driver_table_id) {
        await connection.execute(`
          UPDATE drivers 
          SET is_available = TRUE
          WHERE id = ?
        `, [ride.driver_table_id]);
      }

      // Remove from current_ride table
      await connection.execute(`
        DELETE FROM current_ride WHERE id = ?
      `, [ride.id]);

      await connection.commit();
      connection.release();

      res.json({ 
        message: 'Ride cancelled successfully',
        rideId: ride.ride_id,
        cancelledBy: userType,
        reason: reason || `Cancelled by ${userType}`
      });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Cancel current ride error:', error);
    res.status(500).json({ message: 'Failed to cancel ride' });
  }
};

/**
 * Create a new current ride (called when a ride is accepted or requested)
 */
const createCurrentRide = async (req, res) => {
  try {
    const {
      rideId,
      riderId,
      driverId,
      pickupLocation,
      destination,
      pickupLat,
      pickupLng,
      destinationLat,
      destinationLng,
      rideType,
      estimatedFare,
      riderName,
      riderPhone,
      driverName,
      driverPhone,
      driverRating,
      vehicleMake,
      vehicleModel,
      vehiclePlateNumber,
      vehicleColor,
      paymentMethod
    } = req.body;

    // Generate OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    // Determine initial status
    const status = driverId ? 'accepted' : 'requested';

    // Set expiration time (10 minutes for ride requests)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.execute(`
      INSERT INTO current_ride (
        ride_id, rider_id, driver_id, pickup_location, destination,
        pickup_lat, pickup_lng, destination_lat, destination_lng,
        ride_type, status, otp, estimated_fare, rider_name, rider_phone,
        driver_name, driver_phone, driver_rating, vehicle_make, vehicle_model,
        vehicle_plate_number, vehicle_color, payment_method, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      rideId, riderId, driverId, pickupLocation, destination,
      pickupLat, pickupLng, destinationLat, destinationLng,
      rideType, status, otp, estimatedFare, riderName, riderPhone,
      driverName, driverPhone, driverRating, vehicleMake, vehicleModel,
      vehiclePlateNumber, vehicleColor, paymentMethod || 'cash', expiresAt
    ]);

    res.status(201).json({
      message: 'Current ride created successfully',
      rideId: rideId,
      otp: otp,
      status: status,
      expiresAt: expiresAt
    });
  } catch (error) {
    console.error('Create current ride error:', error);
    res.status(500).json({ message: 'Failed to create current ride' });
  }
};

/**
 * Request a new ride (proper implementation for frontend)
 */
// src/controllers/currentRideController.js - UPDATED requestRide function
const requestRide = async (req, res) => {
    try {
      const userId = req.user.id;
      const {
        pickup_location,
        destination,
        ride_type,
        estimated_fare,
        pickup_coordinates,
        destination_coordinates
      } = req.body;
  
      console.log('=== RIDE REQUEST DEBUG ===');
      console.log('User ID:', userId);
      console.log('Request body:', req.body);
  
      // Validate required fields
      if (!pickup_location || !destination || !ride_type || !estimated_fare) {
        return res.status(400).json({ 
          success: false,
          message: 'Missing required fields: pickup_location, destination, ride_type, estimated_fare' 
        });
      }
  
      const connection = await db.getConnection();
      await connection.beginTransaction();
  
      try {
        // Get rider data
        const [riders] = await connection.execute(`
          SELECT r.id, u.full_name, u.phone_number
          FROM riders r
          JOIN users u ON r.user_id = u.id
          WHERE u.id = ?
        `, [userId]);
  
        if (riders.length === 0) {
          await connection.rollback();
          connection.release();
          return res.status(404).json({ 
            success: false,
            message: 'Rider profile not found' 
          });
        }
  
        const rider = riders[0];
        console.log('Found rider:', rider);
  
        // Check for existing active ride
        const [existingRides] = await connection.execute(`
          SELECT id FROM current_ride 
          WHERE rider_id = ? AND status IN ('requested', 'accepted', 'driver_on_way', 'rider_picked_up')
        `, [rider.id]);
  
        if (existingRides.length > 0) {
          await connection.rollback();
          connection.release();
          return res.status(400).json({ 
            success: false,
            message: 'You already have an active ride. Please complete or cancel it first.' 
          });
        }
  
        // Generate unique ride ID and OTP
        const rideId = 'RIDE_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const otp = Math.floor(1000 + Math.random() * 9000).toString();
  
        // Set expiration time (10 minutes for ride requests)
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  
        console.log('Creating ride with ID:', rideId);
  
        // Insert into current_ride table
        await connection.execute(`
          INSERT INTO current_ride (
            ride_id, rider_id, pickup_location, destination,
            pickup_lat, pickup_lng, destination_lat, destination_lng,
            ride_type, status, otp, estimated_fare, 
            rider_name, rider_phone, payment_method, expires_at, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'requested', ?, ?, ?, ?, 'cash', ?, CURRENT_TIMESTAMP)
        `, [
          rideId,
          rider.id,
          pickup_location,
          destination,
          pickup_coordinates?.lat || null,
          pickup_coordinates?.lng || null,
          destination_coordinates?.lat || null,
          destination_coordinates?.lng || null,
          ride_type,
          otp,
          estimated_fare,
          rider.full_name,
          rider.phone_number,
          expiresAt
        ]);
  
        // Get the created ride
        const [currentRides] = await connection.execute(`
          SELECT 
            id, ride_id, rider_id, pickup_location, destination,
            ride_type, status, estimated_fare, otp, created_at
          FROM current_ride 
          WHERE ride_id = ?
        `, [rideId]);
  
        await connection.commit();
        connection.release();
  
        const currentRide = currentRides[0];
        console.log('Created ride:', currentRide);
  
        // Format response to match frontend expectations
        const response = {
          id: currentRide.id,
          rider_id: currentRide.rider_id,
          pickup_location: currentRide.pickup_location,
          destination: currentRide.destination,
          ride_type: currentRide.ride_type,
          status: currentRide.status,
          estimated_fare: currentRide.estimated_fare,
          otp: currentRide.otp,
          created_at: currentRide.created_at,
          driver: null // No driver assigned yet
        };
  
        res.status(201).json({
          success: true,
          message: 'Ride requested successfully! Looking for available drivers...',
          data: response
        });
  
      } catch (error) {
        await connection.rollback();
        connection.release();
        console.error('Database error:', error);
        throw error;
      }
  
    } catch (error) {
      console.error('Request ride error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to request ride. Please try again.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };

module.exports = {
  getDriverCurrentRide,
  getRiderCurrentRide,
  updateCurrentRideStatus,
  updateDriverLocation,
  completeCurrentRide,
  cancelCurrentRide,
  createCurrentRide,
  requestRide  // ADD THIS NEW FUNCTION
};