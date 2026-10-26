const express = require('express');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');
const { listRecords, getRecord, createRecord, updateRecord, deleteRecord, getHistory } = require('../controllers/weightController');

const router = express.Router();
const farmerOnly = [authenticate, authorizeRoles('farmer')];

router.get('/animal/:animalId/history', ...farmerOnly, getHistory);
router.get('/', ...farmerOnly, listRecords);
router.post('/', ...farmerOnly, createRecord);
router.get('/:id', ...farmerOnly, getRecord);
router.patch('/:id', ...farmerOnly, updateRecord);
router.delete('/:id', ...farmerOnly, deleteRecord);

module.exports = router;
