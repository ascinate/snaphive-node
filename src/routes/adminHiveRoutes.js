const express = require("express");
const { getAllHives,forceExpireHive } = require("../controllers/adminController");
const adminAuth = require("../middleware/adminAuth");


const router = express.Router();

router.get("/", adminAuth,getAllHives);
router.post("/expire/:id", adminAuth, forceExpireHive);
module.exports = router;
