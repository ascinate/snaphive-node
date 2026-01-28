const StockImage = require("../models/StockImage");
const path = require("path");
const fs = require("fs");

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
    const file = req.file;

    if (!file) {
      return res.status(400).send("No file uploaded");
    }

    const newStock = new StockImage({
      title,
      file: file.filename,
      category,
      tags: tags ? tags.split(",").map((t) => t.trim()) : [],
      usage: { coverAllowed: coverAllowed ? true : false },
    });

    await newStock.save();
    res.redirect("/static-stock");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

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
  deleteStockImage,
};
