const express = require("express");
const { renderDashboard } = require("../controllers/dashboardController");

const router = express.Router();

// GET /dashboard
router.get("/", renderDashboard);

module.exports = router;
