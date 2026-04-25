const express = require('express');
const router = express.Router();
const verificationController = require('../controllers/verificationController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/session', protect, verificationController.createSession);
router.get('/status/:sessionId', verificationController.checkStatus);
router.post('/verify/:sessionId', verificationController.verifySession);

module.exports = router;
