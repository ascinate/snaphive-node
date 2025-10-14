const mongoose = require("mongoose");

const hiveSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  cover_photo: String,
  type: {
    type: String,
    enum: ["temporary", "permanent"],
    default: "permanent",
  },
  privacy: {
    type: String,
    enum: ["public", "private", "invite_only"],
    default: "private",
  },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
  created_at: { type: Date, default: Date.now },
  expires_at: Date,
  mood_theme: {
    type: String,
    enum: ["vintage", "energetic", "serene", "neutral"],
  },
  location: {
    lat: Number,
    lng: Number,
  },
  member_count: { type: Number, default: 1 },
  ai_mosaic_url: String,
  ai_story_url: String,
  status: {
    type: String,
    enum: ["active", "archived", "locked"],
    default: "active",
  },
  members: [
    {
      user_id: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
      role: {
        type: String,
        enum: ["admin", "member"],
        default: "member",
      },
      joined_at: { type: Date, default: Date.now },
      approved: { type: Boolean, default: true },
    },
  ],
});

module.exports = mongoose.model("hives", hiveSchema);
