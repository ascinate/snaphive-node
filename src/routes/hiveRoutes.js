const express = require("express");
const router = express.Router();
const multer = require("multer");
const protect = require("../middleware/authMiddleware");
const { createHive, getUserHives, uploadHiveImages, inviteMemberByEmail, acceptHiveInvite, getHiveById, acceptHiveInviteByEmail } = require("../controllers/hiveController");

const storage = multer.diskStorage({

  destination: "uploads/",

  filename: (req, file, cb) => {

    cb(null, `${Date.now()}-${file.originalname}`);

  },

});

 
const upload = multer({
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 10 MB
    },
});

router.post("/", protect, upload.single("coverImage"), createHive);
router.get("/", protect, getUserHives);

router.get("/:hiveId", protect, getHiveById);
router.post(
    "/:hiveId/images",
    protect,
    upload.array("images", 4),
    uploadHiveImages
);
router.post("/:hiveId/invite", protect, inviteMemberByEmail);
router.post("/:hiveId/accept", protect, acceptHiveInvite);
router.get("/:hiveId/accept-request", acceptHiveInviteByEmail);

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