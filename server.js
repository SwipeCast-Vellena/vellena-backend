const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/authRoutes.js");
const modelRoutes = require("./routes/modelRoutes.js");
const agencyRoutes = require("./routes/agencyRoutes.js");
const uploadRoutes = require("./routes/uploadRoutes.js");
const campaignRoutes = require("./routes/campaignRoutes.js");
const firebaseAuthRoutes = require("./routes/firebaseAuth.js");
const messagesRoute = require("./routes/chatMessages.js");
const favoriteRoute = require("./routes/favoriteRoutes.js");
const videoRoutes = require("./controllers/videoController.js");
const modelPhotosRoutes = require("./routes/modelPhotosRoutes.js");
const stripeRoutes = require("./routes/stripeRoutes.js"); // ✅ Checkout routes
const stripeWebhook = require("./routes/stripeWebhook.js"); // ✅ Webhook route

const db = require("./db/db.js");

dotenv.config();

const app = express();
app.use(cors({
  origin: process.env.FRONTEND_URL
}));

// --- JSON middleware except for Stripe webhook ---
app.use((req, res, next) => {
  if (req.originalUrl === "/api/stripe/webhook") {
    next(); // handled inside stripeWebhook.js with raw body
  } else {
    express.json()(req, res, next);
  }
});

// --- Static file serving ---
app.use("/uploads/videos", express.static(path.join(__dirname, "uploads/videos")));
app.use("/uploads/model_photos", express.static(path.join(__dirname, "uploads/model_photos")));

// --- Routes ---
app.use("/api/auth", authRoutes);
app.use("/api/model", modelRoutes);
app.use("/api/agency", agencyRoutes);
app.use("/api", uploadRoutes);
app.use("/api", campaignRoutes);
app.use("/api/firebase", firebaseAuthRoutes);
app.use("/api/chat", messagesRoute);
app.use("/api/me", campaignRoutes);
app.use("/api", favoriteRoute);
app.use("/", videoRoutes);
app.use("/api/model/photos", modelPhotosRoutes);
app.use("/api/stripe", stripeRoutes); // ✅ Checkout sessions
app.use("/api/stripe", stripeWebhook); // ✅ Webhooks

// --- Ping / healthcheck ---
app.get("/api/ping", (req, res) => res.send("pong"));

// --- Debug: list all users (dev only) ---
app.get("/users", (req, res) => {
  db.query("SELECT * FROM users", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("✅ Server started on port " + PORT);
});
