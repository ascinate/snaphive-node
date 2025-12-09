const express = require("express");
const router = express.Router();
const { createHive, getUserHives, uploadHiveImages, getHiveById, inviteMemberByEmail, acceptHiveInvite } = require("../controllers/hiveController");
const protect = require("../middleware/authMiddleware");
const multer = require("multer");
const fs = require("fs");

const uploadDir =
    process.env.VERCEL || process.env.NODE_ENV === "production"
        ? "/tmp/uploads"
        : "uploads";

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({

    storage: multer.memoryStorage(),

    limits: { fileSize: 10 * 1024 * 1024 },

});

router.post("/", protect, upload.single("coverImage"), createHive);
router.get("/", protect, getUserHives);
router.get("/:hiveId", protect, getHiveById);
router.post(
    "/:hiveId/images",
    protect,
    upload.array("images", 10),
    uploadHiveImages
);
router.post("/:hiveId/invite", protect, inviteMemberByEmail);
router.post("/:hiveId/accept", protect, acceptHiveInvite);

module.exports = router;
