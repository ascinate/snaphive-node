const User = require("../models/User");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();


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
    const { name, email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email already exists" });
    const otp = generateOTP();
    const otpExpires = Date.now() + 5 * 60 * 1000;

    const user = await User.create({ name, email, password, otp, otpExpires });
    await sendOTPEmail(email, otp);
    res.status(201).json({
    message: "OTP sent to your email. Please verify to complete registration.",
      user: { id: user._id, email },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ message: "User not found" });
    if (user.isVerified) return res.status(400).json({ message: "Already verified" });
    if (user.otp !== otp) return res.status(400).json({ message: "Invalid OTP" });
    if (user.otpExpires < Date.now()) return res.status(400).json({ message: "OTP expired" });

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.json({ message: "Email verified successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


const login = async (req, res) => { 
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid email or password" });
    if (!user.isVerified) {
      return res.status(403).json({
        message: "Please verify your email before logging in.",
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: "Invalid email or password" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({
      message: "Login success",
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
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



module.exports = { register, login, verifyOTP, forgotPassword, resetPassword};
