const express = require("express");
const protect = require("../middleware/authMiddleware");
const { saveFcmToken } = require("../controllers/notificationController");

const router = express.Router();

router.post("/save-fcm-token", protect, saveFcmToken);

module.exports = router;
