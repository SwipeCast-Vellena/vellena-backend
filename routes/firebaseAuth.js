const express= require("express");
const {protect}=require("../middlewares/authMiddleware.js");
const {admin, isInitialized}=require("../utils/firebase_admin.js");

const router = express.Router();

// POST /api/firebase/token
// Protected by your JWT middleware (protect)
router.post("/token", protect, async (req, res) => {
    try {
      if (!isInitialized() || !admin) {
        return res.status(503).json({ 
          ok: false, 
          msg: "Firebase not configured. Please set up Firebase. See FIREBASE_SETUP.md"
        });
      }

      const backendUser = req.user;
      if (!backendUser || !backendUser.id) return res.status(401).json({ ok: false, msg: "Unauthorized" });
  
      // deterministic Firebase UID for your MySQL user
      const firebaseUid = `u${backendUser.id}`;
  
      // Ensure Firebase user exists (optional, safe)
      try {
        await admin.auth().getUser(firebaseUid);
      } catch (err) {
        if (err.code === "auth/user-not-found") {
          await admin.auth().createUser({
            uid: firebaseUid,
            email: backendUser.email || undefined,
            displayName: backendUser.name || undefined,
          }).catch((e) => console.warn("createUser warning", e.message));
        } else {
          console.warn("getUser error", err);
        }
      }
  
      // Create custom token with optional claims
      const customToken = await admin.auth().createCustomToken(firebaseUid, { role: backendUser.role });
  
      return res.json({ ok: true, token: customToken, uid: firebaseUid });
    } catch (e) {
      console.error("Error creating Firebase token", e);
      return res.status(500).json({ ok: false, error: e.message });
    }
  });
  
  module.exports = router;