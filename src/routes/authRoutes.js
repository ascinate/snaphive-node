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

const uploadDir =
  process.env.VERCEL || process.env.NODE_ENV === "production"
    ? "/tmp/uploads"
    : "uploads";

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "_" + file.originalname);
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
router.post("/apple", appleLogin);


module.exports = router;
