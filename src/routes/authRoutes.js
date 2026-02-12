const express = require("express");
const {
  register,
  login,
  verifyOTP,
  forgotPassword,
  resetPassword,
  resendOTP,
  updateProfile,
  appleLogin
} = require("../controllers/authController");
const protect = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();



router.post("/register", register);
router.post("/verify-otp", verifyOTP);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/resend-otp", resendOTP);
router.put("/update-profile", protect, updateProfile);

router.get("/profile", protect, (req, res) => {
  res.json({ message: "Access granted", user: req.user });
});
router.post("/apple", appleLogin);


module.exports = router;
