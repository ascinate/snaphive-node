const Event = require("../models/Event");

// ✅ Create Event
exports.createEvent = async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventName, eventType } = req.body;
    let imageUrls = [];

    // If using multer upload
    if (req.files && req.files.length > 0) {
      imageUrls = req.files.map((file) => {
        return process.env.VERCEL
          ? `https://${req.headers.host}/uploads/${file.filename}`
          : `http://localhost:4000/uploads/${file.filename}`;
      });
    } else if (req.body.images) {
      // In case frontend sends Firebase URLs directly
      imageUrls = Array.isArray(req.body.images)
        ? req.body.images
        : [req.body.images];
    }

    if (!eventName || !eventType || imageUrls.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    const newEvent = new Event({
      user: userId,
      eventName,
      eventType,
      images: imageUrls,
    });

    await newEvent.save();

    res.status(201).json({ success: true, event: newEvent });
  } catch (err) {
    console.error("Create Event Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Fetch All Events
exports.getAllEvents = async (req, res) => {
  try {
    const events = await Event.find()
      .populate("user", "name email profileImage")
      .sort({ createdAt: -1 });
    res.json({ success: true, events });
  } catch (err) {
    console.error("Get Events Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
