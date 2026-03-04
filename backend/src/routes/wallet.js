<<<<<<< HEAD
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// Placeholder routes
router.get('/', authMiddleware.authenticateToken, (req, res) => {
    res.json({ success: true, message: 'Wallet route placeholder' });
});

module.exports = router;
=======
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// Placeholder routes
router.get('/', authMiddleware.authenticateToken, (req, res) => {
    res.json({ success: true, message: 'Wallet route placeholder' });
});

module.exports = router;
>>>>>>> ee476ec8b9072fab200c1ae2adb28e6b000d4da9
