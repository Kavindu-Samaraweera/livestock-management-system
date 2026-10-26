const express = require('express');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');
const controller = require('../controllers/adminController');
const adminData = require('../controllers/adminDataController');
const animalController = require('../controllers/animalController');
const milkController = require('../controllers/milkController');
const vaccinationController = require('../controllers/vaccinationController');
const weightController = require('../controllers/weightController');
const breedingController = require('../controllers/breedingController');
const Animal = require('../models/Animal');
const MilkRecord = require('../models/MilkRecord');
const VaccinationRecord = require('../models/VaccinationRecord');
const WeightRecord = require('../models/WeightRecord');
const BreedingRecord = require('../models/BreedingRecord');
const MarketplaceListing = require('../models/MarketplaceListing');
const marketplaceController = require('../controllers/marketplaceController');
const { requireFarmerTarget, scopeExistingRecord } = require('../middleware/adminRecordScope');

const router = express.Router();
const adminOnly = [authenticate, authorizeRoles('superadmin')];

router.get('/overview', ...adminOnly, controller.getOverview);
router.get('/users', ...adminOnly, controller.listUsers);
router.post('/users', ...adminOnly, controller.createUser);
router.get('/users/:id', ...adminOnly, controller.getUserDetails);
router.patch('/users/:id/status', ...adminOnly, controller.changeUserStatus);
router.patch('/users/:id', ...adminOnly, controller.updateUser);
router.delete('/users/:id', ...adminOnly, controller.deleteUser);
router.get('/listings', ...adminOnly, controller.listListings);
router.patch('/listings/:id/moderate', ...adminOnly, controller.moderateListing);
router.patch('/listings/:id', ...adminOnly, controller.updateListing);
router.delete('/listings/:id', ...adminOnly, controller.deleteListing);
router.post('/data/listings', ...adminOnly, requireFarmerTarget(MarketplaceListing, 'seller'), marketplaceController.createListing);
router.get('/orders', ...adminOnly, controller.listOrders);
router.get('/logs', ...adminOnly, controller.listLogs);

router.get('/data/animals', ...adminOnly, adminData.listAnimals);
router.post('/data/animals', ...adminOnly, requireFarmerTarget(Animal), animalController.createAnimal);
router.get('/data/animals/:id', ...adminOnly, scopeExistingRecord(Animal), animalController.getAnimal);
router.patch('/data/animals/:id', ...adminOnly, scopeExistingRecord(Animal), animalController.updateAnimal);
router.delete('/data/animals/:id', ...adminOnly, scopeExistingRecord(Animal), animalController.deleteAnimal);

router.get('/data/milk', ...adminOnly, adminData.listMilk);
router.post('/data/milk', ...adminOnly, requireFarmerTarget(MilkRecord), milkController.createRecord);
router.get('/data/milk/:id', ...adminOnly, scopeExistingRecord(MilkRecord), milkController.getRecord);
router.patch('/data/milk/:id', ...adminOnly, scopeExistingRecord(MilkRecord), milkController.updateRecord);
router.delete('/data/milk/:id', ...adminOnly, scopeExistingRecord(MilkRecord), milkController.deleteRecord);

router.get('/data/vaccinations', ...adminOnly, adminData.listVaccinations);
router.post('/data/vaccinations', ...adminOnly, requireFarmerTarget(VaccinationRecord), vaccinationController.createRecord);
router.get('/data/vaccinations/:id', ...adminOnly, scopeExistingRecord(VaccinationRecord), vaccinationController.getRecord);
router.patch('/data/vaccinations/:id', ...adminOnly, scopeExistingRecord(VaccinationRecord), vaccinationController.updateRecord);
router.delete('/data/vaccinations/:id', ...adminOnly, scopeExistingRecord(VaccinationRecord), vaccinationController.deleteRecord);

router.get('/data/weights', ...adminOnly, adminData.listWeights);
router.post('/data/weights', ...adminOnly, requireFarmerTarget(WeightRecord), weightController.createRecord);
router.get('/data/weights/:id', ...adminOnly, scopeExistingRecord(WeightRecord), weightController.getRecord);
router.patch('/data/weights/:id', ...adminOnly, scopeExistingRecord(WeightRecord), weightController.updateRecord);
router.delete('/data/weights/:id', ...adminOnly, scopeExistingRecord(WeightRecord), weightController.deleteRecord);

router.get('/data/breeding', ...adminOnly, adminData.listBreeding);
router.post('/data/breeding', ...adminOnly, requireFarmerTarget(BreedingRecord), breedingController.createRecord);
router.get('/data/breeding/:id', ...adminOnly, scopeExistingRecord(BreedingRecord), breedingController.getRecord);
router.patch('/data/breeding/:id', ...adminOnly, scopeExistingRecord(BreedingRecord), breedingController.updateRecord);
router.delete('/data/breeding/:id', ...adminOnly, scopeExistingRecord(BreedingRecord), breedingController.deleteRecord);

module.exports = router;
