const StockImage = require("../models/StockImage");
const path = require("path");
const fs = require("fs");
const bucket = require("../config/firebase");


const { v4: uuidv4 } = require("uuid");

const getAllImages = async (req, res) => {
  try {
    const stockImages = await StockImage.find().sort({ createdAt: -1 });

    res.render("admin/stock-images", {
      title: "Stock Image Management",
      stockImages,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};



const addStockImage = async (req, res) => {
  try {
    const { title, category, tags, coverAllowed } = req.body;

    if (!req.file) {
      return res.status(400).send("No file uploaded");
    }

    const fileName = `stock/${uuidv4()}-${req.file.originalname}`;
    const file = bucket.file(fileName);

    // Upload to Firebase
    await file.save(req.file.buffer, {
      metadata: {
        contentType: req.file.mimetype,
      },
      public: true,
    });

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    const newStock = new StockImage({
      title,
      file: publicUrl, // 🔥 STORE FULL URL
      category,
      tags: tags ? tags.split(",").map(t => t.trim()) : [],
      usage: { coverAllowed: !!coverAllowed },
    });

    await newStock.save();

    res.redirect("/static-stock");
  } catch (err) {
    console.error("🔥 Stock upload error:", err);
    res.status(500).send("Server error");
  }
};

module.exports = { addStockImage };


const deleteStockImage = async (req, res) => {
  try {
    const { id } = req.params;
    const stock = await StockImage.findById(id);
    if (!stock) return res.status(404).send("Image not found");

    // delete file from disk
    const filePath = path.join(__dirname, "..", stock.file);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await StockImage.findByIdAndDelete(id);
    res.redirect("/static-stock");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};




module.exports = {
  getAllImages,
  addStockImage,
  deleteStockImage
};
