const express = require('express');
const { getCart, addToCart, removeFromCart } = require('../controllers/cartController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const { requireFields } = require('../middleware/validateMiddleware');

const router = express.Router();

router.use(protect, authorizeRoles('customer'));
router.get('/', getCart);
router.post('/items', requireFields('productId', 'quantity'), addToCart);
router.delete('/items/:productId', removeFromCart);

module.exports = router;