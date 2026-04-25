const VerificationSession = require('../models/VerificationSession');
const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Desktop: Create a new verification session
 */
exports.createSession = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const sessionId = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    // Get local IP for mobile access
    const os = require('os');
    const interfaces = os.networkInterfaces();
    let serverIp = 'localhost';
    for (const devName in interfaces) {
      const iface = interfaces[devName];
      for (let i = 0; i < iface.length; i++) {
        const alias = iface[i];
        if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
          serverIp = alias.address;
          break;
        }
      }
    }

    const session = await VerificationSession.create({
      sessionId,
      userId,
      expiresAt,
    });

    logger.info(`Verification session created: ${sessionId} for user ${userId}`);

    res.status(201).json({
      success: true,
      data: {
        sessionId: session.sessionId,
        expiresAt: session.expiresAt,
        serverIp,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Desktop: Polling endpoint to check status
 */
exports.checkStatus = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const session = await VerificationSession.findOne({ sessionId });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    if (new Date() > session.expiresAt && session.status === 'pending') {
      session.status = 'expired';
      await session.save();
    }

    res.status(200).json({
      success: true,
      data: {
        status: session.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mobile: Simulate biometric authentication and verify session
 */
exports.verifySession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const session = await VerificationSession.findOne({ sessionId });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Invalid or expired session' });
    }

    if (session.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Session is already ${session.status}` });
    }

    if (new Date() > session.expiresAt) {
      session.status = 'expired';
      await session.save();
      return res.status(400).json({ success: false, message: 'Session has expired' });
    }

    // SIMULATED BIOMETRIC: In a real app, this would be a WebAuthn signature check
    session.status = 'verified';
    await session.save();

    logger.info(`Verification session ${sessionId} VERIFIED via mobile`);

    res.status(200).json({
      success: true,
      message: 'Biometric verification successful!',
    });
  } catch (error) {
    next(error);
  }
};
