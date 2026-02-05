const express = require('express');
const router = express.Router();
const { getFirestore } = require('../config/firebase');
const logger = require('../utils/logger');

// GET /api/stops - Get all admin-defined stops (Public)
router.get('/', async (req, res) => {
    try {
        const db = getFirestore();
        const snapshot = await db.collection('stops').orderBy('name', 'asc').get();
        const stops = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            stops.push({
                id: doc.id,
                name: data.name,
                lat: data.lat,
                lng: data.lng
            });
        });

        res.status(200).json({
            success: true,
            data: stops
        });

    } catch (error) {
        logger.error('Error fetching public stops:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch stops'
        });
    }
});

module.exports = router;
