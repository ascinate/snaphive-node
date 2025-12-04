const Hive = require("../models/Hive");
const bucket = require("../config/firebase");
const { v4: uuidv4 } = require("uuid");


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

    if (!hiveName) {
      return res.status(400).json({
        success: false,
        message: "Hive name is required",
      });
    }

    // ---------------------------------------
    // 🔥 Handle File Upload (coverImage)
    // ---------------------------------------
    let coverImageURL = null;

    if (req.file) {
      const filename = `hives/${Date.now()}-${uuidv4()}.jpg`;
      const file = bucket.file(filename);

      const stream = file.createWriteStream({
        metadata: {
          contentType: req.file.mimetype,
        },
      });

      stream.on("error", (err) => {
        console.error("Firebase upload error:", err);
        return res.status(500).json({
          success: false,
          message: "Image upload failed",
        });
      });

      stream.on("finish", async () => {
        // Make file publicly accessible
        await file.makePublic();

        // Public download URL
        coverImageURL = `https://storage.googleapis.com/${bucket.name}/${filename}`;

        // After upload finished, save hive
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
          coverImage: coverImageURL,
        });

        return res.status(201).json({
          success: true,
          data: hive,
        });
      });

      // Upload buffer
      stream.end(req.file.buffer);
    } else {
      // If no file is uploaded
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
        coverImage: null,
      });

      return res.status(201).json({
        success: true,
        data: hive,
      });
    }
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
      if (hive.isTemporary && hive.expiryDate) {
        let expiryDateTime = new Date(hive.expiryDate);

        if (hive.endTime) {
          const [time, meridian] = hive.endTime.split(" ");
          let [hours, minutes] = time.split(":").map(Number);

          if (meridian.toLowerCase() === "pm" && hours !== 12) hours += 12;
          if (meridian.toLowerCase() === "am" && hours === 12) hours = 0;

          expiryDateTime.setHours(hours);
          expiryDateTime.setMinutes(minutes);
          expiryDateTime.setSeconds(0);
        }

        if (now > expiryDateTime && !hive.isExpired) {
          hive.isExpired = true;
          await hive.save();
        }
      }
    }

    res.status(200).json({ success: true, hives });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { createHive, getUserHives };
