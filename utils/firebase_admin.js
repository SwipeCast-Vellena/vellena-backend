const admin = require("firebase-admin");
const path = require("path");

let serviceAccount;
let firebaseInitialized = false;

// Try to initialize Firebase
try {
  if (process.env.NODE_ENV === "production") {
    // On Render: read from environment variables
    if (process.env.FIREBASE_PROJECT_ID) {
      serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
      };
    }
  } else {
    // Local development: read from JSON file
    const serviceAccountPath = path.join(__dirname, "../serviceAccountKey.json");
    try {
      serviceAccount = require(serviceAccountPath);
    } catch (e) {
      console.warn("⚠️ serviceAccountKey.json not found. Chat functionality will be disabled.");
      console.warn("📝 See FIREBASE_SETUP.md for instructions to set up Firebase.");
    }
  }

  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    firebaseInitialized = true;
    console.log("✅ Firebase initialized successfully");
    console.log("📊 Project ID:", serviceAccount.project_id);
  }
} catch (error) {
  console.error("❌ Firebase initialization failed:", error.message);
  console.warn("⚠️ Chat functionality will be disabled until Firebase is configured.");
}

const firestore = firebaseInitialized ? admin.firestore() : null;

// Helper function to check if Firebase is initialized
function isInitialized() {
  return firebaseInitialized && firestore !== null;
}

module.exports = { admin: firebaseInitialized ? admin : null, firestore, isInitialized };
