const express = require("express");
const { register, login, verifyOTP, forgotPassword, resetPassword, resendOTP, updateProfile} = require("../controllers/authController");
const protect = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});


const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) cb(null, true);
  else cb(new Error("Only image files are allowed"), false);
};

const upload = multer({ storage, fileFilter });

router.post("/register", register);
router.post("/verify-otp", verifyOTP);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/resend-otp", resendOTP);
router.put("/update-profile", protect, upload.single("profileImage"), updateProfile);
router.get("/profile", protect, (req, res) => {
  res.json({ message: "Access granted", user: req.user });
});

module.exports = router;
