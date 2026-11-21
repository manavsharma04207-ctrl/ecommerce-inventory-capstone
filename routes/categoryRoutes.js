const express = require('express');
const { createCategory, getCategories } = require('../controllers/categoryController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const { requireFields } = require('../middleware/validateMiddleware');

const router = express.Router();

router.get('/', getCategories);
router.post('/', protect, authorizeRoles('admin'), requireFields('name'), createCategory);

module.exports = router;