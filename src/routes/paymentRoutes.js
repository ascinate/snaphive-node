const express = require('express');
const router = express.Router();
const { createPaymentIntent } = require('../controllers/paymentController');
const auth = require('../middleware/authMiddleware');

// We use auth middleware to ensure only logged in users can pay
router.post('/create-payment-intent', auth, createPaymentIntent);

module.exports = router;
