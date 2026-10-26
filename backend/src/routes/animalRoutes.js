const express = require('express');
const {
  listAnimals,
  getAnimal,
  createAnimal,
  updateAnimal,
  deleteAnimal
} = require('../controllers/animalController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();
const farmerOnly = [authenticate, authorizeRoles('farmer')];

router.get('/', ...farmerOnly, listAnimals);
router.post('/', ...farmerOnly, createAnimal);
router.get('/:id', ...farmerOnly, getAnimal);
router.patch('/:id', ...farmerOnly, updateAnimal);
router.delete('/:id', ...farmerOnly, deleteAnimal);

module.exports = router;
