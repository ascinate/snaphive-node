const express = require("express");
const {
  register,
  login,
  verifyOTP,
  forgotPassword,
  resetPassword,
  resendOTP,
  updateProfile,
} = require("../controllers/authController");
const protect = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

// ✅ Detect environment (Vercel uses read-only FS except /tmp)
const uploadDir =
  process.env.VERCEL || process.env.NODE_ENV === "production"
    ? "/tmp/uploads"
    : "uploads";

// ✅ Ensure directory exists
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// ✅ Multer storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "_" + file.originalname);
  },
});

// ✅ Allow only image uploads
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) cb(null, true);
  else cb(new Error("Only image files are allowed"), false);
};

const upload = multer({ storage, fileFilter });

// ✅ Routes
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
