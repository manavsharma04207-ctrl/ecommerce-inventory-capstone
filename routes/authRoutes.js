const express = require('express');
const { register, login, refresh, logout } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { requireFields } = require('../middleware/validateMiddleware');

const router = express.Router();

router.post('/register', requireFields('name', 'email', 'password'), register);
router.post('/login', requireFields('email', 'password'), login);
router.post('/refresh', refresh);
router.post('/logout', protect, logout);

module.exports = router;