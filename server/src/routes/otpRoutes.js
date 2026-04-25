const express = require('express');
const router = express.Router();
const otpController = require('../controllers/otpController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/generate', protect, otpController.generateOtp);
router.post('/verify', protect, otpController.verifyOtp);

module.exports = router;
