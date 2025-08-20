const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes.js");
const modelRoutes=require("./routes/modelRoutes.js")
const agencyRoutes=require("./routes/agencyRoutes.js")
const uploadRoutes = require("./routes/uploadRoutes.js");
const campaignRoutes=require("./routes/campaignRoutes.js")
const firebaseAuthRoutes=require("./routes/firebaseAuth.js");
const messagesRoute=require("./routes/chatMessages.js");

const db = require("./db/db.js");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const path = require("path");
app.use("/videos", express.static(path.join(__dirname, "uploads/videos")));



// Routes
app.use("/api/auth", authRoutes);
app.use("/api/model",modelRoutes);
app.use("/api/agency",agencyRoutes);
app.use('/api', uploadRoutes);
app.use('/api',campaignRoutes);
app.use('/api/firebase', firebaseAuthRoutes);
app.use("/api/chat",messagesRoute);

// ✅ Add ping endpoint here
app.get('/api/ping', (req, res) => res.send('pong'));

// Optional: get all users (used for development/debugging)
app.get('/users', (req, res) => {
  db.query('SELECT * FROM users', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server started on port " + PORT);
});
