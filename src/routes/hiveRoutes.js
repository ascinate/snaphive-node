const express = require("express");
const router = express.Router();
const { createHive, getUserHives } = require("../controllers/hiveController");
const protect = require("../middleware/authMiddleware");
const multer = require("multer");

// 🔥 Use memory storage for Firebase
const upload = multer({ storage: multer.memoryStorage() });

router.post("/", protect, upload.single("coverImage"), createHive);
router.get("/", protect, getUserHives);

module.exports = router;
