
const mongoose = require("mongoose");

const hiveSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  hiveName: { type: String, required: true },
  description: { type: String },
  privacyMode: { type: String, enum: ["automatic", "approval"], default: "automatic" },
  isTemporary: { type: Boolean, default: false },
  eventDate: { type: Date },
  startTime: { type: String },
  endTime: { type: String },
  expiryDate: { type: Date },
  coverImage: { type: String, default: null },
  isExpired: { type: Boolean, default: false },
}, { timestamps: true });


hiveSchema.methods.checkExpiry = function () {
  if (this.isTemporary && this.expiryDate && new Date() > new Date(this.expiryDate)) {
    this.isExpired = true;
  }
};

module.exports = mongoose.model("Hive", hiveSchema);

