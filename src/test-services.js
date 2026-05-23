const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.join(__dirname, "../.env") });

const axios = require("axios");
const { bucket } = require("./config/firebase");

async function testStorage() {
  console.log("\n--- Testing Firebase Storage Public Access ---");
  console.log(`FIREBASE_BUCKET: ${process.env.FIREBASE_BUCKET}`);

  try {
    const fileName = `test-public-${Date.now()}.txt`;
    console.log(`Creating test file reference: ${fileName}`);
    const file = bucket.file(fileName);

    console.log("Saving mock buffer to Firebase Storage...");
    await file.save(Buffer.from("Public access test"), {
      metadata: {
        contentType: "text/plain",
      },
      public: true,
    });

    console.log("✅ File saved successfully!");
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    const firebaseStyleUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;
    
    console.log(`Public URL: ${publicUrl}`);
    console.log(`Firebase-style URL: ${firebaseStyleUrl}`);

    // Try fetching the public URL
    try {
      console.log(`Fetching publicUrl: ${publicUrl}...`);
      const res = await axios.get(publicUrl);
      console.log(`✅ Success fetching publicUrl! Content: "${res.data}"`);
    } catch (e) {
      console.error(`❌ Failed fetching publicUrl: ${e.response ? e.response.status : e.message}`);
      if (e.response) {
        console.error("Response data:", e.response.data);
      }
    }

    // Try fetching the firebase-style URL
    try {
      console.log(`Fetching firebaseStyleUrl: ${firebaseStyleUrl}...`);
      const res = await axios.get(firebaseStyleUrl);
      console.log(`✅ Success fetching firebaseStyleUrl! Content: "${res.data}"`);
    } catch (e) {
      console.error(`❌ Failed fetching firebaseStyleUrl: ${e.response ? e.response.status : e.message}`);
      if (e.response) {
        console.error("Response data:", e.response.data);
      }
    }

    // Try deleting it to clean up
    console.log("Cleaning up and deleting the test file...");
    await file.delete();
    console.log("✅ File deleted successfully.");
  } catch (error) {
    console.error("❌ Firebase Storage test failed. Error detail:");
    console.error(error);
  }
}

testStorage();
