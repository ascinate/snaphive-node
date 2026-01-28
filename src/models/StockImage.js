const mongoose = require("mongoose");

const stockImageSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    file: { type: String, required: true }, 
    category: {
      type: String,
      enum: ["event", "nature", "people", "corporate", "other"],
      default: "other",
    },
    tags: [{ type: String }],

    isActive: {
      type: Boolean,
      default: true,
    },

    usage: {
      coverAllowed: { type: Boolean, default: true },
      galleryAllowed: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("StockImage", stockImageSchema);
