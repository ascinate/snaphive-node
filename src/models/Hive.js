
const mongoose = require("mongoose");

const hiveSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
 
  hiveName: { type: String, required: true },
  description: { type: String },
  privacyMode: { type: String, enum: ["automatic", "approval"], default: "automatic" },
  status: {
    type: String,
    enum: ["active", "hidden", "deleted"],
    default: "active",
  },
  isFlagged: {
  type: Boolean,
  default: false,
},

flagReason: {
  type: String,
  default: null,
},
  isTemporary: { type: Boolean, default: false },
  eventDate: { type: Date },
  startTime: { type: String },
  endTime: { type: String },
  expiryDate: { type: Date },
  coverImage: { type: String, default: null },
  images: [
    {
      url: { type: String, required: true },
      blurred: { type: Boolean, default: false },
    },
  ],

  members: [
    {
      memberId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      email: { type: String, required: true },
      status: { type: String, enum: ["pending", "accepted"], default: "pending" },
      expiryDate: {
        type: Date, default: function () {
          const now = new Date();
          now.setMonth(now.getMonth() + 1);
          return now;
        },
      },
    },
  ],
  isExpired: { type: Boolean, default: false },
}, { timestamps: true });


hiveSchema.methods.checkExpiry = function () {
  if (this.isTemporary && this.expiryDate && new Date() > new Date(this.expiryDate)) {
    this.isExpired = true;
  }
};

module.exports = mongoose.model("Hive", hiveSchema);

