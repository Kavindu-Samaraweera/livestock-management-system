const express = require('express');
const controller = require('../controllers/marketplaceController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();
const farmer = [authenticate, authorizeRoles('farmer')];
const customer = [authenticate, authorizeRoles('customer')];

router.get('/listings', controller.listListings);
router.get('/listings/mine', ...farmer, controller.listMine);
router.post('/listings', ...farmer, controller.createListing);
router.get('/listings/:id', controller.getListing);
router.patch('/listings/:id', ...farmer, controller.updateListing);
router.delete('/listings/:id', ...farmer, controller.deleteListing);

router.post('/orders', ...customer, controller.createOrder);
router.get('/orders', ...customer, controller.listCustomerOrders);
router.get('/orders/:id', ...customer, controller.getCustomerOrder);
router.patch('/orders/:id/cancel', ...customer, controller.cancelOrder);
router.get('/seller/orders', ...farmer, controller.listSellerOrders);
router.patch('/seller/orders/:id/status', ...farmer, controller.sellerOrderAction);

module.exports = router;
