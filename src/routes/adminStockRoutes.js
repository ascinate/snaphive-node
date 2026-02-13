const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const adminAuth = require("../middleware/adminAuth");
const {
    getAllImages,
    addStockImage,
    deleteStockImage,
    updateStockImage
} = require("../controllers/stockImageController");

const fs = require("fs");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});


router.get("/", adminAuth, getAllImages);
router.post("/", adminAuth, upload.single("imageFile"), addStockImage);
router.post("/update-image/:id", upload.single("imageFile"), updateStockImage);

router.post("/delete/:id", adminAuth, deleteStockImage);



module.exports = router;
