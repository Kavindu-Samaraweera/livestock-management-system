const express = require('express');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');
const { listRecords, getRecord, createRecord, updateRecord, deleteRecord, history, upcomingDeliveries, summary } = require('../controllers/breedingController');

const router = express.Router();
const farmerOnly = [authenticate, authorizeRoles('farmer')];

router.get('/summary', ...farmerOnly, summary);
router.get('/upcoming-deliveries', ...farmerOnly, upcomingDeliveries);
router.get('/animal/:animalId/history', ...farmerOnly, history);
router.get('/', ...farmerOnly, listRecords);
router.post('/', ...farmerOnly, createRecord);
router.get('/:id', ...farmerOnly, getRecord);
router.patch('/:id', ...farmerOnly, updateRecord);
router.delete('/:id', ...farmerOnly, deleteRecord);

module.exports = router;
