const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const { protect, authorize } = require('../middlewares/authMiddleware');

/**
 * Alert Routes
 * Base path: /api/alerts
 */

router.get('/', protect, authorize('admin'), alertController.getAlerts);
router.put('/:id/resolve', protect, authorize('admin'), alertController.resolveAlert);

module.exports = router;
