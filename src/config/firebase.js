
const admin = require("firebase-admin");

if (!process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
  throw new Error("❌ FIREBASE_SERVICE_ACCOUNT_BASE64 is missing in .env");
}

let serviceAccount;
try {
  const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf8");
  serviceAccount = JSON.parse(decoded);
} catch (err) {
  throw new Error("❌ Failed to decode FIREBASE_SERVICE_ACCOUNT_BASE64: " + err.message);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "snaphive-81e25.firebasestorage.app",
});

const bucket = admin.storage().bucket();
module.exports = bucket;
