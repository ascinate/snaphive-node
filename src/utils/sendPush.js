const { admin } = require("../config/firebase");

exports.sendPush = async (token, title, body, data = {}) => {
  if (!token) return;

  try {
    await admin.messaging().send({
      token,
      notification: { title, body },
      data: {
        ...data,
        click_action: "FLUTTER_NOTIFICATION_CLICK",
      },
    });
  } catch (err) {
    console.error("Push error:", err.message);
  }
};
