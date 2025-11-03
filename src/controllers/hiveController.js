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

    const now = new Date();

    for (const hive of hives) {
      if (hive.isTemporary) {
        let expireCondition = false;

        if (hive.expiryDate && now > hive.expiryDate) {
          expireCondition = true;
        }
        if (hive.eventDate && hive.endTime) {
          const eventEndDateTime = new Date(
            `${hive.eventDate.toISOString().split("T")[0]}T${convertTo24Hour(hive.endTime)}:00`
          );

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


function convertTo24Hour(timeStr) {
  const [time, modifier] = timeStr.split(" ");
  let [hours, minutes] = time.split(":").map(Number);

  if (modifier.toLowerCase() === "pm" && hours < 12) hours += 12;
  if (modifier.toLowerCase() === "am" && hours === 12) hours = 0;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}


module.exports = { createHive, getUserHives };
