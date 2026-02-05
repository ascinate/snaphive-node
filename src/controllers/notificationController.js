const User = require("../models/User");

const saveFcmToken = async (req, res) => {
  const { fcmToken } = req.body;

  if (!fcmToken) {
    return res.status(400).json({ message: "FCM token required" });
  }

  await User.findByIdAndUpdate(req.user.id, { fcmToken });

  res.json({ success: true });
};



module.exports = {
  saveFcmToken,

};
