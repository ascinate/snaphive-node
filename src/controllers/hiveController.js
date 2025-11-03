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


// helpers
function parseEndTimeTo24(endTimeStr) {
  if (!endTimeStr) return null;
  // expected format: "06:30 PM" or "6:30 PM" or "06:30AM"
  const parts = endTimeStr.trim().match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
  if (!parts) return null;
  let hours = parseInt(parts[1], 10);
  const minutes = parseInt(parts[2], 10);
  const meridian = parts[3].toLowerCase();
  if (meridian === "pm" && hours !== 12) hours += 12;
  if (meridian === "am" && hours === 12) hours = 0;
  return { hours, minutes };
}

// getUserHives - robust local-time expiry calculation
const getUserHives = async (req, res) => {
  try {
    const userId = req.user.id;
    const hives = await Hive.find({ user: userId }).sort({ createdAt: -1 });

    const now = new Date();

    for (const hive of hives) {
      if (!hive.isTemporary || !hive.expiryDate) continue;

      // parse date parts from the expiryDate (use UTC date parts to get the intended calendar date)
      const d = new Date(hive.expiryDate);
      const year = d.getUTCFullYear();
      const month = d.getUTCMonth(); // 0-based
      const day = d.getUTCDate();

      // default expiry datetime is at 00:00 local of that date
      let expiryDateTime = new Date(year, month, day, 0, 0, 0);

      // if endTime exists, merge it (converted to 24-hour) into the expiry timestamp (local timezone)
      if (hive.endTime) {
        const tm = parseEndTimeTo24(hive.endTime);
        if (tm) {
          expiryDateTime = new Date(year, month, day, tm.hours, tm.minutes, 0);
        }
      }

      // Debug logs (remove in production)
      console.log("Hive id:", hive._id);
      console.log("Stored expiryDate (raw):", hive.expiryDate);
      console.log("Computed expiryDateTime (local):", expiryDateTime.toString());
      console.log("Now (local):", now.toString());

      // Mark expired only if both date+time are passed
      if (now > expiryDateTime && !hive.isExpired) {
        hive.isExpired = true;
        await hive.save();
      } else if (now <= expiryDateTime && hive.isExpired) {
        // optional: unmark if expiry moved to future
        hive.isExpired = false;
        await hive.save();
      }
    }

    res.status(200).json({ success: true, hives });
  } catch (err) {
    console.error("Error fetching user hives:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};


module.exports = { createHive, getUserHives };
