const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    eventName: { type: String, required: true },
    eventType: { type: String, required: true },
    images: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", eventSchema);
