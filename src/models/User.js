const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    name: { type: String },

    email: {
      type: String,
      unique: true,
      sparse: true,
    },

    appleId: {
      type: String,
      unique: true,
      sparse: true,
    },

    provider: {
      type: String,
      enum: ["email", "apple"],
      default: "email",
    },

    password: {
      type: String,
      required: function () {
        return this.provider === "email";
      },
    },

    fcmToken: { type: String, default: null },

    otp: { type: String },
    otpExpires: { type: Date },

    isVerified: { type: Boolean, default: false },
    profileImage: { type: String, default: null },

    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },

    deviceType: { type: String, default: "Web" },
    lastLogin: { type: Date },
  },
  { timestamps: true }
);

// ✅ SAFE password hashing
userSchema.pre("save", async function (next) {
  if (!this.password) return next();
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function (password) {
  if (!this.password) return false;
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("User", userSchema);
