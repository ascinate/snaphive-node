const Hive = require("../models/Hive");
const bucket = require("../config/firebase");
const fs = require("fs");

const createHive = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      hiveName,
      description,
      privacyMode,
      isTemporary,
      eventDate,
      startTime,
      endTime,
      expiryDate,
    } = req.body;

    if (!hiveName) return res.status(400).json({ success: false, message: "Hive name is required" });

    let coverImageUrl = null;
    const file = req.file;

    if (file) {
      const localPath = file.path;
      const destination = `hive_covers/${userId}_${Date.now()}_${file.originalname}`;

      await bucket.upload(localPath, {
        destination,
        metadata: { contentType: file.mimetype },
      });

      fs.unlinkSync(localPath);

      const [url] = await bucket.file(destination).getSignedUrl({
        action: "read",
        expires: "03-09-2491",
      });

      coverImageUrl = url;
    }

    const hive = await Hive.create({
      user: userId,
      hiveName,
      description,
      privacyMode,
      isTemporary,
      eventDate,
      startTime,
      endTime,
      expiryDate,
      coverImage: coverImageUrl,
    });

    res.status(201).json({ success: true, data: hive });
  } catch (err) {
    console.error("Create hive error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const getUserHives = async (req, res) => {
  try {
    const userId = req.user.id;
    const hives = await Hive.find({ user: userId }).sort({ createdAt: -1 });

    // auto mark expired
    const now = new Date();
    for (const hive of hives) {
      if (hive.isTemporary && hive.expiryDate && now > hive.expiryDate) {
        hive.isExpired = true;
        await hive.save();
      }
    }

    res.status(200).json({ success: true, hives });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { createHive, getUserHives };
