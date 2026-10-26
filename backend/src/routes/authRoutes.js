const express = require('express');
const {
  register,
  login,
  getCurrentUser,
  updateCurrentUser,
  roleAccess
} = require('../controllers/authController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, getCurrentUser);
router.patch('/me', authenticate, updateCurrentUser);
router.get('/farmer-access', authenticate, authorizeRoles('farmer'), roleAccess('farmer'));
router.get('/customer-access', authenticate, authorizeRoles('customer'), roleAccess('customer'));

module.exports = router;
