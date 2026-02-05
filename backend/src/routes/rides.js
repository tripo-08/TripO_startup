const express = require('express');
const { body, validationResult, query } = require('express-validator');
const rideService = require('../services/rideService');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Middleware to verify Firebase token
const verifyToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Middleware to check if user is a provider
const requireProvider = async (req, res, next) => {
    try {
        const userRef = db.ref(`users/${req.user.uid}`);
        const snapshot = await userRef.once('value');
        const userData = snapshot.val();

        if (!userData || userData.role !== 'provider') {
            return res.status(403).json({ error: 'Provider access required' });
        }

        req.userData = userData;
        next();
    } catch (error) {
        console.error('Provider check error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// GET /api/rides - Search rides with filters including vehicle-based filters
router.get('/', [
    query('origin').optional().isString().trim(),
    query('destination').optional().isString().trim(),
    query('date').optional().isISO8601(),
    query('passengers').optional().isInt({ min: 1, max: 8 }),
    query('vehicleType').optional().isString().trim(),
    query('amenities').optional().isString(),
    query('fuelType').optional().isIn(['petrol', 'diesel', 'electric', 'hybrid']),
    query('transmission').optional().isIn(['manual', 'automatic']),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false,
                errors: errors.array() 
            });
        }

        const filters = {
            ...req.query,
            amenities: req.query.amenities ? req.query.amenities.split(',') : undefined
        };

        const result = await rideService.searchRides(filters);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error searching rides:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error' 
        });
    }
});

// POST /api/rides - Create new ride with vehicle integration
router.post('/', authMiddleware.authenticateToken, authMiddleware.requireProvider, [
    body('origin.city').notEmpty().trim().withMessage('Origin city is required'),
    body('destination.city').notEmpty().trim().withMessage('Destination city is required'),
    body('departureDate').isISO8601().withMessage('Valid departure date is required'),
    body('departureTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid departure time is required'),
    body('totalSeats').isInt({ min: 1, max: 8 }).withMessage('Total seats must be between 1 and 8'),
    body('pricePerSeat').isFloat({ min: 1 }).withMessage('Price per seat must be greater than 0'),
    body('vehicleId').notEmpty().withMessage('Vehicle ID is required'),
    body('preferences.smoking').optional().isBoolean(),
    body('preferences.pets').optional().isBoolean(),
    body('preferences.instantBooking').optional().isBoolean()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false,
                errors: errors.array() 
            });
        }

        const ride = await rideService.createRide(req.user.uid, req.body);

        res.status(201).json({
            success: true,
            data: ride,
            message: 'Ride published successfully'
        });
    } catch (error) {
        console.error('Error creating ride:', error);
        
        if (error.message.includes('Vehicle not found') || 
            error.message.includes('cannot be used for rides')) {
            return res.status(400).json({ 
                success: false,
                error: error.message 
            });
        }
        
        res.status(500).json({ 
            success: false,
            error: 'Internal server error' 
        });
    }
});

// GET /api/rides/:id - Get ride details with enhanced vehicle information
router.get('/:id', async (req, res) => {
    try {
        const ride = await rideService.getRideById(req.params.id);

        res.json({
            success: true,
            data: ride
        });
    } catch (error) {
        console.error('Error fetching ride:', error);
        
        if (error.message === 'Ride not found') {
            return res.status(404).json({ 
                success: false,
                error: error.message 
            });
        }
        
        res.status(500).json({ 
            success: false,
            error: 'Internal server error' 
        });
    }
});

// PUT /api/rides/:id - Update ride with vehicle validation
router.put('/:id', authMiddleware.authenticateToken, authMiddleware.requireProvider, [
    body('origin.city').optional().notEmpty().trim(),
    body('destination.city').optional().notEmpty().trim(),
    body('departureDate').optional().isISO8601(),
    body('departureTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('totalSeats').optional().isInt({ min: 1, max: 8 }),
    body('pricePerSeat').optional().isFloat({ min: 1 }),
    body('vehicleId').optional().notEmpty(),
    body('preferences.smoking').optional().isBoolean(),
    body('preferences.pets').optional().isBoolean(),
    body('preferences.instantBooking').optional().isBoolean()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false,
                errors: errors.array() 
            });
        }

        const updatedRide = await rideService.updateRide(req.params.id, req.user.uid, req.body);

        res.json({
            success: true,
            data: updatedRide,
            message: 'Ride updated successfully'
        });
    } catch (error) {
        console.error('Error updating ride:', error);
        
        if (error.message === 'Ride not found') {
            return res.status(404).json({ 
                success: false,
                error: error.message 
            });
        }
        
        if (error.message.includes('You can only update your own rides') ||
            error.message.includes('Vehicle not found') ||
            error.message.includes('cannot be used for rides')) {
            return res.status(400).json({ 
                success: false,
                error: error.message 
            });
        }
        
        res.status(500).json({ 
            success: false,
            error: 'Internal server error' 
        });
    }
});

// DELETE /api/rides/:id - Cancel ride (owner only)
router.delete('/:id', authMiddleware.authenticateToken, authMiddleware.requireProvider, async (req, res) => {
    try {
        // Use Firebase directly for cancellation since it's a simple status update
        const admin = require('firebase-admin');
        const db = admin.database();
        
        const rideRef = db.ref(`rides/${req.params.id}`);
        const snapshot = await rideRef.once('value');

        if (!snapshot.exists()) {
            return res.status(404).json({ 
                success: false,
                error: 'Ride not found' 
            });
        }

        const rideData = snapshot.val();
        if (rideData.driverId !== req.user.uid) {
            return res.status(403).json({ 
                success: false,
                error: 'You can only cancel your own rides' 
            });
        }

        // Update status to cancelled instead of deleting
        await rideRef.update({
            status: 'cancelled',
            updatedAt: new Date().toISOString()
        });

        // TODO: Notify passengers about cancellation

        res.json({
            success: true,
            message: 'Ride cancelled successfully'
        });
    } catch (error) {
        console.error('Error cancelling ride:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error' 
        });
    }
});

// GET /api/rides/provider/my-rides - Get provider's rides with vehicle information
router.get('/provider/my-rides', authMiddleware.authenticateToken, authMiddleware.requireProvider, [
    query('status').optional().isIn(['published', 'in-progress', 'completed', 'cancelled']),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false,
                errors: errors.array() 
            });
        }

        const result = await rideService.getProviderRides(req.user.uid, req.query);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error fetching provider rides:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error' 
        });
    }
});

// GET /api/rides/provider/available-vehicles - Get available vehicles for ride creation
router.get('/provider/available-vehicles', authMiddleware.authenticateToken, authMiddleware.requireProvider, async (req, res) => {
    try {
        const vehicles = await rideService.getAvailableVehiclesForRide(req.user.uid);

        res.json({
            success: true,
            data: vehicles
        });
    } catch (error) {
        console.error('Error fetching available vehicles:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error' 
        });
    }
});

// GET /api/rides/provider/vehicle-utilization - Get vehicle utilization report
router.get('/provider/vehicle-utilization', authMiddleware.authenticateToken, authMiddleware.requireProvider, async (req, res) => {
    try {
        const report = await rideService.getVehicleUtilizationReport(req.user.uid);

        res.json({
            success: true,
            data: report
        });
    } catch (error) {
        console.error('Error generating vehicle utilization report:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error' 
        });
    }
});

// GET /api/rides/search/filters - Get available filter options
router.get('/search/filters', async (req, res) => {
    try {
        const filters = await rideService.getAvailableFilters();

        res.json({
            success: true,
            data: filters
        });
    } catch (error) {
        console.error('Error fetching filter options:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error' 
        });
    }
});

// GET /api/rides/search/popular-routes - Get popular routes
router.get('/search/popular-routes', async (req, res) => {
    try {
        const routes = await rideService.getPopularRoutes();

        res.json({
            success: true,
            data: routes
        });
    } catch (error) {
        console.error('Error fetching popular routes:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error' 
        });
    }
});

// GET /api/rides/search/vehicle-stats - Get vehicle statistics for current search
router.get('/search/vehicle-stats', [
    query('origin').optional().isString().trim(),
    query('destination').optional().isString().trim(),
    query('date').optional().isISO8601()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false,
                errors: errors.array() 
            });
        }

        const stats = await rideService.getVehicleStatsForSearch(req.query);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error fetching vehicle stats:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error' 
        });
    }
});

module.exports = router;