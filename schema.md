-- Complete Database Setup with Sample Data
-- Run this entire script in MySQL

-- Create Users table
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    user_type ENUM('rider', 'driver') NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- Create Riders table
CREATE TABLE riders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT UNIQUE NOT NULL,
    profile_picture_url VARCHAR(500),
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    preferred_payment_method ENUM('cash', 'card', 'wallet') DEFAULT 'cash',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create Drivers table
CREATE TABLE drivers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT UNIQUE NOT NULL,
    license_number VARCHAR(50) UNIQUE NOT NULL,
    license_expiry DATE NOT NULL,
    profile_picture_url VARCHAR(500),
    current_location_lat DECIMAL(10, 8),
    current_location_lng DECIMAL(11, 8),
    current_location_address VARCHAR(500),
    is_available BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    rating DECIMAL(3, 2) DEFAULT 0.00,
    total_rides INT DEFAULT 0,
    total_earnings DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create Vehicles table
CREATE TABLE vehicles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    driver_id INT NOT NULL,
    vehicle_type ENUM('car', 'bike', 'auto') NOT NULL,
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INT NOT NULL,
    color VARCHAR(50) NOT NULL,
    plate_number VARCHAR(20) UNIQUE NOT NULL,
    registration_number VARCHAR(50) UNIQUE NOT NULL,
    insurance_expiry DATE NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE
);

-- Create Rides table
CREATE TABLE rides (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ride_id VARCHAR(20) UNIQUE NOT NULL,
    rider_id INT NOT NULL,
    driver_id INT,
    pickup_location VARCHAR(500) NOT NULL,
    pickup_lat DECIMAL(10, 8),
    pickup_lng DECIMAL(11, 8),
    destination VARCHAR(500) NOT NULL,
    destination_lat DECIMAL(10, 8),
    destination_lng DECIMAL(11, 8),
    ride_type ENUM('car', 'bike', 'auto') NOT NULL,
    status ENUM('requested', 'accepted', 'driver_on_way', 'rider_picked_up', 'completed', 'cancelled') DEFAULT 'requested',
    estimated_fare DECIMAL(8, 2),
    final_fare DECIMAL(8, 2),
    distance_km DECIMAL(6, 2),
    duration_minutes INT,
    otp VARCHAR(6),
    scheduled_time TIMESTAMP NULL,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP NULL,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    cancelled_at TIMESTAMP NULL,
    cancellation_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (rider_id) REFERENCES riders(id),
    FOREIGN KEY (driver_id) REFERENCES drivers(id)
);

-- Create Ride requests table
CREATE TABLE ride_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ride_id INT NOT NULL,
    driver_id INT NOT NULL,
    request_status ENUM('pending', 'accepted', 'declined', 'expired') DEFAULT 'pending',
    estimated_fare DECIMAL(8, 2),
    estimated_eta VARCHAR(20),
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP NULL,
    expires_at TIMESTAMP NOT NULL,
    FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE,
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE
);

-- Create Ratings table
CREATE TABLE ratings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ride_id INT NOT NULL,
    rater_id INT NOT NULL,
    rated_id INT NOT NULL,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE,
    FOREIGN KEY (rater_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (rated_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_rating (ride_id, rater_id, rated_id)
);

-- Create Payments table
CREATE TABLE payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ride_id INT NOT NULL,
    amount DECIMAL(8, 2) NOT NULL,
    payment_method ENUM('cash', 'card', 'wallet') NOT NULL,
    payment_status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    transaction_id VARCHAR(100),
    payment_gateway VARCHAR(50),
    paid_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE
);

-- Create Driver earnings table
CREATE TABLE driver_earnings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    driver_id INT NOT NULL,
    ride_id INT NOT NULL,
    gross_amount DECIMAL(8, 2) NOT NULL,
    commission_rate DECIMAL(5, 2) NOT NULL,
    commission_amount DECIMAL(8, 2) NOT NULL,
    net_amount DECIMAL(8, 2) NOT NULL,
    payment_status ENUM('pending', 'paid') DEFAULT 'pending',
    paid_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE,
    FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE
);

-- Create Password reset tokens table
CREATE TABLE password_reset_tokens (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create Notifications table
CREATE TABLE notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('ride_request', 'ride_update', 'payment', 'general') NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert Sample Data

-- Sample Users (passwords are all 'password123')
INSERT INTO users (email, password_hash, full_name, phone_number, user_type, is_verified, is_active) VALUES
('alex@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewfCAjN.94Fy9c8m', 'Alex Smith', '+1234567890', 'rider', TRUE, TRUE),
('john@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewfCAjN.94Fy9c8m', 'John Doe', '+1234567891', 'rider', TRUE, TRUE),
('priya@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewfCAjN.94Fy9c8m', 'Priya Sharma', '+1234567892', 'rider', TRUE, TRUE),
('rajesh@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewfCAjN.94Fy9c8m', 'Rajesh Kumar', '+919876543210', 'driver', TRUE, TRUE),
('suresh@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewfCAjN.94Fy9c8m', 'Suresh Sharma', '+919876543211', 'driver', TRUE, TRUE),
('amit@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewfCAjN.94Fy9c8m', 'Amit Patel', '+919876543212', 'driver', TRUE, TRUE);

-- Sample Riders
INSERT INTO riders (user_id, emergency_contact_name, emergency_contact_phone, preferred_payment_method) VALUES
(1, 'Jane Smith', '+1234567893', 'card'),
(2, 'Mary Doe', '+1234567894', 'cash'),
(3, 'Suresh Sharma', '+919876543213', 'wallet');

-- Sample Drivers
INSERT INTO drivers (user_id, license_number, license_expiry, current_location_address, current_location_lat, current_location_lng, is_available, is_verified, rating, total_rides, total_earnings) VALUES
(4, 'DL12345678', '2025-12-31', 'Bandra West, Mumbai', 19.0596, 72.8295, TRUE, TRUE, 4.8, 245, 3650.50),
(5, 'DL87654321', '2025-11-30', 'Andheri East, Mumbai', 19.1197, 72.8697, TRUE, TRUE, 4.6, 189, 2890.75),
(6, 'DL11223344', '2026-01-15', 'Powai, Mumbai', 19.1177, 72.9065, FALSE, TRUE, 4.9, 312, 4876.25);

-- Sample Vehicles
INSERT INTO vehicles (driver_id, vehicle_type, make, model, year, color, plate_number, registration_number, insurance_expiry, is_verified) VALUES
(1, 'car', 'Honda', 'City', 2020, 'White', 'MH01AB1234', 'REG123456', '2025-12-31', TRUE),
(2, 'car', 'Maruti', 'Swift', 2019, 'Silver', 'MH02CD5678', 'REG234567', '2025-11-30', TRUE),
(3, 'car', 'Hyundai', 'i20', 2021, 'Blue', 'MH03EF9012', 'REG345678', '2026-01-15', TRUE);

-- Sample Rides
INSERT INTO rides (ride_id, rider_id, driver_id, pickup_location, destination, ride_type, status, estimated_fare, final_fare, distance_km, duration_minutes, otp, completed_at) VALUES
('R001', 1, 1, 'Bandra West Railway Station', 'Andheri East Metro Station', 'car', 'completed', 18.00, 18.00, 8.5, 25, '1234', '2024-01-20 10:30:00'),
('R002', 2, 2, 'Powai Lake', 'BKC', 'car', 'completed', 22.00, 22.00, 6.2, 18, '5678', '2024-01-20 14:15:00'),
('R003', 3, 3, 'Colaba Causeway', 'Marine Drive', 'car', 'completed', 12.00, 12.00, 4.1, 15, '9012', '2024-01-20 16:45:00'),
('R004', 1, NULL, 'Airport Terminal 1', 'Worli Sea Face', 'car', 'requested', 35.00, NULL, NULL, NULL, '3456', NULL);

-- Sample Ride Requests (for the current requested ride)
INSERT INTO ride_requests (ride_id, driver_id, estimated_fare, estimated_eta, expires_at) VALUES
(4, 1, 35.00, '8 mins', DATE_ADD(NOW(), INTERVAL 5 MINUTE)),
(4, 2, 35.00, '12 mins', DATE_ADD(NOW(), INTERVAL 5 MINUTE));

-- Sample Ratings
INSERT INTO ratings (ride_id, rater_id, rated_id, rating, comment) VALUES
(1, 1, 4, 5, 'Excellent driver, very punctual!'),
(1, 4, 1, 4, 'Nice passenger, respectful.'),
(2, 2, 5, 4, 'Good ride, clean car.'),
(2, 5, 2, 5, 'Friendly passenger.'),
(3, 3, 6, 5, 'Amazing service!'),
(3, 6, 3, 5, 'Great passenger.');

-- Sample Payments
INSERT INTO payments (ride_id, amount, payment_method, payment_status, paid_at) VALUES
(1, 18.00, 'card', 'completed', '2024-01-20 10:32:00'),
(2, 22.00, 'cash', 'completed', '2024-01-20 14:17:00'),
(3, 12.00, 'wallet', 'completed', '2024-01-20 16:47:00');

-- Sample Driver Earnings
INSERT INTO driver_earnings (driver_id, ride_id, gross_amount, commission_rate, commission_amount, net_amount, payment_status) VALUES
(1, 1, 18.00, 15.00, 2.70, 15.30, 'paid'),
(2, 2, 22.00, 15.00, 3.30, 18.70, 'paid'),
(3, 3, 12.00, 15.00, 1.80, 10.20, 'paid');

-- show tables
SHOW TABLES;

-- Show some sample data
SELECT 'USERS:' as table_name;
SELECT id, email, full_name, user_type FROM users;

SELECT 'DRIVERS:' as table_name;
SELECT d.id, u.full_name, d.license_number, d.is_available, d.rating, d.total_rides FROM drivers d JOIN users u ON d.user_id = u.id;

SELECT 'RIDES:' as table_name;
SELECT r.ride_id, r.pickup_location, r.destination, r.status, r.estimated_fare, u.full_name as rider FROM rides r JOIN riders rd ON r.rider_id = rd.id JOIN users u ON rd.user_id = u.id;