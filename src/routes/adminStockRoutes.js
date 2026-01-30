const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const adminAuth = require("../middleware/adminAuth");
const {
    getAllImages,
    addStockImage,
    deleteStockImage
} = require("../controllers/stockImageController");

const fs = require("fs");

const uploadDir = path.join(__dirname, "../public/stock");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({ storage });


router.get("/", adminAuth, getAllImages);
router.post("/", adminAuth, upload.single("imageFile"), addStockImage);
router.post("/delete/:id", adminAuth, deleteStockImage);



module.exports = router;
