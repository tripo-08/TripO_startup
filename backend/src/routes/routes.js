const express = require('express');
const router = express.Router();
const { getFirestore } = require('../config/firebase');
const authMiddleware = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * Search predefined routes by source and destination
 * GET /api/routes/search?source=Mumbai&destination=Pune
 */
router.get('/search', authMiddleware.authenticateToken, async (req, res) => {
    try {
        const { source, destination } = req.query;

        if (!source || !destination) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'MISSING_PARAMETERS',
                    message: 'Source and destination are required'
                }
            });
        }

        if (source.toLowerCase().trim() === destination.toLowerCase().trim()) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'SAME_SOURCE_DESTINATION',
                    message: 'Source and destination cannot be the same'
                }
            });
        }

        const db = getFirestore();
        
        // Search for routes that match source and destination (case-insensitive)
        const routesSnapshot = await db.collection('routes')
            .where('active', '==', true)
            .get();

        const matchingRoutes = [];
        
        routesSnapshot.forEach(doc => {
            const routeData = doc.data();
            const routeSource = routeData.source?.name?.toLowerCase().trim();
            const routeDestination = routeData.destination?.name?.toLowerCase().trim();
            const searchSource = source.toLowerCase().trim();
            const searchDestination = destination.toLowerCase().trim();

            // Check if source and destination match
            if (routeSource === searchSource && routeDestination === searchDestination) {
                matchingRoutes.push({
                    id: doc.id,
                    ...routeData
                });
            }
        });

        logger.info(`Route search: ${source} -> ${destination}, found ${matchingRoutes.length} routes`);

        res.status(200).json({
            success: true,
            data: matchingRoutes,
            message: matchingRoutes.length > 0 
                ? `Found ${matchingRoutes.length} matching route(s)`
                : 'No routes found for the specified source and destination'
        });

    } catch (error) {
        logger.error('Route search error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'SEARCH_ERROR',
                message: 'Failed to search routes'
            }
        });
    }
});

/**
 * Get all active predefined routes
 * GET /api/routes
 */
router.get('/', authMiddleware.authenticateToken, async (req, res) => {
    try {
        const db = getFirestore();
        const snapshot = await db.collection('routes')
            .where('active', '==', true)
            .orderBy('createdAt', 'desc')
            .get();

        const routes = [];
        snapshot.forEach(doc => {
            routes.push({
                id: doc.id,
                ...doc.data()
            });
        });

        res.status(200).json({
            success: true,
            data: routes
        });

    } catch (error) {
        logger.error('Get routes error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'FETCH_ERROR',
                message: 'Failed to fetch routes'
            }
        });
    }
});

/**
 * Get route by ID
 * GET /api/routes/:id
 */
router.get('/:id', authMiddleware.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const db = getFirestore();
        
        const routeDoc = await db.collection('routes').doc(id).get();
        
        if (!routeDoc.exists) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'ROUTE_NOT_FOUND',
                    message: 'Route not found'
                }
            });
        }

        const routeData = routeDoc.data();
        
        if (!routeData.active) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'ROUTE_INACTIVE',
                    message: 'Route is not active'
                }
            });
        }

        res.status(200).json({
            success: true,
            data: {
                id: routeDoc.id,
                ...routeData
            }
        });

    } catch (error) {
        logger.error('Get route by ID error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'FETCH_ERROR',
                message: 'Failed to fetch route'
            }
        });
    }
});

module.exports = router;