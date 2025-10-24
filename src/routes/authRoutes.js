const express = require("express");
const { register, login, verifyOTP, forgotPassword, resetPassword, resendOTP} = require("../controllers/authController");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/verify-otp", verifyOTP);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/resend-otp", resendOTP);
router.get("/profile", protect, (req, res) => {
  res.json({ message: "Access granted", user: req.user });
});

module.exports = router;
