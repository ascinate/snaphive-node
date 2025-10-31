const express = require("express");
const router = express.Router();
const { createEvent, getAllEvents } = require("../controllers/eventController");
const protect = require("../middleware/authMiddleware");

router.post("/", protect, createEvent);

router.get("/", getAllEvents);

module.exports = router;
