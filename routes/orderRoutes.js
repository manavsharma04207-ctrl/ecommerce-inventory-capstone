const express = require('express');
const { placeOrder, getMyOrders, updateOrderStatus } = require('../controllers/orderController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const { requireFields } = require('../middleware/validateMiddleware');

const router = express.Router();

router.post('/', protect, authorizeRoles('customer'), requireFields('shippingAddress'), placeOrder);
router.get('/my', protect, authorizeRoles('customer'), getMyOrders);
router.patch('/:id/status', protect, requireFields('status'), updateOrderStatus);

module.exports = router;