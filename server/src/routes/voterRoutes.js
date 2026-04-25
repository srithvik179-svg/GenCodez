const express = require('express');
const router = express.Router();
const voterController = require('../controllers/voterController');

/**
 * Voter Routes
 * Base path: /api/voters
 */

router.post('/register', voterController.registerVoter);
router.get('/:address', voterController.getVoterByAddress);
router.get('/', voterController.getVoters);

module.exports = router;
