const express = require("express");
const router = express.Router();
const multer = require("multer");
const protect = require("../middleware/authMiddleware");
const { createHive, getUserHives, getPublicHives,toggleLikeHive,addComment, saveHiveImageUrls, inviteMember, updateHive, acceptHiveInvite, getHiveById,blurHiveImage,deleteHive,joinHiveByQR, uploadMediaAPI, deleteHiveMedia, getNearbyHives } = require("../controllers/hiveController");

// ✅ Use memory storage instead of disk storage
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100 MB
    },
});

router.post("/", protect, upload.single("coverImage"), createHive);
router.post("/upload-media", protect, upload.single("file"), uploadMediaAPI);
router.get("/", protect, getUserHives);
router.get("/nearby", protect, getNearbyHives);
router.get("/feed/public", protect, getPublicHives);
router.post("/:hiveId/like", protect, toggleLikeHive);
router.post("/:hiveId/comment", protect, addComment);

router.get("/:hiveId", protect, getHiveById);
router.post("/:hiveId/images", protect, saveHiveImageUrls);
router.post("/:hiveId/videos", protect, saveHiveImageUrls);
router.put("/:hiveId", protect, updateHive);
router.post("/:hiveId/invite", protect, inviteMember);
router.get("/:hiveId/accept-request", acceptHiveInvite);
router.post("/:hiveId/join", joinHiveByQR);
router.put("/:hiveId/blur-image", protect, blurHiveImage);
router.delete("/:hiveId", protect, deleteHive);
router.delete("/:hiveId/media", protect, deleteHiveMedia);



router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({
            success: false,
            message: err.message,
        });
    }
    next(err);
});

module.exports = router;