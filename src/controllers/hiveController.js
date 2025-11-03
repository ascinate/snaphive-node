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

    if (!hiveName)
      return res
        .status(400)
        .json({ success: false, message: "Hive name is required" });

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

    let isExpired = false;
    const now = new Date();

    if (isTemporary) {

      if (expiryDate && now > new Date(expiryDate)) {
        isExpired = true;
      }

      if (eventDate && endTime) {
        const eventDateObj = new Date(eventDate);
        const [time, meridian] = endTime.split(" ");
        let [hours, minutes] = time.split(":").map(Number);
        if (meridian?.toLowerCase() === "pm" && hours < 12) hours += 12;
        if (meridian?.toLowerCase() === "am" && hours === 12) hours = 0;

        eventDateObj.setHours(hours, minutes, 0, 0);

        if (now > eventDateObj) {
          isExpired = true;
        }
      }
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
      isExpired,
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

    const now = new Date();

    for (const hive of hives) {
      if (hive.isTemporary) {
        let expireCondition = false;

        if (hive.expiryDate && now > hive.expiryDate) {
          expireCondition = true;
        }

        if (hive.eventDate && hive.endTime) {
          const eventEndDateTime = new Date(hive.eventDate);
          const [time, meridian] = hive.endTime.split(" ");
          let [hours, minutes] = time.split(":").map(Number);
          if (meridian?.toLowerCase() === "pm" && hours < 12) hours += 12;
          if (meridian?.toLowerCase() === "am" && hours === 12) hours = 0;

          eventEndDateTime.setHours(hours, minutes, 0, 0);

          if (now > eventEndDateTime) {
            expireCondition = true;
          }
        }

        if (expireCondition && !hive.isExpired) {
          hive.isExpired = true;
          await hive.save();
        }
      }
    }

    res.status(200).json({ success: true, hives });
  } catch (err) {
    console.error("Error fetching user hives:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { createHive, getUserHives };
