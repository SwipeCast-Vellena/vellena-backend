const express = require("express");
const { protect, isModel } = require("../middlewares/authMiddleware.js");
const { upload, uploadVideo } = require("../controllers/uploadController.js");

const router = express.Router();

// Route to upload video and get its public URL
router.post("/upload-video", protect, isModel, upload, uploadVideo);

module.exports = router;
