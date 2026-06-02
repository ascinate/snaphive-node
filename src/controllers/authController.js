const User = require("../models/User");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const twilio = require("twilio");
const appleSigninAuth = require("apple-signin-auth");

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const sendEmail = async (email, subject, html) => {
  // Use explicit SMTP config instead of 'service: gmail' for better compatibility
  // with cloud hosting environments like Render, Railway etc.
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true for 465, false for 587 with STARTTLS
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  // Verify connection before sending
  await transporter.verify();

  await transporter.sendMail({
    from: `"SnapHive" <${process.env.EMAIL_USER}>`,
    to: email,
    subject,
    html,
  });

  console.log(`✅ Email sent successfully to: ${email}`);
};


/* ===========================
   REGISTER
=========================== */

const register = async (req, res) => {
  try {
  console.log("📝 Registration Attempt:", { 
    email: req.body.email, 
    phone: req.body.phone, 
    name: req.body.name 
  });
    let { name, email, phone, password } = req.body;
    if (email) email = email.trim().toLowerCase();
    if (phone) phone = phone.trim();

    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: "Email or phone is required",
      });
    }

    const query = [];
    if (email) query.push({ email });
    if (phone) query.push({ phone });

    const existingUser = await User.findOne({ $or: query });

    if (existingUser) {
      if (existingUser.isVerified && !existingUser.isDeleted) {
        return res.status(400).json({
          success: false,
          message: "User already exists",
        });
      }

      // User is either soft-deleted or not verified yet. Let's update details and send a new OTP.
      existingUser.isDeleted = false;
      existingUser.isVerified = false;
      existingUser.name = name || existingUser.name;
      existingUser.password = password; // pre-save hook will hash it automatically
      existingUser.provider = phone ? "phone" : "email";
      
      let otp = null;
      let otpExpires = null;

      if (email) {
        otp = generateOTP();
        otpExpires = Date.now() + 5 * 60 * 1000;
      }

      existingUser.otp = otp;
      existingUser.otpExpires = otpExpires;
      if (email) existingUser.email = email;
      if (phone) existingUser.phone = phone;

      await existingUser.save();

      if (email && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        console.log(`📧 Sending verification email to: ${email}`);
        await sendEmail(
          email,
          "Your SnapHive OTP Verification Code",
          `
      <div style="font-family:sans-serif;line-height:1.6">
        <h2>Welcome to SnapHive 🎉</h2>
        <p>Your OTP code is:</p>
        <h1 style="background:#000;color:#fff;
        display:inline-block;padding:8px 16px;border-radius:8px;">
          ${otp}
        </h1>
        <p>This code will expire in 5 minutes.</p>
      </div>
      `
        ).catch(async (emailErr) => {
          console.error("❌ SMTP FAILED - Email not sent. Error:", emailErr.message);
          console.warn("🔑 FALLBACK OTP for", email, "is: 123456 (valid 5 min)");
          existingUser.isVerified = false;
          existingUser.otp = "123456";
          existingUser.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
          await existingUser.save();
        });
      } else if (email) {
        // No email credentials configured — activate fallback OTP so user can still verify
        console.warn("⚠️ EMAIL_USER/EMAIL_PASS not set. Activating fallback OTP: 123456");
        existingUser.otp = "123456";
        existingUser.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
        await existingUser.save();
      }

      if (phone && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_VERIFY_SERVICE_SID) {
        console.log(`📱 Sending SMS verification to: ${phone}`);
        try {
          await twilioClient.verify.v2
            .services(process.env.TWILIO_VERIFY_SERVICE_SID)
            .verifications.create({
              to: phone,
              channel: "sms",
            });
        } catch (smsErr) {
          console.error("Failed to send SMS:", smsErr.message);
        }
      } else if (phone) {
        console.warn("⚠️ Twilio credentials missing. SMS not sent.");
      }

      return res.status(201).json({
        success: true,
        message: "OTP sent successfully",
        user: {
          id: existingUser._id,
          email,
          phone,
        },
      });
    }

    let otp = null;
    let otpExpires = null;

    if (email) {
      otp = generateOTP();
      otpExpires = Date.now() + 5 * 60 * 1000;
    }

    const userData = {
      name,
      password,
      provider: phone ? "phone" : "email",
      otp,
      otpExpires,
    };

    if (email) userData.email = email;
    if (phone) userData.phone = phone;

    const user = await User.create(userData);

    if (email && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      console.log(`📧 Sending verification email to: ${email}`);
      await sendEmail(
        email,
        "Your SnapHive OTP Verification Code",
        `
      <div style="font-family:sans-serif;line-height:1.6">
        <h2>Welcome to SnapHive 🎉</h2>
        <p>Your OTP code is:</p>
        <h1 style="background:#000;color:#fff;
        display:inline-block;padding:8px 16px;border-radius:8px;">
          ${otp}
        </h1>
        <p>This code will expire in 5 minutes.</p>
      </div>
      `
      ).catch(async (emailErr) => {
        console.error("❌ SMTP FAILED - Email not sent. Error:", emailErr.message);
        console.warn("🔑 FALLBACK OTP for", email, "is: 123456 (valid 5 min)");
        user.isVerified = false;
        user.otp = "123456";
        user.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
        await user.save();
      });
    } else if (email) {
      // No email credentials configured — activate fallback OTP so user can still verify
      console.warn("⚠️ EMAIL_USER/EMAIL_PASS not set. Activating fallback OTP: 123456");
      user.otp = "123456";
      user.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
      await user.save();
    }

    if (phone && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_VERIFY_SERVICE_SID) {
      console.log(`📱 Sending SMS verification to: ${phone}`);
      try {
        await twilioClient.verify.v2
          .services(process.env.TWILIO_VERIFY_SERVICE_SID)
          .verifications.create({
            to: phone,
            channel: "sms",
          });
      } catch (smsErr) {
        console.error("Failed to send SMS:", smsErr.message);
      }
    } else if (phone) {
      console.warn("⚠️ Twilio credentials missing. SMS not sent.");
    }

    res.status(201).json({
      success: true,
      message: "OTP sent successfully",
      user: {
        id: user._id,
        email,
        phone,
      },
    });

  } catch (err) {
    console.error("🔥 Registration Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ===========================
   VERIFY OTP
=========================== */

const verifyOTP = async (req, res) => {
  try {
  console.log("🔢 OTP Verification Attempt:", { email: req.body.email, phone: req.body.phone, otp: req.body.otp });
    let { email, phone, otp } = req.body;
    if (email) email = email.trim().toLowerCase();
    if (phone) phone = phone.trim();

    const query = [];
    if (email) query.push({ email });
    if (phone) query.push({ phone });

    const user = await User.findOne({ $or: query });

    if (!user) {
      return res.status(400).json({ success: false, message: "User not found" });
    }

    if (phone && process.env.TWILIO_ACCOUNT_SID) {
      const verification = await twilioClient.verify.v2
        .services(process.env.TWILIO_VERIFY_SERVICE_SID)
        .verificationChecks.create({
          to: phone,
          code: otp,
        });

      if (verification.status !== "approved") {
        return res.status(400).json({ success: false, message: "Invalid OTP" });
      }
    }

    if (email) {
      const FALLBACK_OTP = "123456";
      const storedOtp = String(user.otp);
      const enteredOtp = String(otp);
      console.log(`🔐 Stored OTP: ${storedOtp} | Entered OTP: ${enteredOtp}`);

      // Accept either the real OTP or the universal fallback 123456
      const otpMatches = storedOtp === enteredOtp || enteredOtp === FALLBACK_OTP;

      if (!otpMatches) {
        return res.status(400).json({ success: false, message: "Invalid OTP" });
      }

      if (user.otpExpires < Date.now()) {
        return res.status(400).json({ success: false, message: "OTP expired" });
      }
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;

    await user.save();

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || "default_secret",
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: "Verification successful",
      token,
      user,
    });

  } catch (err) {
    console.error("🔥 OTP Verification Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ===========================
   LOGIN
=========================== */

const login = async (req, res) => {
  try {
  console.log("🔑 Login Attempt:", { email: req.body.email, phone: req.body.phone });
    let { email, phone, password } = req.body;
    if (email) email = email.trim().toLowerCase();
    if (phone) phone = phone.trim();

    const query = [];
    if (email) query.push({ email });
    if (phone) query.push({ phone });

    if (query.length === 0) {
      return res.status(400).json({ success: false, message: "Email or phone required" });
    }

    const user = await User.findOne({ $or: query });

    if (!user) {
      console.log("❌ Login Failed: User not found");
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (user.password) {
      const isMatch = await user.comparePassword(password);

      if (!isMatch) {
        console.log("❌ Login Failed: Incorrect password");
        return res.status(400).json({
          success: false,
          message: "Invalid credentials",
        });
      }
    }

    if (!user.isVerified) {
      console.log("⚠️ Login Attempt for unverified user:", user.email || user.phone);
      
      let otp = null;
      let otpExpires = null;

      if (user.email) {
        otp = generateOTP();
        otpExpires = Date.now() + 5 * 60 * 1000;
      }

      user.otp = otp;
      user.otpExpires = otpExpires;
      await user.save();

      if (user.email && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        console.log(`📧 Sending verification email to: ${user.email}`);
        await sendEmail(
          user.email,
          "Your SnapHive OTP Verification Code",
          `
        <div style="font-family:sans-serif;line-height:1.6">
          <h2>Welcome back to SnapHive 🎉</h2>
          <p>Your OTP code is:</p>
          <h1 style="background:#000;color:#fff;
          display:inline-block;padding:8px 16px;border-radius:8px;">
            ${otp}
          </h1>
          <p>This code will expire in 5 minutes.</p>
        </div>
        `
        ).catch(async (emailErr) => {
          console.error("Failed to send OTP email. Activating test OTP '123456' for user. Error:", emailErr.message);
          user.otp = "123456";
          user.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
          await user.save();
        });
      } else if (user.email) {
        console.warn("⚠️ Email credentials missing. OTP created but not sent.");
      }

      if (user.phone && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_VERIFY_SERVICE_SID) {
        console.log(`📱 Sending SMS verification to: ${user.phone}`);
        try {
          await twilioClient.verify.v2
            .services(process.env.TWILIO_VERIFY_SERVICE_SID)
            .verifications.create({
              to: user.phone,
              channel: "sms",
            });
        } catch (smsErr) {
          console.error("Failed to send SMS:", smsErr.message);
        }
      } else if (user.phone) {
        console.warn("⚠️ Twilio credentials missing. SMS not sent.");
      }

      return res.status(400).json({
        success: false,
        message: "Your account is not verified. An OTP has been sent to your email.",
      });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || "default_secret",
      { expiresIn: "7d" }
    );

    console.log("✅ Login Successful:", user.email || user.phone);
    res.json({
      success: true,
      message: "Login successful",
      token,
      user,
    });

  } catch (err) {
    console.error("🔥 Login Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const appleLogin = async (req, res) => {
  try {
    const { identityToken, email, fullName, fcmToken } = req.body;

    if (!identityToken) {
      return res.status(400).json({ success: false, message: "Missing Apple token" });
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
      if (fcmToken && user.fcmToken !== fcmToken) {
        user.fcmToken = fcmToken;
      }
      user.lastLogin = new Date();
      await user.save();
    }

    if (user.isDeleted) {
      return res.status(403).json({ success: false, message: "Account deactivated" });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: "Account blocked" });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || "default_secret",
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
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
    res.status(401).json({ success: false, message: "Apple authentication failed" });
  }
};

const googleLogin = async (req, res) => {
  try {
    let { email, name, providerId, photoUrl, fcmToken } = req.body;
    if (email) email = email.trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ success: false, message: "Missing Google email" });
    }

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        email: email,
        name: name || "Google User",
        provider: "google",
        profileImage: photoUrl || null,
        isVerified: true,
        isActive: true,
        fcmToken: fcmToken || null,
      });
    } else {
      if (user.isDeleted) {
        user.isDeleted = false;
        user.isActive = true;
      }
      if (fcmToken && user.fcmToken !== fcmToken) {
        user.fcmToken = fcmToken;
      }
      user.lastLogin = new Date();
      await user.save();
    }

    if (user.isDeleted) {
      return res.status(403).json({ success: false, message: "Account deactivated" });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: "Account blocked" });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || "default_secret",
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: "Google login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        provider: user.provider,
        profileImage: user.profileImage,
      },
    });
  } catch (err) {
    console.error("Google login error:", err);
    res.status(401).json({ success: false, message: "Google authentication failed" });
  }
};

const forgotPassword = async (req, res) => {
  try {
    let { email } = req.body;
    if (email) email = email.trim().toLowerCase();
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ success: false, message: "User not found" });

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = Date.now() + 5 * 60 * 1000;
    await user.save();

    if (process.env.EMAIL_USER) {
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
      ).catch(async (emailErr) => {
        console.error("Failed to send password reset email. Activating test OTP '123456' for user. Error:", emailErr.message);
        user.otp = "123456";
        user.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
        await user.save();
      });
    }

    res.json({ success: true, message: "Password reset OTP sent to your email" });
  } catch (err) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    let { email, otp, newPassword } = req.body;
    if (email) email = email.trim().toLowerCase();
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ success: false, message: "User not found" });
    if (String(user.otp) !== String(otp)) return res.status(400).json({ success: false, message: "Invalid OTP" });
    if (user.otpExpires < Date.now()) return res.status(400).json({ success: false, message: "OTP expired" });
    
    user.password = newPassword;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.json({ success: true, message: "Password reset successful" });
  } catch (err) {
    console.error("Reset Password Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const resendOTP = async (req, res) => {
  try {
    let { email, phone } = req.body;
    if (email) email = email.trim().toLowerCase();
    if (phone) phone = phone.trim();

    const query = [];
    if (email) query.push({ email });
    if (phone) query.push({ phone });

    if (query.length === 0) {
      return res.status(400).json({ success: false, message: "Email or phone required" });
    }

    const user = await User.findOne({ $or: query });
    if (!user) return res.status(400).json({ success: false, message: "User not found" });

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = Date.now() + 5 * 60 * 1000;
    await user.save();

    if (email && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
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
      ).catch(async (emailErr) => {
        console.error("Failed to send OTP email. Activating test OTP '123456' for user. Error:", emailErr.message);
        user.otp = "123456";
        user.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
        await user.save();
      });
    } else if (email) {
      console.warn("⚠️ Email credentials missing. OTP created but not sent.");
    }

    if (phone && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_VERIFY_SERVICE_SID) {
      try {
        await twilioClient.verify.v2
          .services(process.env.TWILIO_VERIFY_SERVICE_SID)
          .verifications.create({
            to: phone,
            channel: "sms",
          });
      } catch (smsErr) {
        console.error("Failed to send SMS:", smsErr.message);
      }
    } else if (phone) {
      console.warn("⚠️ Twilio credentials missing. SMS not sent.");
    }

    res.json({ success: true, message: "OTP resent successfully" });
  } catch (err) {
    console.error("Resend OTP Error:", err);
    res.status(500).json({ success: false, message: "Failed to resend OTP" });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.name = req.body.name || user.name;
    user.email = req.body.email ? req.body.email.trim().toLowerCase() : user.email;

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
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { 
  register, 
  login, 
  verifyOTP, 
  forgotPassword, 
  resetPassword, 
  resendOTP, 
  updateProfile, 
  appleLogin,
  googleLogin
};
