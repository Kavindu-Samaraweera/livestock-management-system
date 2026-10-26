const express = require('express');
const { getSummary } = require('../controllers/dashboardController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/summary', authenticate, authorizeRoles('farmer'), getSummary);

module.exports = router;
