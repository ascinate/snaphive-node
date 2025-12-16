const express = require("express");
const { getAllHives,forceExpireHive,deleteHives } = require("../controllers/adminController");
const adminAuth = require("../middleware/adminAuth");


const router = express.Router();

router.get("/", adminAuth,getAllHives);
router.post("/expire/:id", adminAuth, forceExpireHive);
router.delete("/", adminAuth, deleteHives);
router.delete("/:id", adminAuth, deleteHives); 

module.exports = router;
