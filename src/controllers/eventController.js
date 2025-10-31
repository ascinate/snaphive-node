const Event = require("../models/Event");
const bucket = require("../config/firebase");
const fs = require("fs");
const path = require("path");

const createEvent = async (req, res) => {
  try {
    const { eventName, eventType } = req.body;
    const userId = req.user.id;

    if (!eventName || !eventType)
      return res.status(400).json({ success: false, message: "All fields are required" });

    let imageUrls = [];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const localPath = file.path;
        const destination = `event_images/${userId}_${Date.now()}_${file.originalname}`;

        await bucket.upload(localPath, {
          destination,
          metadata: { contentType: file.mimetype },
        });

        fs.unlinkSync(localPath);
        const [url] = await bucket.file(destination).getSignedUrl({
          action: "read",
          expires: "03-09-2491",
        });

        imageUrls.push(url);
      }
    }

    const newEvent = await Event.create({
      user: userId,
      eventName,
      eventType,
      images: imageUrls,
    });

    res.status(201).json({ success: true, data: newEvent });
  } catch (err) {
    console.error("Create event error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const getEvents = async (req, res) => {
  try {
     const userId = req.user.id;
    const events = await Event.find({ user:userId })
      .populate("user", "name email profileImage")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, events });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { createEvent, getEvents };
