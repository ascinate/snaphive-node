const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const adminAuth = require("../middleware/adminAuth");
const {
  getAllImages,
  addStockImage,
  deleteStockImage,
} = require("../controllers/stockImageController");

const fs = require("fs");

const uploadDir = path.join(__dirname, "../../uploads/stock");


if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });


router.get("/", adminAuth, getAllImages);
router.post("/", adminAuth, upload.single("imageFile"), addStockImage);
router.post("/delete/:id", adminAuth, deleteStockImage);

module.exports = router;
