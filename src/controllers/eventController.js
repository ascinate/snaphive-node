const Event = require("../models/Event");

exports.createEvent = async (req, res) => {
  try {
    const userId = req.user.id; // From JWT middleware
    const { eventName, eventType, images } = req.body;

    if (!eventName || !eventType || !images || images.length === 0) {
      return res.status(400).json({ success: false, message: "All fields required" });
    }

    const newEvent = new Event({
      user: userId,
      eventName,
      eventType,
      images,
    });

    await newEvent.save();

    res.status(201).json({ success: true, event: newEvent });
  } catch (err) {
    console.error("Create Event Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getAllEvents = async (req, res) => {
  try {
    const events = await Event.find().populate("user", "name email profileImage");
    res.json({ success: true, events });
  } catch (err) {
    console.error("Fetch Events Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
