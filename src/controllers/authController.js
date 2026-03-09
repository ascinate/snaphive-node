const User = require("../models/User");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const twilio = require("twilio");
const fs = require("fs");
const appleSigninAuth = require("apple-signin-auth");
const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();



const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);



const sendEmail = async (to, subject, html) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"SnapHive" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
};


const sendOTPEmail = async (email, otp) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"SnapHive" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your SnapHive OTP Verification Code",
    html: `
      <div style="font-family:sans-serif;line-height:1.6">
        <h2>Welcome to SnapHive 🎉</h2>
        <p>Your OTP code is:</p>
        <h1 style="background:#000;color:#fff;display:inline-block;padding:8px 16px;border-radius:8px;">${otp}</h1>
        <p>This code will expire in 5 minutes.</p>
      </div>
    `,
  });
};


const register = async (req, res) => {
  try {

    const { name, email, phone, password } = req.body;

    if (!email && !phone) {
      return res.status(400).json({
        message: "Email or phone is required",
      });
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { phone }]
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const otp = generateOTP();
    const otpExpires = Date.now() + 5 * 60 * 1000;

    const user = await User.create({
      name,
      email: email || null,
      phone: phone || null,
      password,
      provider: phone ? "phone" : "email",
      otp,
      otpExpires
    });

    if (email) {
      await sendOTPEmail(email, otp);
    }

    if (phone) {
      await twilioClient.verify.v2
        .services(process.env.TWILIO_VERIFY_SERVICE_SID)
        .verifications.create({
          to: phone,
          channel: "sms",
        });
    }

    res.status(201).json({
      message: "OTP sent successfully",
      user: { id: user._id, email, phone },
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { email, phone, otp } = req.body;

    const user = await User.findOne({
      $or: [{ email }, { phone }],
    });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (phone) {
      const verification = await twilioClient.verify.v2
        .services(process.env.TWILIO_VERIFY_SERVICE_SID)
        .verificationChecks.create({
          to: phone,
          code: otp,
        });

      if (verification.status !== "approved") {
        return res.status(400).json({ message: "Invalid OTP" });
      }
    } else {
      if (user.otp !== otp) {
        return res.status(400).json({ message: "Invalid OTP" });
      }

      if (user.otpExpires < Date.now()) {
        return res.status(400).json({ message: "OTP expired" });
      }
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;

    await user.save();

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Verification successful",
      token,
      user,
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const login = async (req, res) => {
  try {

    const { email, phone, password } = req.body;

    const user = await User.findOne({
      $or: [{ email }, { phone }]
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    if (user.provider === "email") {

      const isMatch = await user.comparePassword(password);

      if (!isMatch) {
        return res.status(400).json({
          message: "Invalid credentials",
        });
      }

    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      user
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


const appleLogin = async (req, res) => {
  try {
    const { identityToken, email, fullName, fcmToken } = req.body;

    if (!identityToken) {
      return res.status(400).json({ message: "Missing Apple token" });
    }

    const appleData = await appleSigninAuth.verifyIdToken(identityToken, {
      audience: process.env.APPLE_CLIENT_ID,
      ignoreExpiration: true,
    });

    let user = await User.findOne({ appleId: appleData.sub });

    if (!user) {
      user = await User.create({
        appleId: appleData.sub,
        email: email || appleData.email || null,
        name: fullName?.givenName || "Apple User",
        provider: "apple",
        isVerified: true,
        isActive: true,
        fcmToken: fcmToken || null,
      });
    } else {
      // 🔥 update FCM token if changed
      if (fcmToken && user.fcmToken !== fcmToken) {
        user.fcmToken = fcmToken;
      }

      user.lastLogin = new Date();
      await user.save();
    }

    if (user.isDeleted) {
      return res.status(403).json({ message: "Account deactivated" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Account blocked" });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Apple login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        provider: user.provider,
      },
    });
  } catch (err) {
    console.error("Apple login error:", err);
    res.status(401).json({ message: "Apple authentication failed" });
  }
};






const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = Date.now() + 5 * 60 * 1000;
    await user.save();

    await sendEmail(
      email,
      "SnapHive Password Reset OTP",
      `
        <div style="font-family:sans-serif;line-height:1.6">
          <h2>Reset your SnapHive password 🔐</h2>
          <p>Your password reset OTP is:</p>
          <h1 style="background:#000;color:#fff;display:inline-block;padding:8px 16px;border-radius:8px;">${otp}</h1>
          <p>This OTP will expire in 5 minutes.</p>
        </div>
      `
    );

    res.json({ message: "Password reset OTP sent to your email" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ message: "User not found" });
    if (user.otp !== otp) return res.status(400).json({ message: "Invalid OTP" });
    if (user.otpExpires < Date.now()) return res.status(400).json({ message: "OTP expired" });
    user.password = newPassword;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = Date.now() + 5 * 60 * 1000;
    await user.save();


    await sendEmail(
      email,
      "SnapHive OTP Resend Request",
      `
        <div style="font-family:sans-serif;line-height:1.6">
          <h2>Here’s your new SnapHive verification code 🔄</h2>
          <p>Your new OTP code is:</p>
          <h1 style="background:#000;color:#fff;display:inline-block;padding:8px 16px;border-radius:8px;">${otp}</h1>
          <p>This code will expire in 5 minutes.</p>
        </div>
      `
    );

    res.json({ message: "OTP resent successfully" });
  } catch (err) {
    console.error("Resend OTP Error:", err);
    res.status(500).json({ message: "Failed to resend OTP" });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;

    if (req.body.profileImage) {
      user.profileImage = req.body.profileImage;
    }

    await user.save();

    res.json({
      success: true,
      message: "Profile updated successfully",
      user,
    });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ message: err.message });
  }
};


module.exports = { register, login, verifyOTP, forgotPassword, resetPassword, resendOTP, updateProfile, appleLogin };

