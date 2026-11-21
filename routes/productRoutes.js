const express = require('express');
const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const { requireFields } = require('../middleware/validateMiddleware');

const router = express.Router();

router.get('/', getProducts);
router.get('/:id', getProductById);
router.post(
  '/',
  protect,
  authorizeRoles('seller', 'admin'),
  requireFields('name', 'sku', 'price', 'stock', 'category'),
  createProduct
);
router.patch('/:id', protect, authorizeRoles('seller', 'admin'), updateProduct);
router.delete('/:id', protect, authorizeRoles('seller', 'admin'), deleteProduct);

module.exports = router;