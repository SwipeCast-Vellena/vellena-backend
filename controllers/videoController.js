const fs = require("fs");
const path = require("path");
const express = require("express");
const router = express.Router();
const db = require("../db/db.js");
const { protect } = require("../middlewares/authMiddleware.js");

// DELETE /api/model/video
router.delete("/api/model/video", protect, (req, res) => {
  const userId = req.user.id; // JWT always gives user id

  // Find the model row corresponding to this user
  db.query("SELECT id AS modelId, video_portfolio FROM model WHERE user_id = ?", [userId], (err, result) => {
    if (err) return res.status(500).json({ message: "Database error" });

    if (!result || result.length === 0) {
      return res.status(404).json({ message: "Model not found for this user" });
    }

    const modelId = result[0].modelId;
    const videoPath = result[0].video_portfolio;

    if (!videoPath) {
      return res.status(404).json({ message: "No video found" });
    }

    const filePath = path.join(__dirname, "../uploads", path.basename(videoPath));

    // Delete the file if it exists
    fs.unlink(filePath, (fsErr) => {
      if (fsErr && fsErr.code !== "ENOENT") console.error("File deletion error:", fsErr);

      // Update DB to remove video_portfolio
      db.query("UPDATE model SET video_portfolio = NULL WHERE id = ?", [modelId], (err2) => {
        if (err2) return res.status(500).json({ message: "Failed to update DB" });
        res.json({ message: "Video deleted successfully" });
      });
    });
  });
});

module.exports = router;



