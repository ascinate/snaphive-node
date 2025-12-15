const express = require("express");
const { getAllUsers } = require("../controllers/adminController");
const adminAuth = require("../middleware/adminAuth");

const router = express.Router();

router.get("/", adminAuth,getAllUsers);

module.exports = router;
