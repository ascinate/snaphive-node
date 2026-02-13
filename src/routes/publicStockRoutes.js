const express = require("express");
const router = express.Router();
const { getStockImagesAPI } = require("../controllers/stockImageController");

router.get("/", getStockImagesAPI);

module.exports = router;
