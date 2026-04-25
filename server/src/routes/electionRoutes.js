const express = require('express');
const router = express.Router();
const electionController = require('../controllers/electionController');
const { protect, optionalProtect, authorize } = require('../middlewares/authMiddleware');

/**
 * Election Routes
 * Base path: /api/elections
 */

router.get('/', electionController.getElections);
router.post('/', protect, authorize('admin'), electionController.createElection);
router.get('/:id', optionalProtect, electionController.getElectionById);
router.put('/:id', protect, authorize('admin'), electionController.updateElection);
router.post('/:id/token', protect, electionController.generateToken);
router.post('/:id/vote', protect, electionController.castVote);
router.get('/:id/results', electionController.getElectionResults);

// Admin actions
router.post('/:id/candidates', protect, authorize('admin'), electionController.addCandidate);
router.post('/:id/activate', protect, authorize('admin'), electionController.activateElection);
router.delete('/:id', protect, authorize('admin'), electionController.deleteElection);

module.exports = router;
