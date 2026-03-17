const express = require("express");
const router = express.Router();
const multer = require("multer");
const protect = require("../middleware/authMiddleware");
const { createHive, getUserHives, getPublicHives,toggleLikeHive,addComment, saveHiveImageUrls, inviteMember, updateHive, acceptHiveInvite, getHiveById,blurHiveImage,deleteHive,joinHiveByQR } = require("../controllers/hiveController");

// ✅ Use memory storage instead of disk storage
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: {
        fileSize: 8 * 1024 * 1024, // 10 MB
    },
});

router.post("/", protect, upload.single("coverImage"), createHive);
router.get("/", protect, getUserHives);
router.get("/feed/public", protect, getPublicHives);
router.post("/:hiveId/like", protect, toggleLikeHive);
router.post("/:hiveId/comment", protect, addComment);

router.get("/:hiveId", protect, getHiveById);
router.post("/:hiveId/images", protect, saveHiveImageUrls);
router.put("/:hiveId", protect, updateHive);
router.post("/:hiveId/invite", protect, inviteMember);
router.get("/:hiveId/accept-request", acceptHiveInvite);
router.post("/:hiveId/join", joinHiveByQR);
router.put("/:hiveId/blur-image", protect, blurHiveImage);
router.delete("/:hiveId", protect, deleteHive);



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