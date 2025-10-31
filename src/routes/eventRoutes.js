const express = require("express");
const router = express.Router();
const { createEvent, getAllEvents } = require("../controllers/eventController");
const protect = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Same upload logic as authRoutes
const uploadDir =
  process.env.VERCEL || process.env.NODE_ENV === "production"
    ? "/tmp/uploads"
    : "uploads";

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "_" + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) cb(null, true);
  else cb(new Error("Only image files are allowed"), false);
};

const upload = multer({ storage, fileFilter });

// Create Event (multi image upload supported)
router.post("/", protect, upload.array("images", 10), createEvent);

// Get All Events
router.get("/", getAllEvents);

module.exports = router;
