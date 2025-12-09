const admin = require("firebase-admin");

// ✅ Check if environment variable exists
if (!process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
  throw new Error("❌ FIREBASE_SERVICE_ACCOUNT_BASE64 is missing in environment variables.");
}

let serviceAccount;

try {
  const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf8");
  serviceAccount = JSON.parse(decoded);
} catch (err) {
  console.error("❌ Failed to decode FIREBASE_SERVICE_ACCOUNT_BASE64:", err.message);
  throw err;
}

// ✅ Initialize Firebase only once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_BUCKET || "snaphive-81e25.appspot.com",
  });
}

const bucket = admin.storage().bucket();

module.exports = bucket;
