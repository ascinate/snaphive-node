const express = require("express");
const { getAllUsers,getUserProfileAdmin,toggleUser,softDeleteUser,resetUserAccount } = require("../controllers/adminController");
const adminAuth = require("../middleware/adminAuth");

const router = express.Router();

router.get("/", adminAuth,getAllUsers);
router.get("/profile/:id", getUserProfileAdmin);
router.get("/toggle/:id", toggleUser);
router.get("/delete/:id", softDeleteUser);
router.get("/reset/:id", resetUserAccount);


module.exports = router;
