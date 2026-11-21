const express = require('express');
const { getInventoryReport, getSalesReport } = require('../controllers/reportController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect, authorizeRoles('seller', 'admin'));
router.get('/inventory', getInventoryReport);
router.get('/sales', getSalesReport);

module.exports = router;