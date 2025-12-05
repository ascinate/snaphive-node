const express = require("express");
const router = express.Router();
const { createHive, getUserHives, uploadHiveImages } = require("../controllers/hiveController");
const protect = require("../middleware/authMiddleware");
const multer = require("multer");
const fs = require("fs");

const uploadDir =
    process.env.VERCEL || process.env.NODE_ENV === "production"
        ? "/tmp/uploads"
        : "uploads";

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + "_" + file.originalname),
});

const upload = multer({ storage });

router.post("/", protect, upload.single("coverImage"), createHive);
router.get("/", protect, getUserHives);
router.post(
    "/:hiveId/images",
    protect,
    upload.array("images", 10),
    uploadHiveImages
);


module.exports = router;
