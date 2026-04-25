const Otp = require('../models/Otp');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

/**
 * Generate a 6-digit OTP and log it to the console (Hackathon mode)
 */
exports.generateOtp = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { electionId } = req.body;

    if (!electionId) {
      return res.status(400).json({ success: false, message: 'Election ID is required' });
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otpCode, salt);

    // Set expiry (5 minutes)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Upsert OTP for this user and election
    await Otp.findOneAndUpdate(
      { userId, electionId },
      { hashedOtp, expiresAt, attempts: 0, isVerified: false },
      { upsert: true, new: true }
    );

    // MOCK DELIVERY: Log to console
    console.log('\n----------------------------------------');
    console.log(`🔐 TRUSTVOTE SECURITY ALERT`);
    console.log(`User: ${req.user.email}`);
    console.log(`Action: Voting in Election ${electionId}`);
    console.log(`YOUR OTP CODE: ${otpCode}`);
    console.log(`Expires in: 5 minutes`);
    console.log('----------------------------------------\n');

    logger.info(`OTP generated for user ${userId} (Election: ${electionId})`);

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully (Check server console for hackathon mode)',
      debugOtp: otpCode, // For dynamic display in UI during testing
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify the 6-digit OTP
 */
exports.verifyOtp = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { electionId, otpCode } = req.body;

    if (!otpCode) {
      return res.status(400).json({ success: false, message: 'OTP code is required' });
    }

    const otpDoc = await Otp.findOne({ userId, electionId });

    if (!otpDoc) {
      return res.status(404).json({ success: false, message: 'No OTP found. Please request a new one.' });
    }

    // Check expiry
    if (new Date() > otpDoc.expiresAt) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    // Check attempts (max 3)
    if (otpDoc.attempts >= 3) {
      return res.status(400).json({ success: false, message: 'Maximum attempts reached. Please request a new one.' });
    }

    // Verify code
    const isMatch = await bcrypt.compare(otpCode, otpDoc.hashedOtp);

    if (!isMatch) {
      otpDoc.attempts += 1;
      await otpDoc.save();
      return res.status(400).json({ success: false, message: `Invalid OTP. ${3 - otpDoc.attempts} attempts remaining.` });
    }

    // Success
    otpDoc.isVerified = true;
    await otpDoc.save();

    logger.info(`OTP verified successfully for user ${userId}`);

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
    });
  } catch (error) {
    next(error);
  }
};
