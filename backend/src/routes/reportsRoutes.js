const express = require('express');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');
const { getOverview, getAnimals, getReproduction, getMilk, getVaccinations, getBreeding, getWeights } = require('../controllers/reportsController');

const router = express.Router();
const farmerOnly = [authenticate, authorizeRoles('farmer')];
router.get('/overview', ...farmerOnly, getOverview);
router.get('/animals', ...farmerOnly, getAnimals);
router.get('/reproduction', ...farmerOnly, getReproduction);
router.get('/milk', ...farmerOnly, getMilk);
router.get('/vaccinations', ...farmerOnly, getVaccinations);
router.get('/breeding', ...farmerOnly, getBreeding);
router.get('/weights', ...farmerOnly, getWeights);
module.exports = router;
